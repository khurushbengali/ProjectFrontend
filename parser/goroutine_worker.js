const { parentPort, workerData } = require('worker_threads');

const push = (array, ...items) => {
  array.splice(array.length, 0, ...items)
  return array
}

const execute = (data) => {
  const { C, cmd } = data
  push(C, { tag: 'goroutines_i', arity: cmd.args.length },
    ...cmd.args,
    cmd.fun)
  return C
}

parentPort.postMessage(execute(workerData));