const { app, BrowserWindow, ipcMain } = require("electron");
const { join, resolve } = require("node:path");
const { invokeRust } = require("./ipc/rustSidecar.cjs");

const repoRoot = resolve(__dirname, "..");

async function createWindow() {
  const window = new BrowserWindow({
    backgroundColor: "#151a1f",
    height: 900,
    minHeight: 720,
    minWidth: 1100,
    show: false,
    title: "AgenticCrew",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: join(__dirname, "preload.cjs")
    },
    width: 1440
  });

  window.once("ready-to-show", () => {
    window.show();
  });

  if (process.env.AGENTICCREW_DEV_SERVER_URL) {
    await window.loadURL(process.env.AGENTICCREW_DEV_SERVER_URL);
    return;
  }

  await window.loadFile(join(repoRoot, "frontend", "dist", "index.html"));
}

ipcMain.handle("agenticcrew:invoke", (_event, request) => {
  return invokeRust(request.command, request.args);
});

app.whenReady().then(async () => {
  await createWindow();

  app.on("activate", async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
