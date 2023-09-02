async function myAsyncFunction(): Promise<string> {
  return "Hello!";
}

async function main(): Promise<void> {
  myAsyncFunction()
    .then(res => console.log(res));
}

main();