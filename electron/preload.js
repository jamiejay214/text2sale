// Runs in an isolated context before the page loads. Kept intentionally
// minimal — the Command Center is a normal web app, so we expose nothing
// privileged. A tiny flag lets the page know it's running inside the desktop
// shell if it ever wants to adapt the UI.
const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("commandCenterDesktop", {
  isDesktop: true,
  platform: process.platform,
  version: process.versions.electron,
});
