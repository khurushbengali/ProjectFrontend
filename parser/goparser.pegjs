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
  = functionApplication / unop / literal / nam / "(" _ expression _ ")"

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
  = _ "func" _ sym:identifier _ "(" _ prms:nameTypePairs? _ ")" _ returnType:type? _ "{" _ body:body? _ "}" _ {
      return {
        tag: "fun",
        sym: sym,
        prms: prms ? prms : [],
        body: body,
        returnType: returnType
      };
    }

functionApplication
  = _ fun:identifier "(" _ args:args? _ ")" _ {
      return {
        tag: "app",
        fun: {tag: "nam", sym: fun},
        args: args ? args.reverse() : []
      }
    }

args
  = first:expression rest:(_ "," _ expression)* {
      return [first].concat(rest.map(e => e[3]));
    }

variableDeclaration
  = _ "var" _ nameType:nameTypePair _ "="? _ expr:expression? _ {
      return {
        tag: "let",
        sym: nameType.name,
        type: nameType.type,
        expr: expr
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
  = _ "if" _ pred:expression _ "{" _ cons:body? _ "}" alt:else? {
      return {
        tag: "cond_stmt",
        pred: pred,
        cons: cons,
        alt: alt
      }
    }

else
  = _ "else" _ "{" _ alt:body? _ "}" _ {
    return alt
  }

forLoop
  = _ "for" _ pred:expression? _ "{" _ body:body? _ "}" _
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
  = _ "go" _ fun:identifier "(" _ args:args? _ ")" _ {
    return {
        tag: "goroutines",
        fun: {tag: "nam", sym: fun},
        args: args ? args.reverse() : []
    }
}

return
  = _ "return" _ expr:expression? _ {
    return {
      tag: "ret",
      expr: expr
    };
  }

body
  = statements:statement* {
      return {
        tag: "blk",
        body: statements.length === 1 ? statements[0] : { tag: "seq", stmts: statements }
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