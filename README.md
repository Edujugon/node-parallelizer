# Node Parallelizer
A NodeJS package for running code in parallel. Initially created to provide multiprocessing in an AWS Lambda function, but it can be used in any NodeJS environment.

## Supported parallelizers
- Child Process
- Worker threads [Coming soon]

### Child Process Parallelizer
This parallelizer is specifically designed for processing hundreds or thousands of records in a single invocation when your code performs both CPU-intensive and I/O-intensive operations. It uses the NodeJS [child process module](https://nodejs.org/api/child_process.html) behind the scenes.

When you call the `runBatch(records)` method in this parallelizer, the package will split the list of records you provide into smaller subsets, and your code will be used to execute each subset in parallel.

## AWS Lambda & Child Process Parallelizer
The package can detect the number of vCPU cores allocated to your Lambda function and maximize their utilization. By default, it generates one child process per vCPU core, but this setting can be customized to meet your specific requirements. Alternatively, you can manually specify the number of child processes the library creates, regardless of the number of vCPU cores available.

It uses the Lambda function environment `/tmp` folder to create the required module that runs in the child.

When you call the `parallelizerFunction` method outside of the Lambda handler function, it will reuse the child processes across the different invocations within a Lambda instance, improving performance. Furthermore, if the package detects a disconnection of any of the child processes, it will recreate it automatically without affecting the execution.

## Installation
To add this package to your dependency list, run:

```bash
npm i node-parallelizer --save
```
## Usage
### Child Process Parallelizer
#### Class instantiation
`ChildProcess({ tmpPath = '/tmp', maxProcesses = false, processesPerCPU = 1, debug = false })`

**Parameters**
- `tmpPath` (String) (Default value: '/tmp'): The path where the module that runs in the child will be created.
- `maxProcesses` (Number|false) (Default value: false): The maximum number of child processes that will be created. If false, it is based on the CPU cores available.
- `processesPerCPU` (Number) (Default value: 1): If the `maxProcesses` is set to `false`, this parameter defines the amount of processes per CPU.
- `debug` (Boolean) (Default value: false): Enables the internal logs for debuggin purposes.
#### Main methods
`parallelizerFunction({ filePath, processBatchFunctionName })`

**Parameters**
- `filePath` (String): The absolute path to the file that contains the function that will be executed with the subset.
- `processBatchFunctionName` (String): The name of the function that will be executed with the subset.

`runBatch(batch)`

**Parameters**
- `batch` (Array): The records you want to process in parallel.

**Returns** (Array): The responses of the child processes.
#### Using child process parallizer in AWS Lambda.
In this example, the repository structure looks like this
```
src/
  handler.js
  my-child-code.js
serverless.yml
package.json
```

The below snippet represents your Lambda handler
```javascript
// handler.js

const { ChildProcess } = require("node-parallelizer");

// Creates a new child process instance.
const childProcess = new ChildProcess();
// Creates child processes based on your code.
childProcess.parallelizerFunction({ filePath: "/var/task/src/my-child-code.js", processBatchFunctionName: 'batchProcessor' });

module.exports.handler = async(event) => {
  // Run batch in parallel
  const responses = await childProcess.runBatch(event.Records);
  
  console.log(responses);
};

```
> Make sure to provide the filePath parameter as an absolute path. In this example, we've included '/var/task/' in the path for the child code, as Lambda deploys your code within that folder.

The below snippet represents the code you want to run in parallel
```javascript
// my-child-code.js

const batchProcessor = ({ batch }) => {
  
  //
  // HERE YOUR CODE
  //

  return { success: true, count: batch.length }
}


module.exports = { batchProcessor }

```
> Verify that the input signature of your function (in this case, batchProcessor) includes batch as a parameter, as it contains the subset of records that a child process will handle.

## Contribution
We welcome contributions to this project. If you are interested in contributing, please feel free to submit a pull request.