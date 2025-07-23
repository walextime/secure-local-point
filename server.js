const http = require("http");
const path = require("path");
const fs = require("fs");
const { exec } = require("child_process"); // For opening the browser

const PORT = process.env.PORT || 3000; // You can change this port
const PUBLIC_DIR = path.join(__dirname, "dist"); // Path to your built React app (change 'dist' if different)

const server = http.createServer((req, res) => {
  let filePath = path.join(
    PUBLIC_DIR,
    req.url === "/" ? "index.html" : req.url
  );

  // Determine the content type based on file extension
  const extname = String(path.extname(filePath)).toLowerCase();
  const mimeTypes = {
    ".html": "text/html",
    ".js": "text/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".png": "image/png",
    ".jpg": "image/jpg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".wav": "audio/wav",
    ".mp4": "video/mp4",
    ".woff": "application/font-woff",
    ".ttf": "application/font-ttf",
    ".eot": "application/vnd.ms-fontobject",
    ".otf": "application/font-otf",
    ".wasm": "application/wasm",
  };

  const contentType = mimeTypes[extname] || "application/octet-stream";

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === "ENOENT") {
        // File not found (e.g., for client-side routing), serve index.html
        fs.readFile(path.join(PUBLIC_DIR, "index.html"), (err, content) => {
          if (err) {
            res.writeHead(500);
            res.end("Error serving index.html: " + err.code + " ..\n");
            res.end();
          } else {
            res.writeHead(200, { "Content-Type": "text/html" });
            res.end(content, "utf-8");
          }
        });
      } else {
        res.writeHead(500);
        res.end("Server error: " + error.code + " ..\n");
        res.end();
      }
    } else {
      res.writeHead(200, { "Content-Type": contentType });
      res.end(content, "utf-8");
    }
  });
});

server.listen(PORT, () => {
  const serverUrl = `http://localhost:${PORT}`;
  console.log(`Server running at ${serverUrl}`);

  // Open in default web browser based on OS
  let command;
  if (process.platform === "darwin") {
    // macOS
    command = `open ${serverUrl}`;
  } else if (process.platform === "win32") {
    // Windows
    command = `start ${serverUrl}`;
  } else {
    // Linux and others
    command = `xdg-open ${serverUrl}`;
  }

  exec(command, (err) => {
    if (err) {
      console.error(`Failed to open browser: ${err.message}`);
    }
  });
});
