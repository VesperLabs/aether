import { useEffect, useState } from "react";

/** A template tileset with its image, once loaded. */
export interface LoadedTileset {
  name: string;
  firstgid: number;
  columns: number;
  margin: number;
  spacing: number;
  image?: HTMLImageElement;
}

interface TilesetInfo {
  readonly name: string;
  readonly firstgid: number;
  readonly columns?: number;
  readonly margin?: number;
  readonly spacing?: number;
  readonly image?: string;
}

/** Map JSON names images relative to the tilemaps folder. */
const imageUrl = (image: string) => `/assets/tilemaps/${image}`;

/** The map's tilesets, sorted by first id, with images filled in as they load. */
export const useTilesets = (map?: { readonly tilesets: readonly TilesetInfo[] }) => {
  const [tilesets, setTilesets] = useState<LoadedTileset[]>([]);
  useEffect(() => {
    if (!map) return;
    const sorted = [...map.tilesets]
      .sort((a, b) => a.firstgid - b.firstgid)
      .map((tileset) => ({
        name: tileset.name,
        firstgid: tileset.firstgid,
        columns: tileset.columns ?? 1,
        margin: tileset.margin ?? 0,
        spacing: tileset.spacing ?? 0,
        source: tileset.image,
      }));
    setTilesets(sorted);
    let live = true;
    sorted.forEach(({ source }, index) => {
      if (!source) return;
      const image = new Image();
      image.onload = () =>
        live &&
        setTilesets((current) =>
          current.map((tileset, at) => (at === index ? { ...tileset, image } : tileset)),
        );
      image.src = imageUrl(source);
    });
    return () => {
      live = false;
    };
  }, [map]);
  return tilesets;
};
