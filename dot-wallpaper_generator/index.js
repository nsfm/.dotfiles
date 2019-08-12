// Usage: node generate_wallpaper > bg.png
const Trianglify = require("trianglify");
const sharp = require("sharp");

// Generate a pattern and then grab the PNG data uri.
const pngURI = Trianglify({
  width: 2560,
  height: 1440,
  cell_size: Math.random() * 200 + 40,
  color_space: "hsl",
  seed: Date.now(), // TODO: One per day?
  variance: Math.random(),
  x_colors: "random"
  //color_function: (x, y) => {
  //  return "hsl(" + Math.floor(Math.abs(x * y) * 360) + ",80%,30%)";
  //}
}).png();

// Strip off the uri part of the data uri, leaving the data.
const data = pngURI.substr(pngURI.indexOf("base64") + 7);

// Decode the base64 encoded blob into a buffer.
const buffer = new Buffer.from(data, "base64");

// Set up an image processing pipeline.
const convertStream = sharp(buffer)
  .blur(50)
  .png();

// Write the buffer to stdout.
convertStream.pipe(process.stdout);

// TODO: Faster to get triangles as a canvas and feed RGB to sharp?
