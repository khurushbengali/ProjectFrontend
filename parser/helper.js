const push = (array, ...items) => {
    array.splice(array.length, 0, ...items)
    return array
}

const peek = array => array.slice(-1)[0]

const pair = (x, y) => (op) => {
    if (op === 0) return x
    if (op === 1) return y
    throw new Error('pair: invalid selector -- ' + op)
}

const head = (p) => p(0)

const tail = (p) => p(1)

const lookup = (x, e) => {
    if (e === null) {
        throw new Error('unbound name:' + x)
    }
    if (head(e).hasOwnProperty(x)) {
        const v = head(e)[x]
        if (is_unassigned(v)) {
            throw new Error('unassigned name:')
        }
        return v
    }
    return lookup(x, tail(e))
}

const handle_sequence = seq => {
    if (seq.length === 0)
        return [{ tag: "lit", undefined }]
    let result = []
    let first = true
    for (let cmd of seq) {
        first ? first = false
            : result.push({ tag: 'pop_i' })
        result.push(cmd)
    }
    return result.reverse()
}

const scan = comp =>
    comp.tag === 'seq'
        ? comp.stmts.reduce((acc, x) => acc.concat(scan(x)),
            [])
        : ['let', 'const', 'fun'].includes(comp.tag)
            ? [comp.sym]
            : []

const is_closure = x =>
    x !== null &&
    typeof x === "object" &&
    x.tag === 'closure'

const is_builtin = x =>
    x !== null &&
    typeof x === "object" &&
    x.tag == 'builtin'

const value_to_string = x =>
    is_closure(x)
        ? '<closure>'
        : is_builtin(x)
            ? '<builtin: ' + x.sym + '>'
            : stringify(x)

const binop_microcode = {
    '+': (x, y) => (is_number(x) && is_number(y)) ||
        (is_string(x) && is_string(y))
        ? x + y
        : error([x, y], "+ expects two numbers" +
            " or two strings, got:"),
    // todo: add error handling to JS for the following, too
    '*': (x, y) => x * y,
    '-': (x, y) => x - y,
    '/': (x, y) => x / y,
    '%': (x, y) => x % y,
    '<': (x, y) => x < y,
    '<=': (x, y) => x <= y,
    '>=': (x, y) => x >= y,
    '>': (x, y) => x > y,
    '===': (x, y) => x === y,
    '!==': (x, y) => x !== y
}

// v2 is popped before v1
const apply_binop = (op, v2, v1) => binop_microcode[op](v1, v2)

const unop_microcode = {
    '-unary': x => - x,
    '!': x => is_boolean(x)
        ? !x
        : error(x, '! expects boolean, found:')
}

const apply_unop = (op, v) => unop_microcode[op](v)

const builtin_mapping = {
    print: x => console.log(x),
}

const apply_builtin = (builtin_symbol, args) =>
    builtin_mapping[builtin_symbol](...args)

const display = x => console.log(x)

const error = (x, msg) => {
    throw new Error(msg + x)
}

const assign = (x, v, e) => {
    if (e === null)
        error(x, 'unbound name:')
    if (head(e).hasOwnProperty(x)) {
        head(e)[x] = v
    } else {
        assign(x, v, tail(e))
    }
}

const extend = (xs, vs, e) => {
    if (vs.length > xs.length) error('too many arguments')
    if (vs.length < xs.length) error('too few arguments')
    const new_frame = {}
    for (let i = 0; i < xs.length; i++)
        new_frame[xs[i]] = vs[i]
    return pair(new_frame, e)
}

const unassigned = { tag: 'unassigned' }

const is_unassigned = v => {
    return v !== null &&
        typeof v === "object" &&
        v.hasOwnProperty('tag') &&
        v.tag === 'unassigned'
}

const command_to_string = cmd =>
    (cmd.tag === 'env_i')
    ? '{ tag: "env_i", env: ...}'
    : JSON.stringify(cmd)

const arity = x => typeof x === 'function' ? x.length : error(x, 'arity expects function, received:')

const is_number = x => typeof x === 'number'

module.exports = { push, peek, pair, head, tail, lookup, handle_sequence, scan, is_closure, is_builtin, value_to_string, apply_binop, apply_unop, apply_builtin, builtin_mapping, display, error, extend, assign, unassigned, is_unassigned, command_to_string, arity }