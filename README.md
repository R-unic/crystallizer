![build](https://github.com/R-unic/crystallizer/actions/workflows/test.yml/badge.svg)
# Crystallizer
A TypeScript to Crystal compiler. All the beauty and power of TypeScript, with the speed and portability of Crystal.

# Example
```ts
// examples/async-await/src/test.ts

async function myAsyncFunction(): Promise<string> {
  return "Hello!";
}

async function main(): Promise<void> {
  myAsyncFunction() // you can also use await here of course
    .then(res => console.log(res));
}

main();
```
```cr
# examples/async-await/dist/test.cr

private def myAsyncFunction : MiniFuture(String)
  async! do
    return "Hello!"
  end
end
private def main : MiniFuture(Nil)
  async! do
    myAsyncFunction.then do |res|
      puts(res)
    end
    return
  end
end
await main
```

# Usage
* All of the below instructions are temporary.
* You must have Crystal and TypeScript installed to be able to actually use it.

1. Clone the repository
2. Run `npm i && tsc`
3. Run `npm start <directory>` to compile all TypeScript files inside of `<directory>` **OR** `npm start` to compile all TypeScript files inside your current working directory

# Todo

- cli:
  - watch mode
- codegen:
  - ignore advanced type generics (T extends, ternary operator, initializers) because Crystal doesn't support them
  - destructuring (this is so much harder than it needs to be, thanks TypeScript devs)
  - for..in (is this even necessary?)
  - macro the rest of the `console` library (warn, error, info, clear, etc.)
  - macro the `??` operator (`a != nil ? a : b`)
  - emit comments
  - disallow:
    - call expressions on arrow functions directly
    - type parameters in function types
- polyfills:
  - `String` (😭)
  - `Object`
  - `Promise`
- test:
  - `StringBuilder` class
  - commonly used utility functions
  - if statements with `else`/`elsif` branches