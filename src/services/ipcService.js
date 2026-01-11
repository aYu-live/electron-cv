export async function saveVideo(
  buffer,
  extension = "webm",
  customPath = "",
  barcode = ""
) {
  if (
    !window.electronAPI ||
    typeof window.electronAPI.saveVideo !== "function"
  ) {
    throw new Error(
      "electronAPI.saveVideo is not available. Are you running inside Electron with preload configured?"
    );
  }
  return window.electronAPI.saveVideo(buffer, extension, customPath, barcode);
}

export async function chooseSavePath() {
  if (
    !window.electronAPI ||
    typeof window.electronAPI.chooseSavePath !== "function"
  ) {
    throw new Error("electronAPI.chooseSavePath is not available.");
  }
  return window.electronAPI.chooseSavePath();
}

export async function getVideoList(customPath = "") {
  if (
    !window.electronAPI ||
    typeof window.electronAPI.getVideoList !== "function"
  ) {
    throw new Error("electronAPI.getVideoList is not available.");
  }
  return window.electronAPI.getVideoList(customPath);
}

export async function openDirectory(dirPath = "") {
  if (
    !window.electronAPI ||
    typeof window.electronAPI.openDirectory !== "function"
  ) {
    throw new Error("electronAPI.openDirectory is not available.");
  }
  return window.electronAPI.openDirectory(dirPath);
}

export async function openFile(filePath) {
  if (
    !window.electronAPI ||
    typeof window.electronAPI.openFile !== "function"
  ) {
    throw new Error("electronAPI.openFile is not available.");
  }
  return window.electronAPI.openFile(filePath);
}

export async function startWatchDirectory(dirPath = "") {
  if (
    !window.electronAPI ||
    typeof window.electronAPI.startWatchDirectory !== "function"
  ) {
    throw new Error("electronAPI.startWatchDirectory is not available.");
  }
  return window.electronAPI.startWatchDirectory(dirPath);
}

export async function stopWatchDirectory() {
  if (
    !window.electronAPI ||
    typeof window.electronAPI.stopWatchDirectory !== "function"
  ) {
    throw new Error("electronAPI.stopWatchDirectory is not available.");
  }
  return window.electronAPI.stopWatchDirectory();
}

export async function getDefaultPath() {
  if (
    !window.electronAPI ||
    typeof window.electronAPI.getDefaultPath !== "function"
  ) {
    throw new Error("electronAPI.getDefaultPath is not available.");
  }
  return window.electronAPI.getDefaultPath();
}
