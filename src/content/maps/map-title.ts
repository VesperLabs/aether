/** A map's name as a title: "peak-camp" is "Peak Camp". */
export function mapTitle(name: string) {
  return name
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .split("-")
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}
