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
