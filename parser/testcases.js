const testCases = [
    {
        input: `
        func add(a int, b int) int {
            print(a + b)
        }
        add(1, 2)
        `,
        output: 3
    },
    {
        input: `
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
        `
    }
]

module.exports = { testCases };