const splitTime = (numberOfHours) => {
  const Days = Math.floor(numberOfHours / 24);
  const Remainder = numberOfHours % 24;
  const Hours = Math.floor(Remainder);
  // const Minutes = Math.floor(60 * (Remainder - Hours));
  return ({ Days, Hours });
};

module.exports = {
  splitTime,
};
