const ChildProcess = require("./child-process");
const WorkerThreads = require("./worker-thread");

const PARALLELIZER_CHILD = 'child-process';
const PARALLELIZER_THREADS = 'worker-threads';
class Parallelizer {
  constructor(params) {
    const parallelizer = params.type;

    if(parallelizer === PARALLELIZER_CHILD) {
      return new ChildProcess(params);
    }else if(parallelizer === PARALLELIZER_THREADS) {
      return new WorkerThreads(params);
    }
  }
}
module.exports = { ChildProcess, WorkerThreads, Parallelizer };