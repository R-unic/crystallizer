export default function toPascalCase(input: string): string {
  const modifiedInput = input.replace(/[_\-]([a-z])/gi, (_, match) => match.toUpperCase());
  return modifiedInput.charAt(0).toUpperCase() + modifiedInput.slice(1);
}