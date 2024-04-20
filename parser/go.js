const goParser = require('./goparser');
const { push, peek, pair, head, tail, lookup, handle_sequence, scan, is_closure, is_builtin, value_to_string, apply_binop, apply_unop, apply_builtin, builtin_mapping, display, error, extend, assign, unassigned, is_unassigned, command_to_string, arity, is_number } = require('./helper');
// Import the Worker API
const { Worker } = require('worker_threads');

const goCodePrint = `
func gofunc(a int, b int) int {
  print(b)
  print(a)
}
gofunc(1, 4)
`;

const goCodeVarDecl = `
func gofunc(a int) int {
  var b int = a + 1
  print(b)
}
gofunc(1)
`;

const goCodeBinop = `
func gofunc(a int, b int) int {
  print(a+b)
  print(a-b)
  print(a*b)
  print(a+b)
}
gofunc(1, 4)
`;

const goCodeIfTrue = `
func gofunc(a int, b int) int {
  if a < b {
    print(a)
  } else {
    print(b)
  }
}
gofunc(1, 2)
`;

const goCodeIfFalse = `
func gofunc(a int, b int) int {
  if a < b {
    print(a)
  } else {
    print(b)
  }
}
gofunc(1, 0)
`;

const goCodeIfNested = `
func gofunc(a int, b int, c int) int {
  if a > b {
    if a > c {
      print(a)
    }
  }
}
gofunc(2,1,1)
`;

const goCodeFactorial = `
func factorial(n int) int {
  if n < 2 {
    return 1
  } else {
    return n * factorial(n - 1)
  }
}
factorial(5)
`;

const goCodeFor = `
func gofunc(a int, b int) int {
  for a < b {
    print(a+b)
    a = a + 1
  }
}
gofunc(1, 4)
`;

const goCodeForNested = `
func gofunc(a int, b int, c int) int {
  for a < 100 {
    b = 0
    for b < 100 {
      c = c + a + b
      b = b + 1
    }
    a = a + 1
  }
  print(c)
}
gofunc(0, 0, 0)
`;

const goCodeRoutines = `
func get1(a int) int {
  for a < 10 {
    print(a * a)
    a = a + 1
  }
}
func get2(a int) int {
  for a < 10 {
    print(a + a)
    a = a + 1
  }
}
func gofunc(a int) int {
  go get1(a)
  go get1(a)
  get2(a)
}
gofunc(1)
`;

const goCodeRoutinesWaitGroup = `
func get1(a int) int {
  for a < 10 {
    print(a * a)
    a = a + 1
  }
}
func get2(a int) int {
  for a < 10 {
    print(a + a)
    a = a + 1
  }
}
func gofunc(a int) int {
  waitGroupAdd(2)
  go get1(a)
  go get1(a)
  waitGroupWait()
  get2(a)
}
gofunc(1)
`;

let C
let S
let E
let WG
let W

