# node-parallelizer
A Nodejs package for running code in parallel.
## Installation
To add this package to your dependency list, run:

```bash
npm i node-parallelizer --save
```

## Supported parallelizers
- Child Process
- Worker threads [Coming soon]
## Usage

### Child process parallelizer

AWS Lambda examples:

```javascript
const { ChildProcess } = require("node-parallelizer");

// Creates a new child process instance.
const childProcess = new ChildProcess();
// Creates child processes based on your code.
childProcess.createChildProcessFromFile({ filePath: "/var/task/my-child-code.js", processBatchFunctionName: 'myFunction' });

module.exports.handler = async(event) => {
  // Run batch in parallel
  const responses = await childProcess.runBatch(event.Records);
  
  console.log(responses);
};

```

## Contribution
We welcome contributions to this project. If you are interested in contributing, please feel free to submit a pull request.