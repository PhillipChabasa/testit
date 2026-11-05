import { mkdir, copyFile, cp } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const root = new URL("../../legacy/", import.meta.url);
const target = new URL("../public/legacy/", import.meta.url);
await mkdir(target, { recursive: true });
for (const name of [
  "index.html",
  "auth.html",
  "404.html",
  "sw.js",
  "manifest.json",
  "qbank-core.js",
  "qbank.js",
  "qbank.css",
]) {
  await copyFile(new URL(name, root), new URL(name, target));
}
await cp(
  fileURLToPath(new URL("icons/", root)),
  fileURLToPath(new URL("icons/", target)),
  { recursive: true },
);
console.log("Preserved application copied into the compatibility route.");
await copyFile(
  new URL("auth.html", root),
  new URL("../public/auth.html", import.meta.url),
);
await copyFile(
  new URL("404.html", root),
  new URL("../public/404.html", import.meta.url),
);
await cp(
  fileURLToPath(new URL("icons/", root)),
  fileURLToPath(new URL("../public/icons/", import.meta.url)),
  { recursive: true },
);
