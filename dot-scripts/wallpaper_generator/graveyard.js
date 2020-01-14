/**
 * I'm not usually one to keep unused code around, but if you're playing with
 * this tool to create your own wallpaper then some of the snippets below may
 * prove useful.
 */

/**
 * I had a hard time getting sharp to correctly composite the two bgs. I was
 * inspecting the bad output with `feh` when I noticed that it had a montage
 * mode for drawing thumbnails over a background image with optional opacity.
 * That's when I decided it would at least be a funnier implementation to use
 * `feh` for the transition rendering.
 *
 * This would be a lot more pleasant if I could get `feh` to output the montage
 * to stdout, but it requires a filetype in the output filename. That would at
 * least let us avoid writing to /tmp since we could pipe the montage directly
 * to the background setting process.
 *
 * This rendering method takes 300 to 400 milliseconds
 *
 * @param {object} args
 * @param {integer} args.frame The frame to render, used to calculate opacity.
 * @param {string} args.wallpaperPath Path to the old wallpaper.
 * @param {Buffer} args.wallpaper A buffer representing the new wallpaper.
 * @returns {Promise<string>} Resolves to the path of the rendered frame.
 */
async function renderFrameFeh({ frame = 0, wallpaperPath, wallpaper } = {}) {
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

  console.log(`${(100 - (alpha / 255) * 100).toFixed(2)}%`);
  const montage = spawn("feh", montageArgs.split(/(\s+)/));

  // Pipe the wallpaper buffer into the spawned process.
  new PassThrough().end(wallpaper).pipe(montage.stdin);

  // Return the path to the frame when the montage stitcher exits.
  return new Promise(resolve =>
    montage.on("exit", resolve.bind(null, tmpPath))
  );
}

/**
 * Set up a canvas and composite the new wallpaper as a translucent
 * overlay.
 *
 * This rendering method takes 500 to 600 milliseconds.
 */
async function renderFrameCanvas({
  frame = 0,
  oldWallpaper,
  newWallpaper,
  stream = false
} = {}) {
  const alpha = Math.round(frame * (1 / this.transitionSteps));
  const canvas = new Canvas();
  canvas.width = this.wallpaperWidth;
  canvas.height = this.wallpaperHeight;

  const ctx = canvas.getContext("2d");
  ctx.drawImage(oldWallpaper, 0, 0);
  ctx.globalAlpha = alpha;
  ctx.drawImage(newWallpaper, 0, 0);

  return stream ? canvas.createPNGStream() : canvas.toBuffer("png");
}

/**
 * Keep the canvas around and continually add the same frame with opacity
 * of max_opactiy/transition_frames.
 *
 * This rendering method takes 500 to 600 milliseconds, but after many
 * frames are drawn the rendering time slowly approachs 350 milliseconds.
 * I don't know why.
 */
async function renderFrameLayers({
  frame,
  canvas,
  ctx,
  newWallpaper,
  stream = false
} = {}) {
  return new Promise(async resolve => {
    console.log("a");
    ctx.globalAlpha = 1 / this.transitionSteps;
    ctx.drawImage(newWallpaper, 0, 0);

    return resolve(stream ? canvas.createPNGStream() : canvas.toBuffer("png"));
  });
}

/**
 * Set the provided image as the desktop wallpaper using `feh`.
 *
 * Takes 100 to 130 milliseconds depending on how you pass the image.
 *
 * @param {Buffer|Stream|string} wallpaper Image data, or a path to an image.
 * @returns {Promise} Resolves after the wallpaper has been set.
 */
async function setWallpaper(wallpaper) {
  const path = typeof wallpaper === "string" ? wallpaper : "-";
  const setter = spawn("feh", ["--no-fehbg", "--bg-center", path]);
  //const setter = spawn("xsetroot", ["-bitmap", path]);

  if (typeof wallpaper !== "string") {
    if (Buffer.isBuffer(wallpaper)) {
      new PassThrough().end(wallpaper).pipe(setter.stdin);
    } else {
      wallpaper.pipe(setter.stdin);
    }
  }

  return new Promise(resolve => setter.on("exit", resolve));
}

/**
 * I didn't end up using this, but I originally wanted to generate the transition
 * frames using sharp. This would have been preferable to the absolute nightmare
 * that unfolded instead.
 */
async function generateTransitions({ oldWallpaper, newWallpaper }) {
  const transitions = [];
  for (let i = 1; i < this.transitionSteps; i++) {
    transitions.push(
      new Promise(async resolve => {
        const alphaChannel = Buffer.alloc(
          this.wallpaperWidth * this.wallpaperHeight,
          Math.round(i * (1 / this.transitionSteps) * 255)
        );
        const transitionFrame = await sharp(newWallpaper)
          .joinChannel(alphaChannel, {
            raw: {
              width: this.wallpaperWidth,
              height: this.wallpaperHeight,
              channels: 1
            }
          })
          .png()
          .toBuffer();

        const what = sharp(oldWallpaper)
          .composite([
            {
              input: transitionFrame,
              blend: "over"
            }
          ])
          .png()
          .toBuffer();

        resolve(what);
      })
    );
  }

  return transitions;
}
