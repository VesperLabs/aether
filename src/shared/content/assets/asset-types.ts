export interface AssetDefinition {
  readonly texture: string;
  readonly src: string;
  readonly atlas?: string;
  readonly previewRect?: readonly number[];
}

export interface NamedFileDefinition {
  readonly name: string;
  readonly src: string;
}
