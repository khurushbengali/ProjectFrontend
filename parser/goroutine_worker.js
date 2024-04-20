const { parentPort, workerData } = require('worker_threads');

const execute = (data) => {
  const { cmd } = data
  const result = [{ tag: 'goroutines_i', arity: cmd.args.length },
    ...cmd.args,
    cmd.fun]
  return result
}

parentPort.postMessage(execute(workerData));