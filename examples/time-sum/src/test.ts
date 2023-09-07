// this is for a Beginner.Codes challenge :)
// discord.gg/72gct95QGT

function timeSum(times: string[]): number[] {
  let hours = 0, minutes = 0, seconds = 0;
  for (const time of times) {
    const [tHours, tMinutes, tSeconds] = time.split(":").map(s => parseInt(s));
    hours += tHours;
    minutes += tMinutes;
    seconds += tSeconds;
  }
  return [hours, minutes, seconds];
}