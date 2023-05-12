// const axios = require('axios');
const fs = require('fs');
const crypto = require('crypto');

const batchProcessor = async ({ batch, params }) => {
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

const batchProcessor2 = async ({ batch, params }) => {
  let sum = 0;

  for (let id = 0; id <= (batch.length * 1000000); id++) {
    sum += id;
  }

  // const response = await axios.get('https://httpbin.org/get?key=123');

  let totalFiles = 0;
  const promises = [];
  for (let id = 0; id <= (batch.length); id++) {
    promises.push(createAndDeleteFile());
    totalFiles++;
  }

  await Promise.all(promises);

  return { sum, totalFiles };
}

const createAndDeleteFile = () => {
  return new Promise((resolve, reject) => {
    try {
      const uniqueId = crypto.randomBytes(16).toString('hex');
      const file = `/tmp/example-file-${uniqueId}.txt`;

      fs.writeFileSync(file, '***Random Code***');
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
      // console.log(file);
      resolve(true);
    } catch (err) {
      console.log(err.message);
      resolve(true);
    }
  })
}


const batchProcessorOnlyCPU = async ({ batch, params }) => {
  return new Promise((resolve, reject) => {
    let sum = 0;

    for (let id = 0; id <= (batch.length * 1000000); id++) {
      sum += id;
    }

    resolve({ sum });
  })
}

const batchProcessorOnlyIO = async ({ batch, params }) => {

  let totalFiles = 0;
  for (let id = 1; id <= (batch.length); id++) {
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

  return { totalFiles };
}


module.exports = { batchProcessor, batchProcessor2, batchProcessorOnlyCPU, batchProcessorOnlyIO }