import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";

const root = new URL(".", import.meta.url);
const output = new URL("./dist/server/", root);
const supportedExtensions = new Set([".html", ".css", ".js"]);
const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8"
};

const files = (await readdir(root, { withFileTypes: true }))
  .filter((entry) => entry.isFile() && supportedExtensions.has(extname(entry.name)))
  .map((entry) => entry.name);

const assets = {};

for (const file of files) {
  const body = await readFile(new URL(file, root), "utf8");
  assets[`/${file}`] = {
    body,
    type: contentTypes[extname(file)]
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

    return new Response(request.method === "HEAD" ? null : asset.body, {
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
