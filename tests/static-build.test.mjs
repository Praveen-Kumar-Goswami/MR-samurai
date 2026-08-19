import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import test from "node:test";

const dist = new URL("../dist/", import.meta.url);

test("builds the complete RONIN static experience", async () => {
  const html = await readFile(new URL("index.html", dist), "utf8");
  assert.match(html, /<title>RONIN — The Path Never Ends<\/title>/i);
  assert.match(html, /name="description"/i);
  assert.match(html, /property="og:image" content="\/og\.png"/i);
  assert.match(html, /name="twitter:card" content="summary_large_image"/i);
  assert.match(html, /<div id="root"><\/div>/i);

  const assets = await readdir(new URL("assets/", dist));
  const scripts = assets.filter((name) => name.endsWith(".js"));
  assert.ok(scripts.length > 0, "expected a compiled JavaScript bundle");
  const bundle = (
    await Promise.all(
      scripts.map((name) => readFile(new URL(`assets/${name}`, dist), "utf8")),
    )
  ).join("\n");
  assert.match(bundle, /RONIN/);
  assert.match(bundle, /THE WARRIOR/);
  assert.match(bundle, /\/media\/good\.mp4/);
  assert.match(bundle, /\/media\/image\.png/);
});

test("copies every production media asset", async () => {
  await Promise.all([
    access(new URL("media/good.mp4", dist)),
    access(new URL("media/image.png", dist)),
    access(new URL("og.png", dist)),
    access(new URL("favicon.svg", dist)),
  ]);
});
