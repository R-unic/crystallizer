class A {
  public methodA(): void {
    console.log("Hello from A!");
  }
}

class B extends A {
  public methodB(): void {
    console.log("Hello from B!");
  }
}

const b = new B;
b.methodA();
b.methodB();
console.log(b instanceof B);
console.log(b instanceof A);