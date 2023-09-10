function longestRun(arr: number[]): number {
  if (arr.length === 0) return 0;

  let maxRunLength = 1;
  let currentRunLength = 1;
  for (let i = 1; i < arr.length; i++)
    if (arr[i] === arr[i - 1] + 1 || arr[i] === arr[i - 1] - 1) {
      currentRunLength++;
      if (currentRunLength > maxRunLength)
        maxRunLength = currentRunLength;
    } else
      currentRunLength = 1;

  return maxRunLength;
}

console.log(longestRun([1, 2, 3, 5, 6, 7, 8, 9])); // ➞ 5
console.log(longestRun([1, 2, 3, 10, 11, 15])); // ➞ 3
console.log(longestRun([5, 4, 2, 1])); // ➞ 2
console.log(longestRun([3, 5, 7, 10, 15])); // ➞ 1