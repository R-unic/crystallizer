class A {
  protected a = 1;

  public set b(val: number) {
    this.a = val;
  }

  public get b(): number {
    return this.a;
  }
}