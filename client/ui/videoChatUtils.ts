/** Prefer over stream.active — tracks are authoritative for whether we can show / send video. */
export function streamHasUsableVideo(stream: MediaStream | null | undefined): boolean {
  if (!stream) return false;
  const tracks = stream.getVideoTracks();
  if (tracks.length === 0) return false;
  return tracks.some((t) => t.readyState !== "ended");
}

/** Secure context + `navigator.mediaDevices.getUserMedia` (required for camera/mic). */
export function isVideoChatEnvironmentSupported(): boolean {
  if (typeof navigator === "undefined") return false;
  return typeof navigator.mediaDevices?.getUserMedia === "function";
}

/**
 * iOS forces all browsers to use WebKit. Chrome/Firefox/Edge on iOS are shells (CriOS, FxiOS, …)
 * and historically had weaker or flaky camera + WebRTC vs Safari; many users still see failures.
 * We disable the feature there and show "supported browsers only" unless we add a dedicated iOS WK fix.
 */
export function isIOSNonSafariBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const iOS =
    /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (!iOS) return false;
  return /CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
}

/** True when we should allow enabling video chat and calling getUserMedia. */
export function canUseVideoChat(): boolean {
  return isVideoChatEnvironmentSupported() && !isIOSNonSafariBrowser();
}
