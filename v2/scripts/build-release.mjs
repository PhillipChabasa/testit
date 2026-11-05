import { readdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const dist = new URL("../dist/", import.meta.url);
const assets = (await readdir(new URL("assets/", dist)))
  .sort()
  .map((name) => "./assets/" + name);
const shell = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  ...assets,
];
const version = createHash("sha256")
  .update(await readFile(new URL("index.html", dist)))
  .digest("hex")
  .slice(0, 16);
const template = await readFile(
  new URL("service-worker.template.js", import.meta.url),
  "utf8",
);
await writeFile(
  new URL("sw.js", dist),
  template
    .replace("__CACHE_NAME__", JSON.stringify("testit2-shell-" + version))
    .replace("__SHELL_URLS__", JSON.stringify(shell)),
);
console.log(
  "Versioned offline shell generated; updates require a safe reload.",
);
