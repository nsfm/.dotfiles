#!/bin/node
"use strict";

const { promises: fs } = require("fs");
const { PassThrough } = require("stream");
const { spawn } = require("child_process");

const { Sema } = require("async-sema");
const Trianglify = require("trianglify");
const sharp = require("sharp");
const expandTilde = require("expand-tilde");
const commandExists = require("command-exists");

class WallpaperGenerator {
  constructor() {
    this.wallpaperPath = expandTilde("~/.wallpapers/bg.png");
    this.wallpaperWidth = 2570; // Sized up to account for jank.
    this.wallpaperHeight = 1460;

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
    this.montageConcurrency = 8; // Number of feh processes building frames.
  }

  async run() {
    if (!(await commandExists("feh"))) {
      console.error("Sorry - you need to install `feh`");
      process.exit(1);
    }

    const timestamp = Date.now();
    console.time("generate wallpaper");
    const wallpaper = await this.generateWallpaper();
    console.timeEnd("generate wallpaper");

    const semaphore = new Sema(this.montageConcurrency, {
      capacity: this.transitionSteps
    });

    const frames = [];
    const montageProcesses = [];
    for (let frame = 0; frame < this.transitionSteps; frame++) {
      montageProcesses.push(
        new Promise(async done => {
          await semaphore.acquire();
          let paint;
          const paintSignal = new Promise(resolve => {
            paint = resolve;
          });

          await this.setTransitionFrame({
            frame,
            wallpaperPath: this.wallpaperPath,
            wallpaper,
            paintSignal
          });
          frames[frame] = paint;
          semaphore.release();
          done();
        })
      );
    }

    // Wait for all the montages to be generated.
    await Promise.all(montageProcesses);

    // Draw each background.
    for (let frame = 0; frame < this.transitionSteps; frame++) {
      await new Promise(frames[frame]);
    }

    await fs.writeFile(this.wallpaperPath, wallpaper);
    process.exit(0);
  }

  async setWallpaper(wallpaper) {
    const setter = spawn("feh", ["--bg-center", wallpaper]);
    return new Promise(resolve => setter.on("exit", resolve));
  }

  async setTransitionFrame({
    frame = 0,
    wallpaperPath,
    wallpaper,
    paintSignal
  } = {}) {
    return new Promise(async signalNextFrame => {
      const alpha = Math.round(255 - frame * (1 / this.transitionSteps) * 255);
      const tmpPath = `/tmp/.wallpapers/bg_${alpha}.png`;
      const montageArgs = `
      -m
      --ignore-aspect
      --bg=${wallpaperPath}
      --thumb-width=${this.wallpaperWidth}
      --thumb-height=${this.wallpaperHeight - 5}
      --limit-width=${this.wallpaperWidth}
      --limit-height=${this.wallpaperHeight}
      --alpha=${alpha}
      --output-only=${tmpPath}
      -
    `;

      const montage = spawn("feh", montageArgs.split(/(\s+)/));
      // Pipe the wallpaper buffer into the spawned process.
      new PassThrough().end(wallpaper).pipe(montage.stdin);

      await new Promise(resolve => montage.on("exit", resolve));
      console.log(`${(100 - (alpha / 255) * 100).toFixed(2)}%`);

      // Building the montage always takes longer than setting the wallpaper.
      // Signal the next frame to start building its montage.
      signalNextFrame();
      // Wait until all the other montages are done building.
      const done = await paintSignal;

      await this.setWallpaper(tmpPath);
      console.log(`${(100 - (alpha / 255) * 100).toFixed(2)}%`);

      // Signal the next frame.
      done();

      // Clean up.
      await fs.unlink(tmpPath);
    });
  }

  async generateWallpaper() {
    // Strangely, grabbing the data URI from the SVG was the fastest way to pass
    // the data to sharp on my machine.
    const triangles = Trianglify(this.triangleSettings).svg();
    const buffer = new Buffer.from(triangles.outerHTML);

    const wallpaper = sharp(buffer)
      .removeAlpha()
      .blur(this.blur)
      .png()
      .toBuffer();

    return wallpaper;
  }
}

(async () => {
  const wpg = new WallpaperGenerator();
  await wpg.run();
  process.exit();
})();
