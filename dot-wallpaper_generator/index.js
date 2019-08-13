// Usage: node generate_wallpaper > bg.png
const Trianglify = require("trianglify");
const sharp = require("sharp");

// Generate a pattern and then grab the PNG data uri.
const triangles = Trianglify({
  width: 2560,
  height: 1440,
  cell_size: 75,
  color_space: "hsl",
  seed: Date.now(), // TODO: One per day?
  variance: 1,
  x_colors: "random"
  //color_function: (x, y) => {
  //  return "hsl(" + Math.floor(Math.abs(x * y) * 360) + ",80%,30%)";
  //}
}).svg();

const buffer = new Buffer.from(triangles.outerHTML);

// Set up an image processing pipeline.
const convertStream = sharp(buffer)
  .blur(50) // Takes a long time but looks pretty.
  .png();

// Write the buffer to stdout.
convertStream.pipe(process.stdout);
