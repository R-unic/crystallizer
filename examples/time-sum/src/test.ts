// this is for a Beginner.Codes challenge :)
// discord.gg/72gct95QGT

function timeSum(times: string[]): number[] {
  if (times.length === 0)
    return [0, 0, 0];

  let totalSeconds = 0;
  for (const time of times) {
    const timeNumbers = time.split(":").map(parseInt);
    const hours = timeNumbers[0];
    const minutes = timeNumbers[1];
    const seconds = timeNumbers[2];
    totalSeconds += hours * 3600 + minutes * 60 + seconds;
  }

  const hours = Math.floor(totalSeconds / 3600);
  const remainingSeconds = totalSeconds % 3600;
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;

  return [hours, minutes, seconds];
}

console.log(timeSum(["1:23:45"])); // ➞ [1, 23, 45]
console.log(timeSum(["1:03:45", "1:23:05"])); // ➞ [2, 26, 50]
console.log(timeSum(["5:39:42", "10:02:08", "8:26:33"])); // ➞ [24, 8, 23]
console.log(timeSum([])); // ➞ [0, 0, 0]