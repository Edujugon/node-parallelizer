const Benchmark = require('benchmark');
const { Parallelizer, PARALLELIZER_CHILD, PARALLELIZER_THREADS } = require('../src/index');
const { batchProcessor } = require('../examples/basic/src/parallelizer-code');
const path = require('path');


const relativePath = '../examples/basic/src/parallelizer-code'; 
const absolutePath = path.resolve(__dirname, relativePath);

const childParallelizer = new Parallelizer({ type: PARALLELIZER_CHILD, parallelizationPerCPU: 2 });
const threadParallelizer = new Parallelizer({ type: PARALLELIZER_THREADS, parallelizationPerCPU: 2 });

childParallelizer.parallelizerFunction({ filePath: absolutePath, processBatchFunctionName: 'batchProcessor' });
threadParallelizer.parallelizerFunction({ filePath: absolutePath, processBatchFunctionName: 'batchProcessor' });

const batch = [...Array(1000).keys()];

const suite = new Benchmark.Suite;
// add tests
suite
  .add('Child Parallelizer', p(async () => {
    await childParallelizer.runBatch(batch);
  }))
  .add('Thread Parallelizer', p(async () => {
    await threadParallelizer.runBatch(batch);
  }))
  .add('Without Parallelizer', p(async () => {
    await batchProcessor({ batch });
  }))
  // add listeners
  .on('cycle', function (event) {
    childParallelizer.removeChildProcesses();
    console.log(String(event.target));
  })
  .on('complete', function () {
    console.log('\nResult: ');
    console.log('Fastest is ' + this.filter('fastest').map('name'));
    console.log('Slowest is ' + this.filter('slowest').map('name'));
  })
  // run async
  .run({ 'async': true });


  function p(fn) {
  return {
    defer: true,
    async fn(deferred) {
      await fn();
      deferred.resolve();
    }
  }
}
const wait = ms => new Promise(resolve => setTimeout(resolve, ms))