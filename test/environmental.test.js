const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const logic = require("../src/triage-logic.js");

const f = (foundationModels, intensity, supplierPractices, cloudBased = "yes") =>
  logic.environmentalFlag({ foundationModels, cloudBased, intensity, supplierPractices }).flag;

test("§4.3.15 Green: no foundation model, low or medium intensity, practices disclosed", () => {
  assert.equal(f("no", "Low", "yes"), "Green");
  assert.equal(f("no", "Medium", "yes", "no"), "Green");
});
test("§4.3.15 Amber: any one of foundation model, high or very high intensity, practices not disclosed or unknown", () => {
  assert.equal(f("yes", "Low", "yes"), "Amber");
  assert.equal(f("no", "High", "yes"), "Amber");
  assert.equal(f("no", "Very High", "no"), "Amber");
  assert.equal(f("no", "Low", "unknown"), "Amber");
  assert.equal(f("yes", "High", "no"), "Amber");
  assert.equal(f("yes", "Very High", "yes"), "Amber");
});
test("§4.3.15 Red: foundation model at very high intensity, practices not disclosed", () => {
  assert.equal(f("yes", "Very High", "no"), "Red");
  assert.equal(f("yes", "Very High", "unknown"), "Red");
});
test("no flag until all four questions are answered", () => {
  const r = logic.environmentalFlag({ foundationModels: "yes", cloudBased: "", intensity: "Low", supplierPractices: "yes" });
  assert.equal(r.complete, false);
  assert.equal(r.flag, "");
});
test("environmental CSV keeps its six columns and is separate from the register export", () => {
  const csv = logic.buildEnvironmentalCsv({ registerId: "AIR-0001", systemName: "X" },
    { foundationModels: "yes", cloudBased: "yes", intensity: "Very High", supplierPractices: "no" });
  const lines = csv.replace(/^﻿/, "").trim().split("\r\n");
  assert.equal(lines[0], '"AIR-ID","System","Flag","Intensity","Supplier Info Needed","Notes"');
  assert.match(lines[1], /^"AIR-0001","X","Red","Very High","Yes",/);
});
test("the environmental download button is wired in the built page", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  assert.match(html, /<script id="environmental-app">[\s\S]*byId\("downloadEnvironmental"\)\.addEventListener/);
});
