export function convertMsToS(s) {
  return (s / 1000).toFixed(2) + "s";
}

export const formatStats = (stats = {}) =>
  Object.entries(stats).reduce((acc, [key, value]) => {
    // skip these
    if (["mpCost", "hpCost", "spCost"].includes(key)) return acc;

    // combine damage min-max into one x - x stat:
    if ((key?.includes("Damage") && key?.includes("max")) || key?.includes("min")) {
      const identifier = key.replace("min", "").replace("max", "");
      if (!acc.hasOwnProperty(identifier)) {
        acc[identifier] = formatStat(identifier, [
          stats?.[`min${identifier}`] || 0,
          stats[`max${identifier}`] || 0,
        ]);
      }
    } else {
      acc[key] = formatStat(key, value);
    }

    return acc;
  }, {});

const formatStat = (key, value) => {
  if (key.includes("Damage")) {
    if (Array.isArray(value)) {
      const formattedValue = value.map((item) => `${item}`).join(" ↔ ");
      return formattedValue;
    }
    return value;
  } else if (["hp", "mp"].includes(key)) {
    if (Array.isArray(value)) {
      const formattedValue = value.map((item) => `+${item}`).join(" ↔ ");
      return formattedValue;
    }
    return "+" + value;
  } else if (key.includes("Delay") || key.includes("duration")) {
    if (Array.isArray(value)) {
      const formattedValue = value
        .map((item) => convertMsToS(item)?.replace(".00", ""))
        .join(" ↔ ");
      return formattedValue;
    }
    return convertMsToS(value)?.replace(".00", "");
  } else if (
    key.includes("Steal") ||
    key.includes("Chance") ||
    key.includes("Resistance") ||
    key.includes("magicFind")
  ) {
    if (Array.isArray(value)) {
      const formattedValue = value.map((item) => `${item}%`).join(" ↔ ");
      return formattedValue;
    }
    return value + "%";
  } else {
    return value;
  }
};

export function msToHours(ms) {
  if (!ms) return 0;
  const millisecondsInHour = 60 * 60 * 1000; // Number of milliseconds in an hour
  return (ms / millisecondsInHour).toFixed(2) + " hrs";
}
