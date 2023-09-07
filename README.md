# Crystallizer
A TypeScript to Crystal compiler. All the beauty and power of TypeScript, with all the speed and compatibility of Crystal.

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
  - ignore advanced type generics (T extends, ternary operator, initializers)
  - destructuring (this is so much harder than it needs to be)
  - for..in
  - switch..case
  - namespaces
  - interfaces
- polyfills:
  - `Number` (😭)
  - `String` (😭)
  - `Object`
  - `Promise`