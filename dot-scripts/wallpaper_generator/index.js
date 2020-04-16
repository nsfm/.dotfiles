#!/bin/no
"use strict";

const { promises: fs } = require("fs");
const { homedir } = require("os");
const { spawn, exec } = require("child_process");

const Trianglify = require("trianglify");
const sharp = require("sharp");

const colorFunctions = {
  // Muted solids that cycle through the color wheel.
  solid_colors: (x, y, speed = 1) =>
    "hsl(" + Math.floor(((Date.now() / 100) * speed) % 360) + ",80%,60%)"
};

class Smear {
  constructor() {
    this.wallpaperPath = "/tmp/bg".replace("~", homedir);

    this.wallpaperWidth = 2560;
    this.wallpaperHeight = 1440;

    this.triangleSettings = {
      width: this.wallpaperWidth,
      height: this.wallpaperHeight,
      cell_size: 75,
      color_space: "hsl",
      variance: 1,
      x_colors: "random",

      /**
       * Idea:
       * Make a canvas. Draw a sun on it and animate its path across the sky.
       * sample that for the color function
       *
       */
      color_function: colorFunctions.solid_colors
    };

    this.blur = 1; // Takes a long time but looks pretty.

    // If true, run in a loop and constantly generate new wallpapers.
    this.continuous = true;

    // Minimum number of milliseconds to wait between rendering cycles.
    // A higher value will make transitions less frequent but more distinct.
    this.renderingDelay = 10000;
    // Minimum number of milliseconds to wait between transition frames.
    // A higher value will make transitions very slow and hard to detect.
    this.transitionDelay = 10000;

    // Print some performance and debugging information.
    this.verbose = true;
    if (!this.verbose) {
      for (const key of ["time", "timeEnd", "log"]) {
        console[key] = () => {};
      }
    }
  }

  // http://www.ben-daglish.net/moon.shtml
  calculateLunarPhase(year, month, day) {
    n = Math.floor(12.37 * (year - 1900 + (1.0 * month - 0.5) / 12.0));
    RAD = 3.14159265 / 180.0;
    t = n / 1236.85;
    t2 = t * t;
    as = 359.2242 + 29.105356 * n;
    am = 306.0253 + 385.816918 * n + 0.01073 * t2;
    xtra = 0.75933 + 1.53058868 * n + (1.178e-4 - 1.55e-7 * t) * t2;
    xtra +=
      (0.1734 - 3.93e-4 * t) * Math.sin(RAD * as) - 0.4068 * Math.sin(RAD * am);
    i = xtra > 0.0 ? Math.floor(xtra) : Math.ceil(xtra - 1.0);

    j1 = julday(year, month, day);
    jd = 2415020 + 28 * n + i;
    return (j1 - jd + 30) % 30;
  }

  julday(year, month, day) {
    if (year < 0) {
      year++;
    }
    var jy = parseInt(year);
    var jm = parseInt(month) + 1;
    if (month <= 2) {
      jy--;
      jm += 12;
    }
    var jul =
      Math.floor(365.25 * jy) +
      Math.floor(30.6001 * jm) +
      parseInt(day) +
      1720995;
    if (day + 31 * (month + 12 * year) >= 15 + 31 * (10 + 12 * 1582)) {
      ja = Math.floor(0.01 * jy);
      jul = jul + 2 - ja + Math.floor(0.25 * ja);
    }
    return jul;
  }

  async run() {
    try {
      await new Promise((resolve, reject) => {
        exec("which ./nsetroot/nsetroot", (err, stdout) => {
          if (err) reject(err);
          else resolve(stdout);
        });
      });
    } catch (err) {
      throw new Error("Sorry - you need to build `nsetroot`");
    }

    const path = this.wallpaperPath + ".png";

    let generator = null;
    let setter = null;
    let done = false;
    do {
      const overtime = Date.now();
      await generator;
      if (done && Date.now() - overtime > 5) {
        console.error(`Took too long to render: ${Date.now() - overtime}ms`);
      }

      if (generator) {
        setter = this.nSetWallpaper(path, this.transitionDelay);
        done = true;
      }

      // Start generating the next one early.
      generator = this.generateWallpaper(path);

      console.time("set wallpaper");
      await setter;
      console.timeEnd("set wallpaper");

      // Respect delay.
      await new Promise(resolve =>
        setTimeout(resolve, done ? this.renderingDelay : 0)
      );
    } while (!done || this.continuous);

    await generator;
  }

  /**
   * Set the provided image as the desktop wallpaper using `nsetroot`.
   *
   * @param {string} wallpaper Path to an image.
   * @returns {Promise} Resolves after the wallpaper has been set.
   */
  async nSetWallpaper(wallpaper, transitionDelay = 0) {
    const setter = spawn("./nsetroot/nsetroot", [wallpaper, transitionDelay]);
    return new Promise(resolve => setter.on("exit", resolve));
  }

  async generateWallpaper(path) {
    // Strangely, grabbing the data URI from the SVG was the fastest way to pass
    // the data to sharp on my machine.
    const triangles = Trianglify(this.triangleSettings).svg();
    const buffer = new Buffer.from(triangles.outerHTML);
    try {
      await fs.unlink(path);
    } catch (err) {}

    const write = await sharp(buffer)
      .flatten()
      .ensureAlpha()
      .blur(this.blur)
      .png()
      .toFile(path);

    await write;
  }
}

(async () => {
  const smear = new Smear();
  await smear.run();
  process.exit();
})();
