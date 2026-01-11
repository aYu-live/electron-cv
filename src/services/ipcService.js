export async function saveVideo(buffer, extension = "webm") {
  if (
    !window.electronAPI ||
    typeof window.electronAPI.saveVideo !== "function"
  ) {
    throw new Error(
      "electronAPI.saveVideo is not available. Are you running inside Electron with preload configured?"
    );
  }
  return window.electronAPI.saveVideo(buffer, extension);
}
