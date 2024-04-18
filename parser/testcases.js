const testCases = [
    {
        input: `
        func add(a int, b int) int {
            print(a + b)
        }
        add(1, 2)
        `,
        output: 3
    }
]

module.exports = { testCases };