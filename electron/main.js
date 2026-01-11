const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");

ffmpeg.setFfmpegPath(ffmpegPath);

const isDev = process.env.NODE_ENV === "development";

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

ipcMain.handle("save-video", async (event, { buffer, extension }) => {
  try {
    const videosDir = app.getPath("videos");
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

    // 先保存为临时 webm 文件
    // const tempWebmName = `capture-${timestamp}.${extension || 'webm'}`
    // const tempWebmPath = path.join(videosDir, tempWebmName)
    // const data = Buffer.from(buffer)
    // await fs.promises.writeFile(tempWebmPath, data)

    // 目标 mp4 文件
    const mp4Name = `capture-${timestamp}.mp4`;
    const mp4Path = path.join(videosDir, mp4Name);

    // 使用 ffmpeg 转码为 mp4
    await new Promise((resolve, reject) => {
      ffmpeg(tempWebmPath)
        .outputOptions("-c:v libx264", "-c:a aac")
        .on("end", resolve)
        .on("error", reject)
        .save(mp4Path);
    });

    // 转码完成后，可以删除临时 webm
    try {
      await fs.promises.unlink(tempWebmPath);
    } catch (e) {
      // 删除失败不影响整体成功
      console.warn("Failed to delete temp webm file", e);
    }

    return { success: true, path: mp4Path };
  } catch (err) {
    console.error("Failed to save video", err);
    return { success: false, error: err.message };
  }
});
