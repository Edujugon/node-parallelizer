const ChildProcess = require("./child-process");
const WorkerThreads = require("./worker-thread");

const PARALLELIZER_CHILD = 'child-process';
const PARALLELIZER_THREADS = 'worker-threads';

const SINGLE_CHILD_THREAD_ID = 'single-process';
class Parallelizer {
  constructor(params) {

    this.childThreads = {};

    if (!isArray(params)) {
      params.id = SINGLE_CHILD_THREAD_ID;
      params = [params];
    }

    this._init(params);
  }


  _init(list) {
    list.forEach(({ id, type, tmpPath = '/tmp', parallelization = false, parallelizationPerCPU = 1, debug = false, filePath, processBatchFunctionName }) => {
      if (!filePath || !processBatchFunctionName) {
        throw new Error('filePath and processBatchFunctionName are required');
      }

      const parallelizer = [PARALLELIZER_CHILD, PARALLELIZER_THREADS].includes(type) ? type : PARALLELIZER_CHILD;

      const childThreadParams = { tmpPath, parallelization, parallelizationPerCPU, debug };

      this.childThreads[id] = (parallelizer === PARALLELIZER_CHILD) ?
        new ChildProcess(childThreadParams) :
        new WorkerThreads(childThreadParams);

      this.childThreads[id].parallelizerFunction({ filePath, processBatchFunctionName });
    });

  }


  async run(paramsList) {
    if (Object.keys(this.childThreads).length == 1) {
      return this.childThreads[SINGLE_CHILD_THREAD_ID].runBatch(paramsList);
    }

    if (!isArray(paramsList)) {
      paramsList.id = SINGLE_CHILD_THREAD_ID;
      paramsList = [paramsList];
    }

    return await Promise.all(paramsList.map(({ id, batch }) => {
      return this.childThreads[id].runBatch(batch)
    }));
  }

  removeChildThreads(ids = null) {
    ids = (ids !== null && !isArray(ids)) ? [ids] : ids;

    Object.keys(this.childThreads)
      .filter(id => ids === null ? true : ids.includes(id))
      .forEach((id) => {
        this.childThreads[id].removeChildThreads();
      });
  }
}

const isArray = (value) => {
  return Array.isArray(value);
}


module.exports = { ChildProcess, WorkerThreads, Parallelizer, PARALLELIZER_CHILD, PARALLELIZER_THREADS };