"use strict";

const { Worker } = require("worker_threads");
const os = require("os");
const fs = require('fs');
const crypto = require('crypto');

const workerFileName = "worker-thread-file.js";

class WorkerThreads {
  constructor({ tmpPath = '/tmp', parallelization = false, parallelizationPerCPU = 1, debug = false } = {}) {
    const uniqueId = crypto.randomBytes(16).toString('hex');

    this.tmpPath = `${tmpPath}/${workerFileName}-${uniqueId}.js`;
    this.workerFile = null;
    this.parallelization = parallelization;
    this.parallelizationPerCPU = parallelizationPerCPU;
    this.threadsCount = 1;
    this.debug = debug;
  }

  parallelizerFunction = ({ filePath, processBatchFunctionName }) => {
    const threadCode = `const {${processBatchFunctionName}: processBatch} = require('${filePath}'); ${templateThreadCode}`
    this.workerFile = this._createWorkerFile(threadCode);

    this.threadsCount = (typeof this.parallelization === 'number') ? this.parallelization : this._getThreadsCount();
  }

  runBatch = async (batch, params = null) => {
    // Get the amount of messages per batch.
    const batchCount = (batch.length < this.threadsCount) ? 1 : batch.length / this.threadsCount;

    // Create the batches
    const batches = findSubsets(batch, batchCount);

    // Process the batches using the threads.
    return await this._processBatchesInThreads(batches, params);
  }

  removeWorkerThreads() {
    this._removeThreadFile();
  }
  removeChildThreads() {
    this._removeThreadFile();
  }

  _processBatchesInThreads = async (batches, params = null) => {
    const batchesCount = batches.length;
    const threadResponses = {
      responses: [],
      failures: []
    };

    let responsesReceived = 0;

    await new Promise((resolve, reject) => {
      for (let id = 0; id < batchesCount; id++) {
        const worker = new Worker(this.tmpPath, { workerData: { id, batch: batches[id], params } });
        worker.on('error', (error) => {
          logger({
            message: `Thread #${id} error message: ${error.message}`,
            params: {
              thread_id: id,
              error_message: error.message
            },
            debug: this.debug
          })
          threadResponses.failures.push(error.message);

          // In case a thread exists without sending a message.
          if (++responsesReceived == batchesCount) {
            resolve('DONE');
          }
        });

        worker.on('message', ({ reponse, status, errorMessage }) => {
          logger({
            message: `Thread #${id} status message: ${status}`,
            params: {
              thread_id: id,
              status
            },
            debug: this.debug
          })

          if (status == 'FAILED') {
            logger({
              message: `Thread #${id} error message: ${errorMessage}`,
              params: {
                thread_id: id,
                error_message: errorMessage
              },
              debug: this.debug
            })
            threadResponses.failures.push(errorMessage);
          } else if (status == 'SUCCESS') {
            threadResponses.responses.push(reponse);
          }

          if (++responsesReceived == batchesCount) {
            resolve('DONE');
          }
        });
      }
    })

    return threadResponses;
  }

  _removeThreadFile() {
    if (!fs.existsSync(this.tmpPath))
      return;

    try {
      fs.unlinkSync(this.tmpPath);
    } catch (error) {
      console.error(`Failed to remove temporary child process file: ${error.message}`);
    }
  }

  _getThreadsCount = () => {
    const cpuData = os.cpus();
    return cpuData.length * this.parallelizationPerCPU;
  }

  _createWorkerFile(childCode) {
    fs.writeFileSync(this.tmpPath, childCode);
  }
}

const findSubsets = (array, n) => {
  return array.reduce((all, one, i) => {
    const ch = Math.floor(i / n);
    all[ch] = [].concat((all[ch] || []), one);
    return all
  }, [])
}

const templateThreadCode = `
const { workerData, parentPort } = require("worker_threads");

(async () => {
  try {
    const reponse = await processBatch({ batch: workerData.batch, params: workerData.params });
    parentPort.postMessage({ reponse, status: "SUCCESS" });
  } catch (err) {
    parentPort.postMessage({ status: "FAILED", errorMessage: err.toString() });
  }
})();
`;

const logger = ({ message, params = {}, debug = false, logType = 'log' }) => {
  if (!debug) {
    return
  }

  const logMsg = Object.assign({}, params);
  logMsg.message = message;

  console[logType](JSON.stringify(logMsg));
}

module.exports = WorkerThreads;