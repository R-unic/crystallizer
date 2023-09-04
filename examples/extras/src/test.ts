function doSomething(action: () => void): void {
  action();
}

doSomething(() => console.log("hello!"));