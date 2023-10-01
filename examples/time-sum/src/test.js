"use strict";
function timeSum(times) {
    if (times.length === 0)
        return [0, 0, 0];
    let totalSeconds = 0;
    for (const time of times) {
        const timeNumbers = time.split(":").map(s => parseInt(s));
        const hours = timeNumbers[0];
        const minutes = timeNumbers[1];
        const seconds = timeNumbers[2];
        totalSeconds += hours * 3600 + minutes * 60 + seconds;
    }
    const hours = (totalSeconds / 3600).floor();
    const remainingSeconds = totalSeconds % 3600;
    const minutes = (remainingSeconds / 60).floor();
    const seconds = remainingSeconds % 60;
    return [hours, minutes, seconds];
}
console.log(timeSum(["1:23:45"]).toString());
console.log(timeSum(["1:03:45", "1:23:05"]).toString());
console.log(timeSum(["5:39:42", "10:02:08", "8:26:33"]).toString());
