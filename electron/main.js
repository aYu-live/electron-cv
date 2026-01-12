const {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  shell,
  session,
  protocol,
} = require("electron");
const path = require("path");
const fs = require("fs");

const isDev = process.env.NODE_ENV === "development";

let mainWindow;
let fileWatcher = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 2048,
    height: 1024,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      // 使用自定义协议，不需要禁用 webSecurity
      webSecurity: true,
      // 禁用沙盒以解决 MediaStream 问题
      sandbox: false,
    },
  });

  // 处理媒体权限请求（摄像头、麦克风）
  mainWindow.webContents.session.setPermissionRequestHandler(
    (webContents, permission, callback) => {
      // 自动允许摄像头和麦克风权限
      if (permission === "media" || permission === "mediaKeySystem") {
        callback(true);
      } else {
        callback(false);
      }
    }
  );

  // 处理媒体访问权限检查
  mainWindow.webContents.session.setPermissionCheckHandler(
    (webContents, permission, requestingOrigin, details) => {
      if (permission === "media") {
        return true;
      }
      return false;
    }
  );

  // 设置 CSP，允许 mediastream 和自定义协议
  mainWindow.webContents.session.webRequest.onHeadersReceived(
    (details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          "Content-Security-Policy": [
            "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: mediastream: app:",
          ],
        },
      });
    }
  );

  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools();
  } else {
    // 使用自定义协议加载页面，而不是 file:// 协议
    mainWindow.loadURL("app://./index.html");
  }

  // 监听页面加载完成
  mainWindow.webContents.on("did-finish-load", () => {
    console.log("页面加载完成");
  });

  // 转发渲染进程的控制台消息到主进程
  mainWindow.webContents.on(
    "console-message",
    (event, level, message, line, sourceId) => {
      console.log(`[Renderer] ${message}`);
    }
  );
}

// 注册自定义协议必须在 app ready 之前
if (!isDev) {
  // 注册特权标准协议，这样它的行为就像 http:// 一样
  protocol.registerSchemesAsPrivileged([
    {
      scheme: "app",
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        corsEnabled: true,
        stream: true, // 关键：支持流媒体
      },
    },
  ]);
}

