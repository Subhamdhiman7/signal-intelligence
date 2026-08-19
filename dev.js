import { spawn } from "node:child_process";
import process from "node:process";

const server = spawn(process.execPath, ["server.js"], {
  stdio: "inherit",
  windowsHide: false,
});

const viteCommand = process.platform === "win32"
  ? ["cmd.exe", ["/d", "/s", "/c", "node_modules\\.bin\\vite.cmd"]]
  : ["node_modules/.bin/vite", []];

const vite = spawn(viteCommand[0], viteCommand[1], {
  stdio: "inherit",
  windowsHide: false,
});

function shutdown() {
  if (!server.killed) server.kill();
  if (!vite.killed) vite.kill();
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
process.on("exit", shutdown);
server.on("exit", (code) => {
  if (code && code !== 0) vite.kill();
});
vite.on("exit", (code) => {
  if (code && code !== 0) server.kill();
});
