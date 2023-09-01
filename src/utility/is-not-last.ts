export default function isNotLast<T = unknown>(element: T, array: ArrayLike<T> & { indexOf(e: T): number; }): boolean {
  return array.indexOf(element) !== array.length - 1
}