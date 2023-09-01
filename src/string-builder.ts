export default class StringBuilder {
  protected indentation = 0;
  private readonly parts: string[] = [];

  protected get generated(): string {
    return this.parts.join("");
  }

  public append(...strings: string[]): void {
    this.parts.push(...strings);
  }

  protected peekLastPart(): string {
    return this.parts[this.parts.length - 1];
  }

  protected popLastPart(): string | undefined {
    return this.parts.pop();
  }

  protected pushIndentation(): void {
    this.indentation++;
  }

  protected popIndentation(): void {
    this.indentation--;
  }

  protected newLine(): void {
    this.append("\n" + "    ".repeat(this.indentation));
  }
}