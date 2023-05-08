"use strict";

const { fork } = require('child_process');
const os = require("os");
const fs = require('fs');
const crypto = require('crypto');

const childFileName = "child-process-file";

class ChildProcess {
  constructor({ tmpPath = '/tmp', parallelization = false, parallelizationPerCPU = 1, debug = false } = {}) {
    const uniqueId = crypto.randomBytes(16).toString('hex');

    this.tmpPath = `${tmpPath}/${childFileName}-${uniqueId}.js`;
    this.childFile = null;
    this.childProcesses = [];
    this.parallelization = parallelization;
    this.parallelizationPerCPU = parallelizationPerCPU;

    this.processesCount = 1;
    this.debug = debug;
  }

  createChildProcessFromCode({ callback, customCode = '' }) {
    const finalChildCode = `${customCode} ${templateChildCode} const processBatch = ${callback.toString()}`
    this.childFile = this._createChildFile(finalChildCode);

    this._createChildProcesses();
  }

  parallelizerFunction({ filePath, processBatchFunctionName }) {
    const finalChildCode = `const {${processBatchFunctionName}: processBatch} = require('${filePath}'); ${templateChildCode}`
    this.childFile = this._createChildFile(finalChildCode);

    this._createChildProcesses();
  }

  _createChildProcesses() {
    this.processesCount = (typeof this.parallelization === 'number') ? this.parallelization : this._getProcessesCount();

    for (let id = 0; id < this.processesCount; id++) {
      this.childProcesses.push(this._createFork());
    }
  }

  async runBatch(batch) {
    if (this.childProcesses.length === 0) {
      throw new Error('No child processes created. Please run "createChildProcesses" method before "runBatch"')
    }

    // Get the amount of messages per batch.
    const batchCount = (batch.length < this.processesCount) ? 1 : batch.length / this.processesCount;

    // Create the batches
    const batches = findSubsets(batch, batchCount);

    // Process the batches using the child processes.
    return await this._processBatchesInForks(batches);
  }

  removeChildProcesses() {
    this.childProcesses.forEach(process => process.disconnect());
    this.childProcesses = [];
    this._removeChildFile();
  }
  
  removeChildThreads() {
    this.removeChildProcesses();
  }

  _removeForkEvents() {
    this.childProcesses.forEach(child => { child.removeAllListeners('exit'); child.removeAllListeners('message') });
  }

  async _processBatchesInForks(batches) {
    const batchesCount = batches.length;
    const childResponses = {
      responses: [],
      failures: []
    };

    let responsesReceived = 0;

    await new Promise((resolve, reject) => {
      for (let id = 0; id < batchesCount; id++) {
        // If a child has exited, then we recreate it.
        if (!this.childProcesses[id]?.connected) {
          logger({
            message: `Child process #${id} no connected`,
            params: {
              child_id: id,
            },
            debug: this.debug
          })

          this.childProcesses[id] = this._createFork();
        }

        this.childProcesses[id].on('exit', (code) => {
          logger({
            message: `Child process #${id} exited with code: ${code}`,
            params: {
              child_id: id,
              exit_code: code
            },
            debug: this.debug
          })

          // In case a child process exists without sending a message.
          if (++responsesReceived == batchesCount) {
            this._removeForkEvents();
            resolve('DONE');
          }
        });

        this.childProcesses[id].on('message', ({ type, logType = 'log', childLogMessage, childLogMessageParams = {}, reponse, status, errorMessage }) => {
          if (type == 'LOG') {
            logger({
              message: childLogMessage,
              params: {
                child_id: id,
                ...childLogMessageParams
              },
              debug: true,
              logType
            })
            return;
          }

          logger({
            message: `Child process #${id} status message: ${status}`,
            params: {
              child_id: id,
              status
            },
            debug: this.debug
          })

          if (status == 'FAILED') {
            logger({
              message: `Child process #${id} error message: ${errorMessage}`,
              params: {
                child_id: id,
                error_message: errorMessage
              },
              debug: this.debug
            })
            childResponses.failures.push(errorMessage);
          } else if (status == 'SUCCESS') {
            childResponses.responses.push(reponse);
          }

          if (++responsesReceived == batchesCount) {
            this._removeForkEvents();
            resolve('DONE');
          }
        });

        // Send message to child.
        this.childProcesses[id].send({ id, batch: batches[id] });
      }
    })

    return childResponses;
  }

  _getProcessesCount() {
    const cpuData = os.cpus();
    return cpuData.length * this.parallelizationPerCPU;
  }

  _createFork() {
    const newFork = fork(this.tmpPath);

    newFork.on('error', (error) => {
      logger({
        message: `Error on child process: ${error}`,
        params: {
          error
        },
        debug: this.debug
      })
    })

    return newFork;
  }

  _createChildFile(childCode) {
    try {
      fs.writeFileSync(this.tmpPath, childCode);
    } catch (error) {
      throw new Error(`Failed to create child process file: ${error.message}`);
    }
  }

  _removeChildFile() {
    if (!fs.existsSync(this.tmpPath))
      return;

    try {
      fs.unlinkSync(this.tmpPath);
    } catch (error) {
      console.error(`Failed to remove temporary child process file: ${error.message}`);
    }
  }
}

const findSubsets = (array, n) => {
  return array.reduce((all, one, i) => {
    const ch = Math.floor(i / n);
    all[ch] = [].concat((all[ch] || []), one);
    return all
  }, [])
}

const templateChildCode = `
const mainLogger = ({ message, params = {}, logType = 'log' }) => {
  process.send({ type: "LOG", logType, childLogMessage: message, childLogMessageParams: params });
}

// Listening to parent's messages.
process.on("message", async (message) => {
  try {
    const reponse = await processBatch({ batch: message.batch, mainLogger });

    process.send({ type: "MESSAGE", status: "SUCCESS", reponse });
  } catch (e) {
    process.send({ type: "MESSAGE", status: "FAILED", errorMessage: e.toString() });
  }
});
`;

const logger = ({ message, params = {}, debug = false, logType = 'log' }) => {
  if (!debug) {
    return
  }

  const logMsg = Object.assign({}, params);
  logMsg.message = message;

  console[logType](JSON.stringify(logMsg));
}

module.exports = ChildProcess;