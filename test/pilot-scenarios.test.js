const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const logic = require("../src/triage-logic.js");
const { SYSTEM, SCENARIOS } = require("../src/pilot-scenarios.js");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const triageApp = fs.readFileSync(path.join(root, "src", "triage-app.js"), "utf8");
const demo = fs.readFileSync(path.join(root, "src", "pilot-demo.js"), "utf8");

// Mirrors calculateAll() and governanceRoute() in src/triage-app.js.
function run(s) {
  const autonomous = ["Acts within defined bounds — monitored", "Fully autonomous"].includes(s.profile.actionAuthority);
  const triggerIds = [...s.triggers, ...(autonomous ? ["agentic"] : [])];
  const agpiScore = logic.calculateAgpi(s.agpi);
  const priority = logic.priorityFor(agpiScore);
  const risk = logic.calculateRisk(s.impacts, s.likelihood, s.control);
  const inherentTierName = logic.tierNameForScore(risk.inherent);
  const critical = triggerIds.includes("statutory") || triggerIds.includes("agentic");
  const floor = critical ? "Critical" : (triggerIds.length || s.profile.dataType === "Special category data") ? "High" : "Low";
  const tier = logic.effectiveRiskTier({ inherentTierName, residualTierName: risk.tier.name, mandatoryFloorTier: floor, controlEvidence: s.controlEvidence });
  const agentic = s.agentic ? logic.computeAgentic(s.agentic) : null;
  return { agpiScore, priority: priority.label, tier: tier.effectiveTierName, agencyTier: agentic && agentic.tierLabel };
}

test("the pilot uses one fictional AIR-ID and eleven fictional UC-IDs", () => {
  assert.match(SYSTEM.registerId, /DEMO/);
  assert.match(SYSTEM.systemName, /fictional/i);
  assert.equal(SCENARIOS.length, 11);
  assert.equal(new Set(SCENARIOS.map((s) => s.id)).size, 11);
  SCENARIOS.forEach((s) => assert.match(s.id, /^UC-DEMO-\d\d$/));
});

for (const s of SCENARIOS) {
  test(`${s.id} produces its documented outcome`, () => {
    const r = run(s);
    assert.equal(r.agpiScore, s.expected.agpiScore);
    assert.equal(r.priority, s.expected.priority);
    assert.equal(r.tier, s.expected.effectiveTier);
    if (s.expected.agencyTier) assert.equal(r.agencyTier, s.expected.agencyTier);
  });
}

test("together the scenarios cover every priority, risk tier and agency tier", () => {
  const results = SCENARIOS.map(run);
  logic.PRIORITIES.forEach((p) => assert.ok(results.some((r) => r.priority === p.label), p.label));
  ["Low", "Medium", "High", "Critical"].forEach((t) => assert.ok(results.some((r) => r.tier === t), t));
  ["T0", "T1", "T2", "T3", "T4", "T5"].forEach((t) => assert.ok(results.some((r) => r.agencyTier && r.agencyTier.startsWith(t)), t));
});

test("agentic scenarios respect the tool's autonomy minimum for their action authority", () => {
  const min = { "None — outputs only": 0, "Human approves each action": 1, "Acts within defined bounds — monitored": 2, "Fully autonomous": 3 };
  SCENARIOS.filter((s) => s.agentic).forEach((s) => {
    assert.ok(s.agentic.dimensions.autonomy >= min[s.profile.actionAuthority], s.id);
  });
});

test("demo mode blocks every export, copy and print control the tool wires up", () => {
  const blocked = new Set([...demo.match(/const EXPORT_IDS = \[([\s\S]*?)\]/)[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]));
  const wired = [...triageApp.matchAll(/byId\("([A-Za-z]+)"\)\.addEventListener\("click"/g)]
    .map((m) => m[1]).filter((id) => /^(download|copy|print)/.test(id));
  assert.ok(wired.length >= 14);
  wired.forEach((id) => assert.ok(blocked.has(id), `export not blocked in demo mode: ${id}`));
  blocked.forEach((id) => assert.ok(html.includes(`id="${id}"`), `blocked id missing from page: ${id}`));
});

test("demo data and guard are embedded in the built page", () => {
  assert.ok(html.includes('<script id="pilot-scenarios">'));
  assert.ok(html.includes('<script id="pilot-demo">'));
  assert.match(html, /Fictional demo scenario: not a Council record/);
});
