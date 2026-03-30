/** Prefer over stream.active — tracks are authoritative for whether we can show / send video. */
export function streamHasUsableVideo(stream: MediaStream | null | undefined): boolean {
  if (!stream) return false;
  const tracks = stream.getVideoTracks();
  if (tracks.length === 0) return false;
  return tracks.some((t) => t.readyState !== "ended");
}
