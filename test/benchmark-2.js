const Benchmark = require('benchmark');
const { Parallelizer, PARALLELIZER_CHILD, PARALLELIZER_THREADS } = require('../src/index');
const { batchProcessorOnlyCPU, batchProcessorOnlyIO } = require('../examples/basic/src/parallelizer-code');
const path = require('path');


const relativePath = '../examples/basic/src/parallelizer-code';
const absolutePath = path.resolve(__dirname, relativePath);

const parallelizer = new Parallelizer([
  { id: "only-cpu", type: PARALLELIZER_THREADS, parallelization: 4, filePath: absolutePath, processBatchFunctionName: 'batchProcessorOnlyCPU' },
  { id: "only-io", type: PARALLELIZER_CHILD, parallelization: 4, filePath: absolutePath, processBatchFunctionName: 'batchProcessorOnlyIO' },
]);

const batch = [...Array(100).keys()];
const batch2 = [...Array(100).keys()];


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
  .add('Child + Thread Parallelizers', p(async () => {
    await parallelizer.run([
      { id: "only-cpu", batch },
      { id: "only-io", batch: batch2 },
    ])
  }))
  .add('JavaSCript Promise.All', p(async () => {
    await Promise.all([
      batchProcessorOnlyCPU({ batch }),
      batchProcessorOnlyIO({ batch: batch2 })
    ])

  }))
  // add listeners
  .on('cycle', function (event) {
    parallelizer.removeChildThreads();
    console.log(String(event.target));
  })
  .on('complete', function () {
    console.log('\nResult: ');
    console.log('Fastest is ' + this.filter('fastest').map('name'));
    console.log('Slowest is ' + this.filter('slowest').map('name'));
  })
  // run async
  .run({ 'async': true });