const microcode = {
  lit:
    cmd => push(S, cmd.val),
  nam:
    cmd =>
      push(S, lookup(cmd.sym, E)),
  unop:
    cmd =>
      push(C, { tag: 'unop_i', sym: cmd.sym }, cmd.frst),
  binop:
    cmd =>
      push(C, { tag: 'binop_i', sym: cmd.sym }, cmd.scnd, cmd.frst),
  fun:
    cmd =>
      push(C, {
        tag: 'const',
        sym: cmd.sym,
        expr: { tag: 'lam', prms: cmd.prms.map(e => e.name), body: cmd.body }
      }),
  log:
    cmd =>
      push(C, cmd.sym == '&&'
        ? {
          tag: 'cond_expr',
          pred: cmd.frst,
          cons: { tag: 'lit', val: true },
          alt: cmd.scnd
        }
        : {
          tag: 'cond_expr',
          pred: cmd.frst,
          cons: cmd.scnd,
          alt: { tag: 'lit', val: false }
        }),
  cond_expr:
    cmd =>
      push(C, { tag: 'branch_i', cons: cmd.cons, alt: cmd.alt }, cmd.pred),
  app:
    cmd =>
      push(C, { tag: 'app_i', arity: cmd.args.length },
        ...cmd.args, // already in reverse order, see ast_to_json
        cmd.fun),
  assmt:
    cmd =>
      push(C, { tag: 'assmt_i', sym: cmd.sym }, cmd.expr),
  lam:
    cmd =>
      push(S, { tag: 'closure', prms: cmd.prms, body: cmd.body, env: E }),
  arr_lit:
    cmd =>
      push(C, { tag: 'arr_lit_i', arity: cmd.elems.length },
        ...cmd.elems), // already in reverse order, see ast_to_json
  arr_len:
    cmd =>
      push(C, {
        tag: 'app',
        fun: { tag: "nam", sym: "array_length" },
        args: [cmd.expr]
      }),
  arr_acc:
    cmd =>
      push(C, { tag: 'arr_acc_i' }, cmd.ind, cmd.arr),
  arr_assmt:
    cmd =>
      push(C, { 'tag': 'arr_assmt_i' }, cmd.expr, cmd.ind, cmd.arr),
  seq:
    cmd => push(C, ...handle_sequence(cmd.stmts)),
  cond_stmt:
    cmd =>
      push(C, { tag: 'branch_i', cons: cmd.cons, alt: cmd.alt },
        cmd.pred),
  blk:
    cmd => {
      const locals = scan(cmd.body)
      const unassigneds = locals.map(_ => unassigned)
      if (!(C.length === 0))
        push(C, { tag: 'env_i', env: E })
      push(C, cmd.body)
      E = extend(locals, unassigneds, E)
    },
  let:
    cmd =>
      push(C, { tag: 'lit', val: undefined },
        { tag: 'pop_i' },
        { tag: 'assmt', sym: cmd.sym, expr: cmd.expr }),
  const:
    cmd =>
      push(C, { tag: "lit", val: undefined },
        { tag: 'pop_i' },
        { tag: 'assmt', sym: cmd.sym, expr: cmd.expr }),
  ret:
    cmd =>
      push(C, { tag: 'reset_i' }, cmd.expr),
  while:
    cmd =>
      push(C, { tag: 'lit', val: undefined },
        { tag: 'while_i', pred: cmd.pred, body: cmd.body },
        cmd.pred),
  for:
    cmd =>
      push(C, { tag: 'lit', val: undefined },
          { tag: 'for_i', pred: cmd.pred, body: cmd.body },
          cmd.pred),
  reset_i:
    cmd =>
      C.pop().tag === 'mark_i'    // mark found?  
        ? null                    // stop loop
        : push(C, cmd),           // continue loop by pushing same
  // reset_i instruction back on control
  assmt_i:
    cmd =>
      assign(cmd.sym, peek(S), E),
  unop_i:
    cmd =>
      push(S, apply_unop(cmd.sym, S.pop())),
  binop_i:
    cmd =>
      push(S, apply_binop(cmd.sym, S.pop(), S.pop())),
  pop_i:
    _ =>
      S.pop(),
  app_i:
    cmd => {
      const arity = cmd.arity
      let args = []
      for (let i = arity - 1; i >= 0; i--)
        args[i] = S.pop()
      const sf = S.pop()
      if (sf.tag === 'builtin') {
        if (sf.sym === 'waitGroupAdd') {
          WG += args[0]
          if (WG > 0) {
            W = true
          }
        } else if (sf.sym === 'waitGroupWait') {
          W = false
        } else {
          return push(S, apply_builtin(sf.sym, args))
        }
      } else {
        if (C.length === 0 || peek(C).tag === 'env_i') {
          push(C, { tag: 'mark_i' })
        } else if (peek(C).tag === 'reset_i') {
          C.pop()
        } else {
          push(C, { tag: 'env_i', env: E }, { tag: 'mark_i' })
        }
        push(C, sf.body)
        E = extend(sf.prms, args, sf.env)
      }
    },
  branch_i:
    cmd =>
      push(C, S.pop() ? cmd.cons : cmd.alt),
  while_i:
    cmd =>
      S.pop()
        ? push(C, cmd,
          cmd.pred,
          { tag: 'pop_i' },
          cmd.body)
        : null,
  for_i:
    cmd =>
      S.pop()
        ? push(C, cmd,
          cmd.pred,
          { tag: 'pop_i' },
          cmd.body)
        : null,
  env_i:
    cmd =>
      E = cmd.env,
  arr_lit_i:
    cmd => {
      const arity = cmd.arity
      if (arity === 0) {
        push(S, [])
      } else {
        const array = S.slice(- arity, S.length)
        S = S.slice(0, - arity)
        push(S, array)
      }

    },
  arr_acc_i:
    cmd => {
      const ind = S.pop()
      const arr = S.pop()
      push(S, arr[ind])
    },
  arr_assmt_i:
    cmd => {
      const val = S.pop()
      const ind = S.pop()
      const arr = S.pop()
      arr[ind] = val
      push(S, val)
    },
  mark_i:
    _ => null,
  throw_i:
    cmd => {
      const next = C.pop()
      if (next.tag === 'catch_i') { // catch found?
        const catch_cmd = next  // stop loop
        push(C, { tag: 'env_i', env: catch_cmd.env },
          catch_cmd.catch)
        E = extend([catch_cmd.sym],
          [S.pop()],
          catch_cmd.env)
      } else {          // continue loop by pushing same
        push(C, cmd)  // throw_i instruction back on control
      }
    },
  goroutines:
    cmd =>
      push(C, { tag: 'goroutines_i', arity: cmd.args.length },
        ...cmd.args, // already in reverse order, see ast_to_json
        cmd.fun),
  goroutines_i:
    cmd => {
      const arity = cmd.arity
      let args = []
      for (let i = arity - 1; i >= 0; i--)
        args[i] = S.pop()
      const sf = S.pop()
      if (sf.tag === 'builtin')
        return push(S, apply_builtin(sf.sym, args))
      if (C.length === 0 || peek(C).tag === 'env_i') {
        push(C, { tag: 'mark_i' })
      } else if (peek(C).tag === 'reset_i') {
        C.pop()
      } else {
        push(C, { tag: 'env_i', env: E }, { tag: 'mark_i' })
      }
      push(C, sf.body)
      E = extend(sf.prms, args, sf.env)
    }
}

