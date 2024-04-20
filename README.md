# Executing the Project source code and test cases
## To use the pegjs command, install PEG.js globally:
```
npm install -g pegjs
```
## In parser directory, generate updated parser file (goparser.js) with PEGJS file
```
pegjs goparser.pegjs
```
## Run the main project source file (go.js)
```	
node ./go.js 
```
### go.js contains 11 different test cases as discussed above:
* goCodePrint
* goCodeVarDecl
* goCodeBinop
* goCodeIfTrue
* goCodeIfFalse
* goCodeFactorial
* goCodeIfNested
* goCodeFor
* goCodeForNested
* goCodeRoutines
* goCodeRoutinesWaitGroup
