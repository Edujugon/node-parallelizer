// src/parallelizer-code.js
var fs = require("fs");
var crypto = require("crypto");
var batchProcessor = async ({ batch }) => {
  let sum = 0;
  for (let id = 0; id <= batch.length * 1e6; id++) {
    sum += id;
  }
  let totalFiles = 0;
  for (let id = 0; id <= batch.length; id++) {
    try {
      const uniqueId = crypto.randomBytes(16).toString("hex");
      const file = `/tmp/example-file-${uniqueId}.txt`;
      fs.writeFileSync(file, "***Random Code***");
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
      totalFiles++;
    } catch (err) {
      console.log(err.message);
    }
  }
  return { sum, totalFiles };
};
module.exports = { batchProcessor };
