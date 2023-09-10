async function myAsyncFunction(): Promise<string> {
  return "Hello!";
}

async function main(): Promise<void> {
  myAsyncFunction() // you can also use await here of course
    .then(res => console.log(res));
}

main();