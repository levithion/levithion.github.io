import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";

const root = new URL(".", import.meta.url);
const output = new URL("./dist/server/", root);
const supportedExtensions = new Set([".html", ".css", ".js", ".png", ".jpg", ".jpeg", ".webp"]);
const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp"
};

const collectFiles = async (directory, prefix = "") => {
  const entries = await readdir(directory, { withFileTypes: true });
  const collected = [];

  for (const entry of entries) {
    if ([".git", "dist", "node_modules"].includes(entry.name)) continue;
    const relativePath = join(prefix, entry.name);
    if (entry.isDirectory()) {
      collected.push(...await collectFiles(new URL(`${relativePath}/`, root), relativePath));
    } else if (supportedExtensions.has(extname(entry.name))) {
      collected.push(relativePath);
    }
  }

  return collected;
};

const files = await collectFiles(root);

const assets = {};

for (const file of files) {
  const extension = extname(file);
  const isText = [".html", ".css", ".js"].includes(extension);
  const buffer = await readFile(new URL(file, root));
  if (!isText && buffer.byteLength > 600_000) continue;
  assets[`/${file}`] = {
    body: isText ? buffer.toString("utf8") : buffer.toString("base64"),
    type: contentTypes[extension],
    encoding: isText ? "text" : "base64"
  };
}

const worker = `const assets = ${JSON.stringify(assets)};

export default {
  async fetch(request) {
    const url = new URL(request.url);
    let pathname = decodeURIComponent(url.pathname);

    if (pathname === "/") pathname = "/index.html";
    if (!pathname.includes(".") && assets[\`\${pathname}.html\`]) {
      pathname = \`\${pathname}.html\`;
    }

    const asset = assets[pathname];

    if (!asset) {
      return new Response("Not found", {
        status: 404,
        headers: { "content-type": "text/plain; charset=utf-8" }
      });
    }

    const body = asset.encoding === "base64"
      ? Uint8Array.from(atob(asset.body), character => character.charCodeAt(0))
      : asset.body;

    return new Response(request.method === "HEAD" ? null : body, {
      headers: {
        "content-type": asset.type,
        "cache-control": asset.type.startsWith("text/html")
          ? "public, max-age=0, must-revalidate"
          : "public, max-age=3600"
      }
    });
  }
};
`;

await rm(new URL("./dist/", root), { recursive: true, force: true });
await mkdir(output, { recursive: true });
await writeFile(join(output.pathname, "index.js"), worker);

console.log(`Built ${files.length} portfolio assets.`);
