const { Parallelizer, PARALLELIZER_CHILD, PARALLELIZER_THREADS } = require("node-parallelizer");

const parallelizerType = process.env.PARALLELIZER_TYPE || PARALLELIZER_CHILD;
const parallelizerDebug = process.env.PARALLELIZER_DEBUG_MODE_ENABLED === 'true' ? true : false;

const parallelizer = new Parallelizer({
  type: parallelizerType,
  debug: parallelizerDebug,
  parallelizationPerCPU: process.env.PROCESSESPERCPU || 1,
  filePath: "/var/task/src/parallelizer-code-min.js",
  processBatchFunctionName: 'batchProcessor'
});

exports.handler = async (event) => {

  const batch = [...Array(event.number).keys()];

  // Run batch in parallel
  const responses = await parallelizer.run(batch);
  
  console.log(JSON.stringify(responses));
};