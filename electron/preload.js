const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  saveVideo: async (buffer, extension = "webm") => {
    return ipcRenderer.invoke("save-video", { buffer, extension });
  },
});
