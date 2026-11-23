const { app, BrowserWindow, Menu } = require("electron");
const path = require("path");

Menu.setApplicationMenu(null);

function createWindow() {
  const win = new BrowserWindow({
    width: 1040,
    height: 820,
    minWidth: 380,
    minHeight: 640,
    title: "Il quaderno di Sofia",
    backgroundColor: "#F7F4ED",
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.once("ready-to-show", () => win.show());
  win.loadFile(path.join(__dirname, "..", "dist", "index.html"));
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  app.quit();
});
