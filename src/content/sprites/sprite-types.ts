export interface AssetDefinition {
  readonly texture: string;
  readonly src: string;
  readonly atlas?: string;
  readonly previewRect?: readonly number[];
}
