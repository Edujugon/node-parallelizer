"use strict";

const { fork } = require('child_process');
const os = require("os");
const fs = require('fs');

const childFileName = "child-process-child-file.js";

class ChildProcess {
  constructor({ tmpPath = '/tmp', maxProcesses = false, processesPerCPU = 1, generateStats = false, generateChildStats = false } = {}) {
    this.tmpPath = `${tmpPath}/${childFileName}`;
    this.childFile = null;
    this.childProcesses = [];
    this.maxProcesses = maxProcesses;
    this.processesPerCPU = processesPerCPU;

    this.processesCount = 1;
    this.generateStats = generateStats; // TODO
    this.generateChildStats = generateChildStats; // TODO
  }

  createChildProcessFromCode = ({ callback, customCode = '' }) => {
    const finalChildCode = `${customCode} ${templateChildCode} const processBatch = ${callback.toString()}`
    this.childFile = this._createChildFile(finalChildCode);

    this._createChildProcesses();
  }

  createChildProcessFromFile = ({ filePath, processBatchFunctionName }) => {
    const finalChildCode = `const {${processBatchFunctionName}: processBatch} = require('${filePath}'); ${templateChildCode}`
    this.childFile = this._createChildFile(finalChildCode);

    this._createChildProcesses();
  }

  _createChildProcesses = () => {
    this.processesCount = (typeof this.maxProcesses === 'number') ? this.maxProcesses : this._getProcessesCount();
    for (let id = 0; id < this.processesCount; id++) {
      this.childProcesses.push(this._createFork());
    }
  }

  runBatch = async (batch) => {
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

  removeChildProcesses = () => {
    this.childProcesses.forEach(process => process.disconnect());
    this.childProcesses = [];
  }

  _removeForkEvents = () => this.childProcesses.forEach(child => { child.removeAllListeners('exit'); child.removeAllListeners('message') });

  _processBatchesInForks = async (batches) => {
    const batchesCount = batches.length;
    const childResponses = [];

    let responsesReceived = 0;

    await new Promise((resolve, reject) => {
      for (let id = 0; id < batchesCount; id++) {
        // If a child has exited, then we recreate it.
        if (!this.childProcesses[id]?.connected) {
          console.log(`Child #${id} no connected`);

          this.childProcesses[id] = this._createFork();
        }

        this.childProcesses[id].on('exit', (code) => {
          console.log(`Child process #${id} exited with code: ${code}`);

          // In case a child process exists without sending a message.
          if (++responsesReceived == batchesCount) {
            this._removeForkEvents();
            resolve('DONE');
          }
        });

        this.childProcesses[id].on('message', ({ type, logType = 'log', logMessage, reponse, status, errorMessage }) => {
          if (type == 'LOG') {
            console[logType](`Child #${id} log: `, logMessage)
            return;
          }
          console.log(`Child process #${id} status message: ${status}`);

          if (status == 'FAILED') {
            console.log(`Child process #${id} error message: ${errorMessage}`);
          }
          childResponses.push(reponse);
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

  _getProcessesCount = () => {
    const cpuData = os.cpus();
    return cpuData.length * this.processesPerCPU;
  }

  _createFork = () => {
    const newFork = fork(this.tmpPath);

    newFork.on('error', (error) => {
      console.log(`Error on child process: ${error}`);
    })

    return newFork;
  }

  _createChildFile(childCode) {
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

const templateChildCode = `
const mainLogger = (message, logType = 'log') => {
  process.send({ type: "LOG", logType, logMessage: message });
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
module.exports = ChildProcess;