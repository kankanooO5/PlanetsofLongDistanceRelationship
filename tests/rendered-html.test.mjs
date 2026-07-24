import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

test("ships the Two Planets product instead of the starter", async () => {
  const [page, layout, manifest, hosting] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/manifest.ts", import.meta.url), "utf8"),
    readFile(new URL("../.openai/hosting.json", import.meta.url), "utf8"),
  ]);

  assert.match(page, /两颗星球/);
  assert.match(page, /进入我们的小宇宙/);
  assert.match(page, /想你了/);
  assert.match(page, /写给彼此的话/);
  assert.match(page, /以后一起完成/);
  assert.match(layout, /只属于我们的空间/);
  assert.match(layout, /og\.png/);
  assert.match(manifest, /standalone/);
  assert.match(hosting, /"d1": "DB"/);
  assert.doesNotMatch(page, /codex-preview|SkeletonPreview/);

  await Promise.all([
    access(new URL("../public/icon-192.png", import.meta.url)),
    access(new URL("../public/icon-512.png", import.meta.url)),
    access(new URL("../public/og.png", import.meta.url)),
    access(new URL("../dist/server/index.js", import.meta.url)),
  ]);
});
