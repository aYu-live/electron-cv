const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  saveVideo: async (
    buffer,
    extension = "webm",
    customPath = "",
    barcode = ""
  ) => {
    return ipcRenderer.invoke("save-video", {
      buffer,
      extension,
      customPath,
      barcode,
    });
  },
  chooseSavePath: async () => {
    return ipcRenderer.invoke("choose-save-path");
  },
  getVideoList: async (customPath = "") => {
    return ipcRenderer.invoke("get-video-list", customPath);
  },
  openDirectory: async (dirPath = "") => {
    return ipcRenderer.invoke("open-directory", dirPath);
  },
  openFile: async (filePath) => {
    return ipcRenderer.invoke("open-file", filePath);
  },
  deleteFile: async (filePath) => {
    return ipcRenderer.invoke("delete-file", filePath);
  },
  startWatchDirectory: async (dirPath = "") => {
    return ipcRenderer.invoke("start-watch-directory", dirPath);
  },
  stopWatchDirectory: async () => {
    return ipcRenderer.invoke("stop-watch-directory");
  },
  getDefaultPath: async () => {
    return ipcRenderer.invoke("get-default-path");
  },
  onFileChanged: (callback) => {
    ipcRenderer.on("file-changed", callback);
  },
});
