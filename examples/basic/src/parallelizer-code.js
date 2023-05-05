// const axios = require('axios');
const fs = require('fs');
const crypto = require('crypto');

const batchProcessor = async ({ batch }) => {
  let sum = 0;

  for (let id = 0; id <= (batch.length * 1000000); id++) {
    sum += id;
  }

  // const response = await axios.get('https://httpbin.org/get?key=123');

  let totalFiles = 0;
  for (let id = 0; id <= (batch.length); id++) {
    try {
      const uniqueId = crypto.randomBytes(16).toString('hex');
      const file = `/tmp/example-file-${uniqueId}.txt`;

      fs.writeFileSync(file, '***Random Code***');
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
      totalFiles++;
    } catch (err) {
      console.log(err.message);
    }
  }

  return { sum, totalFiles };
}


module.exports = { batchProcessor }