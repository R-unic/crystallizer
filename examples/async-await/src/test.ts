async function myAsyncFunction(): Promise<string> {
  return "Hello!";
}

async function main(): Promise<void> {
  const result = await myAsyncFunction();
  console.log(result);
}

main();