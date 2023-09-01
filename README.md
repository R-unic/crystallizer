# Crystallizer
A TypeScript to Crystal compiler. All the beauty and power of TypeScript, with all the speed and compatibility of Crystal.

# Usage
* All of the below instructions are temporary.
* You must have Crystal and TypeScript installed to be able to actually use it.

1. Clone the repository
2. Run `npm i && tsc && npm run build-binary`
3. Access executable from `bin`

# Todo

- write tests
- cli:
  - watch mode
- codegen:
  - imports/exports
  - disallow Promise.then, Promise.catch, Promise.finally, etc.
  - instanceof (value.class < TypeToCheck)
  - blocks with arguments