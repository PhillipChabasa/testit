import { cp, readFile, writeFile } from "node:fs/promises";
const root = new URL("../../", import.meta.url),
  dist = new URL("../dist/", import.meta.url);
const html = await readFile(new URL("index.html", dist), "utf8");
if (!html.includes("assets/index-"))
  throw Error("Build React before staging release.");
await cp(dist, root, { recursive: true, force: true });
await writeFile(new URL(".nojekyll", root), "");
console.log(
  "Tested static build staged at repository root. Source remains in v2/; fallback remains in legacy/.",
);
