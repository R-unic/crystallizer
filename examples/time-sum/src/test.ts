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
