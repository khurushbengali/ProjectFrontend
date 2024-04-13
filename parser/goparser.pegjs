start
  = _ programs:program _ { return programs; }

program
  = _ declarations:test* _ {
      return {
        tag: "seq",
        stmts: declarations
      };
    }

test
  = functionDeclaration / functionApplication

expression
  = head:operand tail:(_ binary_operator _ operand)* {
      return tail.reduce((result, element) => {
        return {
          tag: "binop",
          sym: element[1],
          frst: result,
          scnd: element[3]
        };
      }, head);
    }

operand
  = unop / literal / nam / "(" _ expression _ ")"

statement
  = variableDeclaration / conditional / assignment / return / functionApplication / goroutine / forLoop 

nam
  = sym:identifier {
      return {
        tag: "nam",
        sym: sym
      }
    }

literal
  = val:literal_values {
      return {
        tag: "lit",
        val: val
      }
    }

literal_values
  = number / true / false

unop
  = _ sym:unary_operator _ frst:operand _ {
      return {
        tag: "unop",
        sym: sym,
        frst: frst
      }
    }

unary_operator
  = "-" / "!"

binary_operator
  = "+" / "-" / "*" / "/" / "%" / "<" / "<=" / ">" / ">=" / "===" / "!=="

number
  = digits:[0-9]+ decimal:("." [0-9]+)? {
      return parseFloat(digits.join("") + (decimal ? decimal.join('') : ''));
    }

true
  = "true" {
      return true;
    }

false
  = "false" {
      return false;
    }

undefined
  = "undefined" {
      return {
        tag: "nam",
        sym: "undefined"
      }
    }

functionDeclaration
  = _ "func" _ sym:identifier _ "(" _ prms:nameTypePairs? _ ")" _ returnType:type? _ "{" _ body:functionBody? _ "}" _ {
      return {
        tag: "fun",
        sym: sym,
        prms: prms,
        body: body,
        returnType: returnType
      };
    }

functionApplication
  = _ fun:identifier "(" _ args:args _ ")" _ {
      return {
        tag: "app",
        fun: {tag: "nam", sym: fun},
        args: args.reverse()
      }
    }

args
  = first:expression rest:(_ "," _ expression)* {
      return [first].concat(rest.map(e => e[3]));
    }

variableDeclaration
  = _ "var" _ nameType:nameTypePair _ "="? _ val:literal? _ {
      return {
        tag: "var",
        name: nameType.name,
        type: nameType.type,
        val: val
      };
    }

assignment
  = _ sym:identifier _ "=" _ expr:expression _ {
      return {
        tag: "assmt",
        sym: sym,
        expr: expr
      }
    }

conditional
  = _ "if" _ pred:expression _ "{" _ cons:statement? _ "}" _ "else"? _ "{"? _ alt:statement? _ "}"? _ {
      return {
        tag: "cond",
        pred: pred,
        cons: cons,
        alt: alt
      }
    }

forLoop
  = _ "for" _ pred:expression? _ "{" _ body:forBody? _ "}" _
    {
      return {
        tag: "for",
        pred: pred,
        body: body
      };
    }

forInit
  = variableDeclaration / assignment

forBody
  = statements:statement* {
      return {
        tag: "seq",
        stmts: statements
      };
    }

goroutine
  = _ "go" _ func:functionApplication _ {
    return {
      tag: "goroutine",
      func: func
    }
  }

return
  = _ "return" _ expr:expression? _ {
    return {
      tag: "ret",
      expr: expr
    };
  }

functionBody
  = statements:statement* {
      return {
        tag: "seq",
        stmts: statements
      };
    }

nameTypePairs
  = first:nameTypePair rest:(_ "," _ nameTypePair)* {
      return [first].concat(rest.map(e => e[3]));
    }

nameTypePair
  = name:identifier _ type:type {
      return {
        name: name,
        type: type
      }
    }

identifiers
  = first:identifier rest:(_ "," _ identifier)* {
      return [first].concat(rest.map(e => e[3]));
    }

identifier
  = [a-zA-Z_][a-zA-Z_0-9]* {
      return text();
    }

type
  = int / bool / string

string
  = "string" {
      return text()
    }

bool
  = "bool" {
      return text();
    }

int
  = "int" {
      return text();
    }

// Whitespace management
_ "whitespace"
  = [ \t\n\r]*