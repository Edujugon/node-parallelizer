const Benchmark = require('benchmark');
const { Parallelizer, PARALLELIZER_CHILD, PARALLELIZER_THREADS } = require('../src/index');
const { batchProcessor } = require('../examples/basic/src/parallelizer-code');
const path = require('path');


const relativePath = '../examples/basic/src/parallelizer-code';
const absolutePath = path.resolve(__dirname, relativePath);

const childParallelizer = new Parallelizer({ type: PARALLELIZER_CHILD, parallelizationPerCPU: 1, filePath: absolutePath, processBatchFunctionName: 'batchProcessor' });
const threadParallelizer = new Parallelizer({ type: PARALLELIZER_THREADS, parallelizationPerCPU: 1, filePath: absolutePath, processBatchFunctionName: 'batchProcessor' });

const batch = [...Array(100).keys()];


const p = (fn) => {
  return {
    defer: true,
    async fn(deferred) {
      await fn();
      deferred.resolve();
    }
  }
}

const suite = new Benchmark.Suite;
// add tests
suite
  .add('Child Parallelizer', p(async () => {
    await childParallelizer.run(batch);
  }))
  .add('Thread Parallelizer', p(async () => {
    await threadParallelizer.run(batch);
  }))
  .add('Without Parallelizer', p(async () => {
    await batchProcessor({ batch });
  }))
  // add listeners
  .on('cycle', function (event) {
    console.log(String(event.target));
  })
  .on('complete', function () {
    childParallelizer.removeChildThreads();
    threadParallelizer.removeChildThreads();
    
    console.log('\nResult: ');
    console.log('Fastest is ' + this.filter('fastest').map('name'));
    console.log('Slowest is ' + this.filter('slowest').map('name'));
  })
  // run async
  .run({ 'async': true });