class A {
  protected a = 1;

  public constructor(
    protected b = 2
  ) {}

  public sayStuff(): void {
    console.log(this.a);
    console.log(this.b);
  }
}