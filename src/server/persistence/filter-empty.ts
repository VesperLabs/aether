const isEmptyObject = (obj: object) => Object.keys(obj).length === 0 && obj.constructor === Object;

const isEmptyArray = (arr: unknown) => Array.isArray(arr) && arr.length === 0;

/** Drops null, undefined and empty object or array properties of an item. */
export function filterProperties(item: Record<string, any> | null | undefined) {
  if (!item) return null;
  const filteredItem: Record<string, any> = {};

  for (const [key, value] of Object.entries(item)) {
    if (value === null || typeof value === "undefined") continue;
    if (!isEmptyObject(value) && !isEmptyArray(value)) {
      filteredItem[key] = value;
    }
  }

  return filteredItem;
}

/** Applies `filterProperties` to each item of an array, or each value of an object, before saving. */
export function filterNullEmpty(data: unknown) {
  if (Array.isArray(data)) {
    return data.map((item) => filterProperties(item));
  } else if (typeof data === "object" && data !== null) {
    const filteredItem: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      filteredItem[key] = filterProperties(value);
    }
    return filteredItem;
  } else {
    throw new Error("Invalid input data. Must be an array or an object.");
  }
}
