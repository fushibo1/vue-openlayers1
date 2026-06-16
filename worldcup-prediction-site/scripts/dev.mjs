import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, normalize, resolve, sep } from "node:path";
import { createServer } from "node:http";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = new Map();

for (let index = 2; index < process.argv.length; index += 1) {
  const arg = process.argv[index];
  if (arg.startsWith("--")) {
    args.set(arg.slice(2), process.argv[index + 1]);
    index += 1;
  }
}

const port = Number(args.get("port") || 5174);
const rootArg = args.get("root");
const staticRoot = rootArg ? resolve(projectRoot, rootArg) : projectRoot;

const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".json": "application/json; charset=utf-8"
};

function findSourceFile(requestPath) {
  const cleaned = normalize(requestPath === "/" ? "/index.html" : requestPath).replace(/^([/\\])+/, "");
  const candidates = rootArg
    ? [resolve(staticRoot, cleaned)]
    : [
        resolve(projectRoot, "src", cleaned),
        resolve(projectRoot, cleaned)
      ];

  for (const candidate of candidates) {
    const allowedRoot = rootArg ? staticRoot : projectRoot;
    const insideRoot = candidate === allowedRoot || candidate.startsWith(allowedRoot + sep);
    if (!insideRoot) return null;
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

const server = createServer((request, response) => {
  const requestPath = decodeURIComponent((request.url || "/").split("?")[0]);
  const filePath = findSourceFile(requestPath);

  if (!filePath) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  response.writeHead(200, {
    "Content-Type": mime[extname(filePath)] || "application/octet-stream",
    "Cache-Control": "no-store"
  });
  createReadStream(filePath).pipe(response);
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Serving http://127.0.0.1:${port}/`);
});
