import assetList from "./data/assetList.json";

/* Resolves the right asset compensating for user profile attributes */
const resolveAsset = (item, user) => {
  let textureName = "";
  let returnAsset = null;
  assetList.forEach((asset) => {
    const texture = item?.texture;
    switch (item?.slot) {
      case "hands":
      case "ring":
      case "amulet":
      case "stackable":
      case "spell":
        textureName = texture;
        break;
      case "armor":
        textureName =
          user?.profile?.race + "-" + user?.profile?.gender + "-" + texture;
        break;
      default:
        textureName = user?.profile?.race + "-" + texture;
        break;
    }
    if (textureName === asset?.texture) {
      returnAsset = asset;
    }
  });
  return returnAsset;
};

export { assetList, resolveAsset };
