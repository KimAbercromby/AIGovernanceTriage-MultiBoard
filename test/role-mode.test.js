const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

// The Service Owner and AI Governance Lead views (src/role-mode.js). The layer only
// changes what is shown and how questions are worded; it must never change values,
// option text or calculations.
const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const src = fs.readFileSync(path.join(root, "src", "role-mode.js"), "utf8");
const app = fs.readFileSync(path.join(root, "src", "triage-app.js"), "utf8");

const soFields = Object.keys(
  Function(`return ${src.match(/const SERVICE_OWNER_FIELDS = (\{[\s\S]*?\});/)[1]}`)()
);

test("role-mode is embedded in index.html and built from src", () => {
  assert.match(html, /<script id="role-mode">[\s\S]*SERVICE_OWNER_FIELDS[\s\S]*<\/script>/);
});

test("every Service Owner question is a real Step 1 profile field", () => {
  const profileIds = app.match(/const profileFieldIds = \[([\s\S]*?)\];/)[1].match(/"([A-Za-z]+)"/g).map((s) => s.slice(1, -1));
  for (const id of soFields) {
    assert.ok(profileIds.includes(id), `${id} is not a profile field`);
    assert.match(html, new RegExp(`id="${id}"`));
  }
});

test("Service Owners answer facts only: no scoring, routing or identifier-issuing fields", () => {
  for (const id of ["fastTrack", "ucId", "ucIdStatus", "systemApproval"]) assert.ok(!soFields.includes(id), id);
  assert.match(html, /body\.role-so #priority/);
  assert.match(html, /body\.role-so #risk/);
  assert.match(html, /body\.role-so #route/);
  assert.match(html, /body\.role-so #agenticStep/);
});

test("the three required facts match the tool's own export check", () => {
  assert.match(src, /const REQUIRED = \["systemName", "purpose", "usePurpose"\];/);
  assert.match(app, /const required = \[byId\("systemName"\), byId\("purpose"\), byId\("usePurpose"\)\];/);
});

test("the layer never rewrites option text or values on load", () => {
  assert.doesNotMatch(src, /option[^\n]*\.(text|textContent|innerHTML)\s*=/i);
  // Loaded select values must match an existing option, and a malformed AIR-ID is not filled.
  assert.match(src, /optionMatches\(el, value\)/);
  assert.match(src, /\/\^AIR-\[A-Z0-9\]\{4\}\/i/);
});

test("the answers file is labelled as facts, not a triage result or decision", () => {
  assert.match(src, /kind: FILE_KIND/);
  assert.match(src, /they are not a triage result, a score or a decision/);
});
