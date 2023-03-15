# NODE Parallelizer
A NodeJS package for running code in parallel, originally created to provide multiprocessing in an AWS Lambda function but can be used on any NodeJS environment.

## Supported parallelizers
- Child Process
- Worker threads [Coming soon]

### Child Process Parallelizer
This parallelizer is specifically designed to process hundreds or thousands of records in a single invocation when your code performs both CPU-intensive and I/O-intensive operations.
Behind the scenes, it uses the NodeJS [child process module](https://nodejs.org/api/child_process.html)

When you call `runBatch(records)` method in this parallelizer, the package will split the list of records you provide into smaller subsets, and your code will be used to execute each subset in parallel.

## AWS Lambda & Child Process Parallelizer
The package can detect the number of vCPU cores allocated to your lambda function and maximize its utilization. By default, it generates one child process per vCPU core, but this setting can be customized to meet your specific requirements. Alternatively, you can manually specify the number of child processes the library creates, regardless of the number of vCPU cores available.

It uses the Lambda function environment `/tmp` folder to create the required module that runs in the child.

When you call the `createChildProcessFromFile` or the `createChildProcessFromCode` methods outside of the Lambda handler function, it will reuse the child processes across the different invocations within a Lambda instance, improving performance. Furthermore, if the package detects a disconnection of any of the child processes, it will recreate it automatically without affecting the execution.

## Installation
To add this package to your dependency list, run:

```bash
npm i node-parallelizer --save
```
## Usage

### Child Process Parallelizer

#### Example 1, using child process parallizer in AWS Lambda.
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
childProcess.createChildProcessFromFile({ filePath: "/var/task/src/my-child-code.js", processBatchFunctionName: 'batchProcessor' });

module.exports.handler = async(event) => {
  // Run batch in parallel
  const responses = await childProcess.runBatch(event.Records);
  
  console.log(responses);
};

```
> Ensure that the filePath parameter is given as an absolute path. In this sample, we've added '/var/task/' to our path child code path because Lambda  deploys your code in that path folder.

The below snippet represents the code you want to run in parallel
```javascript
// my-child-code.js

const batchProcessor = ({ batch }) => {
  
  //
  // HERE MY Business logic code
  //

  return { success: true, count: batch.length }
}


module.exports = { batchProcessor }

```
> Ensure the input signature of your function (this case: `batchProcessor`) has `batch` as a parameter. As this contains the subset of records that a child process will process.

## Contribution
We welcome contributions to this project. If you are interested in contributing, please feel free to submit a pull request.