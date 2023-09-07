import assetList from "./data/assetList.json";

/* Resolves the right asset compensating for user profile attributes */
const resolveAsset = (item, user, isSlot = false) => {
  const { profile } = user ?? {};
  const { race, gender, face, hair, whiskers } = profile ?? {};
  let textureName = "";

  switch (item?.slot) {
    case "hands":
    case "ring":
    case "amulet":
    case "stackable":
    case "spell":
    case "bag":
      textureName = item?.texture;
      break;
    case "armor":
      textureName = `${race}-${gender}-${item?.texture}`;
      break;
    case "whiskers":
      textureName = `${race}-${whiskers?.texture}`;
      break;
    case "hair":
      textureName = `${race}-${hair?.texture}`;
      break;
    case "face":
      textureName = `${race}-${face?.texture}`;
      break;
    case "skin":
      textureName = race;
      break;
    case "chest":
      textureName = `${race}-${gender}-chest-bare`;
      break;
    default:
      textureName = `${race}-${item?.texture}`;
      break;
  }

  const asset = assetList?.find((asset) => textureName === asset?.texture) || assetList?.[0];
  return { ...asset, src: process.env.SERVER_URL + "/" + asset.src };
};

export { assetList, resolveAsset };