app.whenReady().then(() => {
  // 注册自定义协议，用于解决 file:// 协议下 MediaStream 无法工作的问题
  if (!isDev) {
    protocol.handle("app", (request) => {
      try {
        // 从 app://./index.html 提取文件路径
        const url = new URL(request.url);
        let requestPath = url.pathname;

        // 处理开头的斜杠
        if (requestPath.startsWith("/")) {
          requestPath = requestPath.slice(1);
        }

        // 解码 URL 编码的字符
        requestPath = decodeURIComponent(requestPath);

        // 获取 dist 目录的绝对路径
        const distPath = path.join(__dirname, "..", "dist");
        
        // 拼接完整路径并规范化
        const normalizedPath = path.normalize(
          path.join(distPath, requestPath)
        );

        // 安全检查：确保路径在 dist 目录内，防止路径遍历攻击
        if (!normalizedPath.startsWith(path.normalize(distPath))) {
          console.error("路径遍历攻击尝试被阻止:", requestPath);
          return new Response("Access Denied", {
            status: 403,
            headers: { "content-type": "text/plain" }
          });
        }

        // 检查文件是否存在
        if (!fs.existsSync(normalizedPath)) {
          console.warn("文件不存在:", normalizedPath);
          return new Response("File Not Found", {
            status: 404,
            headers: { "content-type": "text/plain" }
          });
        }

        // 读取文件内容
        const data = fs.readFileSync(normalizedPath);
        
        // 根据文件扩展名设置 MIME 类型
        const ext = path.extname(normalizedPath).toLowerCase();
        const mimeTypes = {
          '.html': 'text/html',
          '.css': 'text/css',
          '.js': 'application/javascript',
          '.json': 'application/json',
          '.png': 'image/png',
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.gif': 'image/gif',
          '.svg': 'image/svg+xml',
          '.ico': 'image/x-icon',
          '.woff': 'font/woff',
          '.woff2': 'font/woff2',
          '.ttf': 'font/ttf',
          '.eot': 'application/vnd.ms-fontobject',
        };
        const mimeType = mimeTypes[ext] || 'application/octet-stream';

        return new Response(data, {
          status: 200,
          headers: { "content-type": mimeType }
        });
      } catch (err) {
        console.error("协议处理器错误:", err);
        return new Response("Internal Server Error", {
          status: 500,
          headers: { "content-type": "text/plain" }
        });
      }
    });
  }

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

ipcMain.handle("choose-save-path", async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ["openDirectory", "createDirectory"],
      title: "选择视频保存目录",
      buttonLabel: "选择此目录",
    });

    if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
      return { success: false };
    }

    return { success: true, path: result.filePaths[0] };
  } catch (err) {
    console.error("Failed to choose save path", err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle(
  "save-video",
  async (event, { buffer, extension, customPath, barcode }) => {
    try {
      // 如果有自定义路径就用自定义的，否则用默认的视频目录
      const videosDir = customPath || app.getPath("videos");
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

      // 文件名格式：[识别码]+[时间戳]
      const barcodePrefix = barcode ? `${barcode}_` : "";
      const filename = `${barcodePrefix}${timestamp}.${extension || "webm"}`;

      const filepath = path.join(videosDir, filename);
      const data = Buffer.from(buffer);
      await fs.promises.writeFile(filepath, data);
      return { success: true, path: filepath };
    } catch (err) {
      console.error("Failed to save video", err);
      return { success: false, error: err.message };
    }
  }
);

ipcMain.handle("get-video-list", async (event, customPath) => {
  try {
    const videosDir = customPath || app.getPath("videos");

    // 检查目录是否存在
    try {
      await fs.promises.access(videosDir);
    } catch (err) {
      // 目录不存在，返回空列表
      return { success: true, files: [], dir: videosDir };
    }

    const files = await fs.promises.readdir(videosDir);
    const videoExtensions = [".mp4", ".webm", ".avi", ".mov", ".mkv"];

    const videoFiles = [];
    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      if (videoExtensions.includes(ext)) {
        const filepath = path.join(videosDir, file);
        const stat = await fs.promises.stat(filepath);
        videoFiles.push({
          name: file,
          path: filepath,
          size: formatFileSize(stat.size),
          time: stat.birthtime.toLocaleString("zh-CN"),
        });
      }
    }

    // 按创建时间降序排列（最新的在前）
    videoFiles.sort((a, b) => {
      const aTime = new Date(a.time).getTime();
      const bTime = new Date(b.time).getTime();
      return bTime - aTime;
    });

    return { success: true, files: videoFiles, dir: videosDir };
  } catch (err) {
    console.error("Failed to get video list", err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle("open-directory", async (event, dirPath) => {
  try {
    const targetDir = dirPath || app.getPath("videos");
    await shell.openPath(targetDir);
    return { success: true };
  } catch (err) {
    console.error("Failed to open directory", err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle("open-file", async (event, filePath) => {
  try {
    await shell.openPath(filePath);
    return { success: true };
  } catch (err) {
    console.error("Failed to open file", err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle("delete-file", async (event, filePath) => {
  try {
    // 检查文件是否存在
    await fs.promises.access(filePath);
    // 删除文件
    await fs.promises.unlink(filePath);
    console.log("文件已删除:", filePath);
    return { success: true };
  } catch (err) {
    console.error("Failed to delete file", err);
    return { success: false, error: err.message };
  }
});

// 格式化文件大小
function formatFileSize(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

// 启动目录监听
ipcMain.handle("start-watch-directory", async (event, customPath) => {
  try {
    const videosDir = customPath || app.getPath("videos");

    // 停止已有的监听器
    if (fileWatcher) {
      fileWatcher.close();
      fileWatcher = null;
    }

    // 检查目录是否存在
    try {
      await fs.promises.access(videosDir);
    } catch (err) {
      // 目录不存在，创建它
      await fs.promises.mkdir(videosDir, { recursive: true });
    }

    // 创建文件监听器
    fileWatcher = fs.watch(videosDir, (eventType, filename) => {
      if (filename && eventType === "rename") {
        // 文件被添加或删除
        console.log("文件变化:", eventType, filename);
        // 通知渲染进程刷新列表
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send("file-changed");
        }
      }
    });

    console.log("开始监听目录:", videosDir);
    return { success: true, dir: videosDir };
  } catch (err) {
    console.error("Failed to start watching directory", err);
    return { success: false, error: err.message };
  }
});

// 停止目录监听
ipcMain.handle("stop-watch-directory", async () => {
  try {
    if (fileWatcher) {
      fileWatcher.close();
      fileWatcher = null;
      console.log("停止监听目录");
    }
    return { success: true };
  } catch (err) {
    console.error("Failed to stop watching directory", err);
    return { success: false, error: err.message };
  }
});

// 获取默认保存路径
ipcMain.handle("get-default-path", async () => {
  try {
    const defaultPath = app.getPath("videos");
    return { success: true, path: defaultPath };
  } catch (err) {
    console.error("Failed to get default path", err);
    return { success: false, error: err.message };
  }
});
