#!/bin/node
"use strict";

const { promises: fs } = require("fs");
const { homedir } = require("os");
const { spawn, exec } = require("child_process");

const Trianglify = require("trianglify");
const sharp = require("sharp");

class Smear {
  constructor() {
    this.wallpaperPath = "~/.wallpapers/bg.png".replace("~", homedir);
    this.wallpaperTmpPath = "/tmp/.bg.png".replace("~", homedir);

    this.wallpaperWidth = 2560;
    this.wallpaperHeight = 1440;

    this.triangleSettings = {
      width: this.wallpaperWidth,
      height: this.wallpaperHeight,
      cell_size: 75,
      color_space: "hsl",
      seed: Date.now(),
      variance: 1,
      x_colors: "random"
    };

    this.blur = 50; // Takes a long time but looks pretty.
    this.transitionSteps = 255; // Frames to render.

    // Decreasing politness increases maximum frames per second
    // on wallpaper transitions, in case you want a faster fade.
    // Decreasing it also increases the chance of an annoying
    // flickering effect. You win some, you lose some.
    // 1 - safe and slow
    // 0 - definitely flickering
    this.politeness = 0.25;

    this.verbose = false;
    if (!this.verbose) {
      for (const key of ["time", "timeEnd", "log"]) {
        console[key] = () => {};
      }
    }
  }

  async run() {
    try {
      await new Promise((resolve, reject) => {
        exec("which hsetroot", (err, stdout) => {
          if (err) reject(err);
          else resolve(stdout);
        });
      });
    } catch (err) {
      throw new Error("Sorry - you need to install `hsetroot`");
    }

    const timestamp = Date.now();
    console.time("generate wallpaper");
    const newWallpaper = await this.generateWallpaper();
    const write = fs.writeFile(this.wallpaperTmpPath, newWallpaper);
    console.timeEnd("generate wallpaper");

    /**
     * I think that most of `hsetroot`'s execution time is spent
     * compositing. Rather than waiting for each job to complete,
     * we'll track the average time taken and undercut it to
     * effectively parallelize the compositing operations.
     *
     * This is a weird, bad optimization, but it gives a pretty
     * nice performance boost.
     */
    let before = Date.now();
    await this.hsetWallpaper(this.wallpaperPath);
    let avgTime = Date.now() - before;

    // We let the write of the temp file run while we were checking the
    // wallpaper transition speed - make sure it finished.
    await write;

    const setters = [];
    for (let frame = 0; frame < this.transitionSteps; frame++) {
      const percent = `${((frame / this.transitionSteps) * 100).toFixed(1)}%`;
      console.time(percent);
      await new Promise(async resolve => {
        const setter = this.hsetWallpaper(
          this.wallpaperPath,
          this.wallpaperTmpPath,
          frame
        );
        setters.push(setter);

        // Start the next job a little early.
        setTimeout(resolve, avgTime * this.politeness);

        // Wait to update average time.
        const start = Date.now();
        await setter;
        avgTime = Date.now() - start;
      });
      console.timeEnd(percent);
    }

    // Make sure we finished setting all the transitional wallpapers.
    await Promise.all(setters);

    // Persist the new wallpaper.
    await fs.writeFile(this.wallpaperPath, newWallpaper);
    await Promise.all([
      this.hsetWallpaper(this.wallpaperPath),
      fs.unlink(this.wallpaperTmpPath)
    ]);
  }

  /**
   * Set the provided image as the desktop wallpaper using `hsetroot`.
   *
   * Optionally accepts a second image to be applied as a translucent
   * overlay, according to the provided alpha value which must be an
   * integer from 1 to 255.
   *
   * It takes around 100 milliseconds to set the wallpaper.
   *
   * @param {string} wallpaper Path to an image.
   * @param {string} overlay Path to an image.
   * @param {integer} alpha Alpha value as an integer from 0 to 255.
   * @returns {Promise} Resolves after the wallpaper has been set.
   */
  async hsetWallpaper(wallpaper, overlay, alpha) {
    const hsetargs = ["-center", wallpaper];

    if (overlay) {
      hsetargs.push("-alpha", alpha, "-center", overlay);
    }

    const setter = spawn("hsetroot", hsetargs);
    return new Promise(resolve => setter.on("exit", resolve));
  }

  /**
   * Generate a wallpaper.
   *
   * @returns {Promise<Buffer>} A Buffer containig a png image.
   */
  async generateWallpaper() {
    // Strangely, grabbing the data URI from the SVG was the fastest way to pass
    // the data to sharp on my machine.
    const triangles = Trianglify(this.triangleSettings).svg();
    const buffer = new Buffer.from(triangles.outerHTML);

    const wallpaper = sharp(buffer)
      .ensureAlpha()
      .blur(this.blur)
      .png()
      .toBuffer();

    return wallpaper;
  }
}

(async () => {
  const smear = new Smear();
  await smear.run();
  process.exit();
})();
