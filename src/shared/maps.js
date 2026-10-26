import mapList from "./data/map-list.json";
import mapImageList from "./data/map-image-list.json";

const getMapByName = (name) => {
  return mapList?.find((m) => m?.name === name);
};

export { mapList, mapImageList, getMapByName };
