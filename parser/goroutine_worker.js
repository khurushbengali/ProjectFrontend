const { parentPort } = require('worker_threads');
const { microcode } = require('./go')
const { push, peek, pair, head, tail, lookup, handle_sequence, scan, is_closure, is_builtin, value_to_string, apply_binop, apply_unop, apply_builtin, builtin_mapping, display, error, extend, assign, unassigned, is_unassigned, command_to_string, arity, is_number } = require('./helper');
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

parentPort.on('message', async (funcName) => {
  // Execute the goroutine function
  const result = await executeGoroutineFunction(funcName); // Implement this function to execute the goroutine function
  
  // Send the result back to the main thread
  parentPort.postMessage(result);
});

// Function to execute the goroutine function
const executeGoroutineFunction = async (funcName) => {
  // For simplicity, let's assume we execute the function and return its result
  console.log(JSON.stringify(funcName))
  if (microcode.hasOwnProperty(funcName.tag)) {
    microcode[funcName.tag](funcName);
  }
  
  return `Result of ${funcName}`;
  // return await someFunction(funcName);
};

// const someFunction = async (funcName) => {
//   // Implement logic to execute the goroutine function
  
//   // For simplicity, let's return a dummy value
  
// };
