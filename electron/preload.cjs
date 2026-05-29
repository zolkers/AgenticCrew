const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("agenticcrew", {
  invoke(command, args) {
    return ipcRenderer.invoke("agenticcrew:invoke", { args, command });
  }
});
