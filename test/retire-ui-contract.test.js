const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const triageApp = fs.readFileSync(path.join(root, "src", "triage-app.js"), "utf8");
const retireApp = fs.readFileSync(path.join(root, "src", "retire-app.js"), "utf8");

test("retire mode hides the unrelated triage step navigation", () => {
  assert.match(retireApp, /stepNav\.hidden = retiring/);
  assert.match(html, /\.step-nav\[hidden\]\s*\{\s*display:\s*none;\s*\}/);
});

test("agency export availability references buttons that exist in the page", () => {
  const match = triageApp.match(/const agencyExportIds = \[([^\]]+)\]/);
  assert.ok(match, "agency export button list is present");
  const ids = [...match[1].matchAll(/"([^"]+)"/g)].map((entry) => entry[1]);
  assert.equal(ids.length, 3);
  for (const id of ids) {
    assert.ok(html.includes(`id="${id}"`), `missing agency export button: ${id}`);
  }
});