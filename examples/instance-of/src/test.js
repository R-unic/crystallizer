"use strict";
class A {
    methodA() {
        console.log("Hello from A!");
    }
}
class B extends A {
    methodB() {
        console.log("Hello from B!");
    }
}
const b = new B;
b.methodA();
b.methodB();
console.log(b instanceof B);
console.log(b instanceof A);
