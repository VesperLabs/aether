import { assetList } from "./asset-list";

interface AssetUser {
  profile?: {
    race?: string;
    gender?: string;
    face?: { texture?: string };
    hair?: { texture?: string };
    whiskers?: { texture?: string };
  };
}

/* Resolves the right asset compensating for user profile attributes */
export function resolveAsset(
  item: { slot?: string; texture?: string } | null | undefined,
  user?: AssetUser | null,
  _isSlot = false,
) {
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
      textureName = item?.texture as string;
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
      textureName = race as string;
      break;
    case "chest":
      textureName = `${race}-${gender}-chest-bare`;
      break;
    default:
      textureName = `${race}-${item?.texture}`;
      break;
  }

  return assetList.find((asset) => textureName === asset?.texture) || assetList[0];
}
