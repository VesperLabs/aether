export function getAngleFromDirection(direction) {
  let angle = 0;

  if (direction === "up") angle = 270;
  if (direction === "down") angle = 90;
  if (direction === "left") angle = 180;
  if (direction === "right") angle = 0;

  return angle;
}

export function capitalize(str) {
  if (str.length == 0) return str;
  return str[0].toUpperCase() + str.substr(1);
}
