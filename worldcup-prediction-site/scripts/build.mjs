import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const distDir = join(projectRoot, "dist");

const copyFile = (from, to) => {
  mkdirSync(dirname(to), { recursive: true });
  copyFileSync(from, to);
};

const copyDir = (from, to) => {
  if (!existsSync(from)) return;
  mkdirSync(to, { recursive: true });
  for (const entry of readdirSync(from, { withFileTypes: true })) {
    const fromPath = join(from, entry.name);
    const toPath = join(to, entry.name);
    if (entry.isDirectory()) {
      copyDir(fromPath, toPath);
    } else if (entry.isFile()) {
      copyFile(fromPath, toPath);
    }
  }
};

const requiredFiles = [
  "src/index.html",
  "src/app.js",
  "src/styles.css",
  "data/content.js",
  "assets/stadium-hero.png"
];

for (const file of requiredFiles) {
  const filePath = join(projectRoot, file);
  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    throw new Error(`Missing required file: ${file}`);
  }
}

rmSync(distDir, { recursive: true, force: true });
mkdirSync(distDir, { recursive: true });

copyFile(join(projectRoot, "src/index.html"), join(distDir, "index.html"));
copyFile(join(projectRoot, "src/app.js"), join(distDir, "app.js"));
copyFile(join(projectRoot, "src/styles.css"), join(distDir, "styles.css"));
copyDir(join(projectRoot, "assets"), join(distDir, "assets"));
copyDir(join(projectRoot, "data"), join(distDir, "data"));

console.log(`Built ${distDir}`);
