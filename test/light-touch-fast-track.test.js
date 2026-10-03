"use strict";
// Suite v3.9.6 simulation finding: Light-touch needs an all-No Fast-Track Screening
// (AIG-INV-02) that the rest of the profile does not contradict (Playbook §3.8.2.1;
// AIG-DEC-01 Gate Map).
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const logic = require("../src/triage-logic.js");

const agpi = { resident: 1, trust: 2, legal: 2, visibility: 2, strategic: 1, oversight: 1 };
const impacts = { residentImpact: 1, legalImpact: 2, reputationImpact: 2, operationalImpact: 1, financialImpact: 1 };
function profile(o) {
  return {
    situation: "New use", registerId: "AIR-SIM1", ucId: "UC-SIM-02", ucIdStatus: "Provisional — operator-entered, unverified",
    systemName: "Copilot (fictional)", purpose: "Assistant", usePurpose: "Meeting-notes summary", serviceArea: "Customer Services",
    serviceOwner: "Owner", supplierDeveloper: "Supplier", source: "Embedded in platform / supplier feature", capability: "Generative AI",
    actionAuthority: "None — outputs only", systemsAccessed: "", lifecycle: "Idea", dataType: "None",
    procurementRoute: "Existing contract or licence", affectsIndividuals: "No", publicFacing: "No", dateFirstUsed: "", ...o,
  };
}
const run = (p) => logic.calculateTriage({
  profile: p, agpiScores: agpi, impactScores: impacts, likelihood: 2, control: 2,
  controlEvidence: "Not evidenced — planned or unverified", triggerIds: [], agentic: null,
});

test("no Fast Track recorded: never Light-touch, and the reason says so", () => {
  const p = profile({});
  const r = run(p);
  assert.equal(r.effectiveTierName, "Low");
  assert.equal(logic.fastTrackOf(p), logic.FAST_TRACK.notDone);
  assert.equal(logic.isLightTouch(p, r), false);
  assert.match(logic.lightTouchBlockReason(p, r), /No Fast-Track Screening/);
});

test("Fast Track with a Yes or Unsure: Standard route at Low, not Light-touch", () => {
  const p = profile({ fastTrack: "One or more Yes or Unsure" });
  const r = run(p);
  assert.equal(logic.isLightTouch(p, r), false);
  assert.match(logic.lightTouchBlockReason(p, r), /at least one Yes or Unsure/);
  assert.equal(logic.paperRoute ? logic.paperRoute(p, r) : "Standard", "Standard");
});

test("all-No Fast Track contradicted by personal data (Q2) is not Light-touch (Copilot simulation)", () => {
  const p = profile({ fastTrack: "All ten No", dataType: "Personal data" });
  const r = run(p);
  assert.equal(logic.isLightTouch(p, r), false);
  assert.match(logic.lightTouchBlockReason(p, r), /Q2/);
});

test("all-No Fast Track on a genuinely low use is Light-touch", () => {
  const p = profile({ fastTrack: "All ten No" });
  const r = run(p);
  assert.equal(logic.isLightTouch(p, r), true);
  assert.equal(logic.lightTouchBlockReason(p, r), "");
});

test("a Medium use is never a Light-touch candidate, so no Fast-Track reason is shown", () => {
  const p = profile({ fastTrack: "All ten No" });
  const r = logic.calculateTriage({ profile: p, agpiScores: agpi, impactScores: { ...impacts, residentImpact: 4 }, likelihood: 3,
    control: 2, controlEvidence: "Not evidenced — planned or unverified", triggerIds: [], agentic: null });
  assert.notEqual(r.effectiveTierName, "Low");
  assert.equal(logic.lightTouchBlockReason(p, r), "");
});

test("the page asks for the Fast-Track outcome", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  assert.match(html, /<select id="fastTrack">/);
  for (const v of Object.values(logic.FAST_TRACK)) assert.ok(html.includes(`<option>${v}</option>`), v);
});