const global_frame = {}
for (const key in builtin_mapping)
  global_frame[key] = {
    tag: 'builtin',
    sym: key,
    arity: arity(builtin_mapping[key])
  }
const empty_env = null
const global_env = pair(global_frame, empty_env)
const parse = (program) => ({ tag: 'blk', body: goParser.parse(program) })

const step_limit = 1000000
const execute = async (program) => {
  C = [parse(program)]
  S = []
  E = global_env
  WG = 0
  W = false
  // console.log(JSON.stringify(C))
  let i = 0
  // Iterate over the control stack
  while (C.length > 0) {
    const cmd = C.pop();
    await executeCommand(cmd)
    i++
  }

  if (i === step_limit) {
    error("step limit " + stringify(step_limit) + " exceeded")
  }
  if (S.length > 1 || S.length < 1) {
    error(S, 'internal error: stash must be singleton but is: ')
  }
  
  return display(S[0])
}

const executeCommand = async (cmd) => {
  if (cmd.tag !== 'goroutines') {
    await executeConcurrency(cmd)
  } else if (cmd.tag === 'goroutines' && WG > 0 && W) {
    await executeConcurrency(cmd)
    WG--
  } else {
    executeConcurrency(cmd)
  }
}

const executeConcurrency = (cmd) => {
  if (cmd.tag === 'goroutines') {
    return new Promise((resolve, reject) => {
      const worker1 = new Worker('./parser/goroutine_worker.js', { workerData: { cmd: cmd } });
      worker1.on('message', message => {
        push(C, ...message)
        resolve()
      });
      worker1.on('error', reject);
    })
  } else {
    if (microcode.hasOwnProperty(cmd.tag)) {
      microcode[cmd.tag](cmd);
    } else {
      error("", "unknown command: " + command_to_string(cmd));
    }
  }
};

try {
  execute(goCodePrint);
  // execute(goCodeVarDecl);
  // execute(goCodeBinop);
  // execute(goCodeIfTrue);
  // execute(goCodeIfFalse);
  // execute(goCodeIfNested);
  // execute(goCodeFor);
  // execute(goCodeForNested); // 990000
  // execute(goCodeFactorial)
  // execute(goCodeRoutines);
  // execute(goCodeRoutinesWaitGroup);
} catch (error) {
  console.error("Error parsing Go code:", error.message);
}
