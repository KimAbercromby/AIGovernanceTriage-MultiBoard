"use strict";

// Export contract and logic tests against AI governance suite v3.9.1 (30 September 2026).
// Expected headers and controlled lists come from test/fixtures/suite-v3.9.1-contract.json,
// generated from the workbooks by scripts/extract-suite-fixture.py; each entry records
// its source file, sheet and header row.

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const logic = require("../src/triage-logic.js");
const contract = require("./fixtures/suite-v3.9.1-contract.json");

const app = fs.readFileSync(path.join(__dirname, "..", "src", "triage-app.js"), "utf8");
const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");

const letter = (i) => (i < 26 ? String.fromCharCode(65 + i) : String.fromCharCode(64 + Math.floor(i / 26)) + String.fromCharCode(65 + (i % 26)));
const columns = (spec) => spec.headers.filter((h, i) => !spec.formulaColumns.includes(letter(i)));

// Row labels ([ "label", value ] literals) in one function of src/triage-app.js.
function labelsIn(fnName, endMarker) {
  const start = app.indexOf(`function ${fnName}`);
  assert.ok(start >= 0, `${fnName} not found`);
  const body = app.slice(start, app.indexOf(endMarker, start));
  return [...body.matchAll(/^\s*\[\s*"([^"]+)"\s*,/gm)].map((m) => m[1]);
}

// Fields passed to add(<section>, "<field>", ...) in agenticGovernanceHandoffCsv.
function addedFields(section) {
  const start = app.indexOf("function agenticGovernanceHandoffCsv");
  const body = app.slice(start, app.indexOf("function agenticGovernanceExport", start));
  return [...body.matchAll(new RegExp(`add\\(${section}, "([^"]+)"`, "g"))].map((m) => m[1]);
}

function baseProfile(overrides) {
  return {
    registerId: "AIR-0001", ucId: "UC-0001", ucIdStatus: "Provisional — operator-entered, unverified",
    systemName: "Example", purpose: "Purpose", usePurpose: "Use outcome", serviceArea: "Service",
    serviceOwner: "Owner", supplierDeveloper: "", source: "Internally developed",
    capability: "Predictive AI", actionAuthority: "None — outputs only", systemsAccessed: "",
    lifecycle: "Idea", dataType: "None", procurementRequired: "No", affectsIndividuals: "No",
    publicFacing: "No", dateFirstUsed: "", ...overrides,
  };
}
const ones = (v = 1) => Object.fromEntries(logic.DIMENSIONS.map(({ id }) => [id, v]));
const impacts = (v = 1) => Object.fromEntries(logic.IMPACT_DIMENSIONS.map(({ id }) => [id, v]));
function triage({ profile = {}, agpi = ones(), impact = impacts(), likelihood = 1, control = 3, evidence = "Implemented and evidenced", triggers = [], agentic = null } = {}) {
  const p = baseProfile(profile);
  return { profile: p, results: logic.calculateTriage({ profile: p, agpiScores: agpi, impactScores: impact, likelihood, control, controlEvidence: evidence, triggerIds: triggers, agentic }) };
}

// ---- Export headers equal the v3.9.1 workbooks ---------------------------------

test("fixture records its v3.9 source for every export target", () => {
  assert.match(contract.suite, /^v3\.9\.1 /);
  for (const [key, spec] of [
    ["INV-04 AI Register", contract["INV-04"]["AI Register"]],
    ["DEC-04 Gate plan", contract["DEC-04"]["Gate plan"]],
    ["AGT-04 Agent Record", contract["AGT-04"]["Agent Record"]],
    ["INV-05 Relationships", contract["INV-05"].Relationships],
    ["UCV", contract.UCV["UC Risk and Decision View"]],
    ["OPS-02", contract["OPS-02"]["Monitoring Log"]],
  ]) {
    assert.ok(spec.source.file && spec.source.sheet && spec.source.row, key);
  }
});

test("AIG-INV-04 register handoff: one row per v3.9 column, in order, with controlled values", () => {
  const { profile, results } = triage({ profile: { dataType: "Special category data", dateFirstUsed: "2026-09-01", lifecycle: "Live" } });
  const draft = logic.buildRegisterDraftHandoff(profile, results, null);
  for (const sheet of ["AI Register", "Assessment summary"]) {
    const spec = contract["INV-04"][sheet];
    assert.deepEqual(draft.rows.filter((r) => r[0] === sheet).map((r) => r[1]), columns(spec), sheet);
    draft.rows.filter((r) => r[0] === sheet && r[3]).forEach((r) => {
      const col = letter(spec.headers.indexOf(r[1]));
      const list = spec.lists[`${col}4:${col}206`];
      if (list) assert.ok(list.includes(r[3]), `${sheet} / ${r[1]}: "${r[3]}" not in the v3.9 list`);
      assert.match(r[2], /Proposed AIG-INV-04 sheet\/field label/);
    });
  }
  const get = (f) => draft.rows.find((r) => r[1] === f)[3];
  assert.equal(get("Personal / special category data?"), "Yes — special category");
  assert.equal(get("Date first used"), "01/09/2026");
  assert.equal(get("Intake type"), "Retrospective");
  assert.equal(get("Route / pathway"), "To be determined");
  assert.deepEqual(logic.REGISTER_HEADERS, columns(contract["INV-04"]["AI Register"]));
  assert.deepEqual(logic.ASSESSMENT_HEADERS, columns(contract["INV-04"]["Assessment summary"]));
});

test("AIG-DEC-04 Gate plan rows: columns A–L exact, every value in its v3.9 dropdown", () => {
  const spec = contract["DEC-04"]["Gate plan"];
  assert.deepEqual(logic.GATE_PLAN_HEADERS, columns(spec));
  const { profile, results } = triage({ profile: { procurementRequired: "Yes", actionAuthority: "Human approves each action" } });
  const csv = logic.buildGatePlanCsv(profile, logic.buildRoute(profile, results, {}), results);
  const lines = csv.replace(/^﻿/, "").trim().split("\r\n").map((l) => l.slice(1, -1).split('","'));
  assert.deepEqual(lines[0].slice(0, 12), columns(spec));
  const rows = lines.slice(1);
  assert.deepEqual(rows.map((r) => r[2]), logic.DEC04_GATES.slice(1, 7), "one row per decision gate 1 to 6");
  rows.forEach((r) => {
    assert.ok(spec.lists["C4:C353"].includes(r[2]));
    assert.ok(spec.lists["E4:E353"].includes(r[4]));
    assert.ok(spec.lists["I4:I353"].includes(r[8]));
    assert.ok(spec.lists["L4:L353"].includes(r[11]));
  });
  assert.deepEqual(logic.DEC04_GATES, spec.lists["C4:C353"]);
});

test("AIG-DEC-04 retirement handoff uses the v3.9 sheet names, columns and lists", () => {
  const handoff = logic.buildRetirementGateLogRow({
    systemName: "Legacy", registerId: "AIR-0001", retireScope: "Named use(s) only — UC-ID specific", ucIds: "UC-1",
    decision: "Decommission", eventDate: "2026-10-01", forum: "Retirement officer", decommissionDate: "2026-11-01",
    monitoringClosure: "To be closed",
  });
  for (const sheet of ["Gate plan", "Gate events", "Conditions"]) {
    const spec = contract["DEC-04"][sheet];
    const rows = handoff.rows.filter((r) => r[0] === `AIG-DEC-04 / ${sheet}` && !r[1].startsWith("Note"));
    const first = rows.slice(0, columns(spec).length).map((r) => r[1]);
    assert.deepEqual(first, columns(spec), sheet);
    rows.filter((r) => r[3]).forEach((r) => {
      const col = letter(spec.headers.indexOf(r[1]));
      const key = Object.keys(spec.lists).find((k) => k.startsWith(`${col}4:`));
      if (key) assert.ok(spec.lists[key].includes(r[3]), `${sheet} / ${r[1]}: "${r[3]}"`);
    });
  }
  const outcome = handoff.rows.find((r) => r[1] === "Outcome");
  assert.equal(outcome[3], "Decommission");
  assert.match(outcome[5], /AIG-DEC-03 outcome for the UC-ID: Retired/);
  const decisionOptions = logic.RETIREMENT_FIELDS.find((f) => f.id === "decision").options.filter((o) => !o.startsWith("Pending"));
  assert.deepEqual(decisionOptions, contract["DEC-04"]["Gate events"].lists["G4:G553"]);
  assert.deepEqual(logic.RETIREMENT_PRIORITIES.map((p) => p.label), contract["INV-04"]["Assessment summary"].lists["B4:B206"]);
});

test("AIG-ASS-01 AGPI pre-fill: exact column A labels in sheet order, then notes", () => {
  const labels = labelsIn("agpiPrefillCsv", "return fieldValueCsv(rows");
  const ass01 = contract["ASS-01"]["AGPI Triage"].labels;
  const expected = [5, 6, 7, 8, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22].map((r) => ass01[String(r)]);
  assert.deepEqual(labels.slice(0, expected.length), expected);
  assert.ok(labels.slice(expected.length).every((l) => l.startsWith("Note (not a field)")));
  assert.match(app, /\["Assessment scope \(UC-ID specific \/ Shared system baseline\)", "UC-ID specific"\]/);
  assert.ok(contract["ASS-01"]["AGPI Triage"].lists.B18.includes("UC-ID specific"));
});

test("AGPI priority wording is the v3.9 urgency wording (AIG-ASS-01 B34:B38)", () => {
  assert.deepEqual(
    logic.PRIORITIES.map((p) => `${p.label}: ${p.action.replace(/Playbook §3\.10\.1/g, "Playbook §3.10.1")}`),
    contract["ASS-01"]["AGPI Triage"].priorityAttention.values,
  );
});

test("AIG-ASS-02 Triage Import pre-fill rows match A5:A63 exactly", () => {
  const labels = labelsIn("riskPrefillCsv", "return fieldValueCsv(rows");
  const expected = Object.values(contract["ASS-02"]["Triage Import"].labels);
  assert.equal(expected.length, 59);
  assert.deepEqual(labels.slice(0, 59), expected);
});

test("AIG-AGT-04 Agent Record handoff lists every v3.9 column (row 4) in order", () => {
  const labels = labelsIn("agentRecordPrefillCsv", "return logic.toCsv(");
  const expected = columns(contract["AGT-04"]["Agent Record"]);
  assert.equal(expected.length, 62, "63 columns less the formula-owned Record QA");
  assert.deepEqual(labels.slice(0, expected.length), expected);
  assert.ok(labels.slice(expected.length).every((l) => l.startsWith("Note (not a column)")));
});

test("AIG-AGT-04 Capability Vector CSV headers equal row 4 (A–U) exactly", () => {
  const start = app.indexOf("const headers = [", app.indexOf("function capabilityVectorPrefillCsv"));
  const block = app.slice(start, app.indexOf("];", start));
  const headers = [...block.matchAll(/"([^"\n]+)"/g)].map((m) => m[1]);
  assert.deepEqual(headers, contract["AGT-04"]["Capability Vector"].headers);
  assert.match(app, /\[\.\.\.headers, "", "Guidance only, do not paste: field\/value status"\]/);
});

test("agentic governance handoff uses exact v3.9 field names and controlled values", () => {
  const triageImport = Object.values(contract["ASS-02"]["Triage Import"].labels);
  addedFields("risk").forEach((f) => assert.ok(triageImport.includes(f), `Triage Import: ${f}`));
  const record = contract["AGT-04"]["Agent Record"].headers;
  addedFields("record").filter((f) => !f.startsWith("Note")).forEach((f) => assert.ok(record.includes(f), `Agent Record: ${f}`));
  const vector = contract["AGT-04"]["Capability Vector"].headers;
  addedFields("vector").forEach((f) => assert.ok(vector.includes(f), `Capability Vector: ${f}`));
  logic.CAPABILITY_VECTOR.forEach((c) => assert.ok(vector.includes(c), c));
  const authority = contract["AGT-04"]["Authority & Delegations"].headers;
  addedFields("authority").forEach((f) => assert.ok(authority.includes(f), `Authority & Delegations: ${f}`));
  const ops = contract["OPS-02"]["Monitoring Log"];
  addedFields("monitoring").forEach((f) => assert.ok(ops.headers.includes(f), `Monitoring Log: ${f}`));
  assert.match(app, /add\(monitoring, "Metric Category", "Security"/);
  assert.ok(ops.lists["F5:F2000"].includes("Security"));
  const agt06 = contract["AGT-06"].fields;
  addedFields("actions").forEach((f) => assert.ok(agt06.includes(f), `AGT-06: ${f}`));
  assert.deepEqual(contract["AGT-04"]["Runtime Controls"].controlIds, ["ASI01", "ASI02", "ASI03", "ASI04", "ASI05", "ASI06", "ASI07", "ASI08", "ASI09", "ASI10"]);
  assert.match(app, /"ASI01 Agent Goal Hijack"/);
  logic.AGENCY_TIERS.forEach((t) => assert.ok(contract["AGT-04"]["Agent Record"].lists["M5:M203"].includes(t), t));
  [0, 1, 2, 3, 4, 5].forEach((n) => assert.ok(contract["AGT-04"]["Agent Record"].lists["L5:L203"].includes(logic.autonomyLabel(n))));
});

test("AIG-INV-05 and UC current view handoff rows equal the v3.9 columns with in-list values", () => {
  const { profile, results } = triage();
  const handoff = logic.buildCapabilitiesMapHandoff(profile, results);
  const ucv = contract.UCV["UC Risk and Decision View"];
  const rows = handoff.rows.filter((r) => r[0].startsWith("UC_ID_Risk_Decision_Current_View"));
  assert.deepEqual(rows.map((r) => r[1]), columns(ucv));
  rows.filter((r) => r[2]).forEach((r) => {
    const col = letter(ucv.headers.indexOf(r[1]));
    const key = Object.keys(ucv.lists).find((k) => k.startsWith(`${col}4:`));
    if (key) assert.ok(ucv.lists[key].includes(r[2]), `UCV / ${r[1]}: "${r[2]}"`);
  });
  assert.equal(rows.find((r) => r[1] === "AGPI priority (UC-specific)")[2], results.priority.label);
  assert.ok(handoff.rows.some((r) => r[0].endsWith("/ Relationships") && r[1] === "Map Edge ID"));
});

test("AIG-DEC-02 decision paper handoff uses the template's own field labels, in order", () => {
  const d = contract["DEC-02"];
  const expected = [
    ...d.headerBlock, d.decisionRequired,
    ...["AGPI Priority", "Risk tier", "Escalation", "Route"].map((x) => `${d.triageHeadline}: ${x}`),
    ...d.ucTable, d.recommendation, d.bearing, d.conditionsProposed, d.fullEvidence, d.decision,
  ];
  assert.deepEqual(logic.DEC02_HEADERS, expected);
  ["AGPI Priority", "Risk tier", "Escalation", "Route"].forEach((x) => assert.ok(d.triageHeadlineText.includes(x)));
  const { profile, results } = triage({ profile: { actionAuthority: "Human approves each action" } });
  const csv = logic.buildDecisionReadyHandoff({ profile, results, route: logic.buildRoute(profile, results, {}) });
  const first = csv.replace(/^﻿/, "").split("\r\n")[1].slice(1, -1).split('","');
  assert.equal(first[3], "1 of route");
  assert.equal(first[7], "Priority 5 (Observe)");
  assert.equal(first[10], "Enhanced / Agentic");
});

test("stated suite and artefact versions match the v3.9.1 Artefact Index (AIG-GOV-03)", () => {
  assert.equal(logic.SUITE.release, "v3.9.1");
  const index = contract.versions;
  const byId = {
    "AIG-GOV-02 Playbook": "AIG-GOV-02", "AIG-GOV-03 Artefact Index": "AIG-GOV-03",
    "AIG-INV-04 AI Register": "AIG-INV-04", "AIG-INV-05 Capabilities and System Map": "AIG-INV-05",
    "AIG-ASS-01 AGPI Triage Tool": "AIG-ASS-01", "AIG-ASS-02 AI Risk Assessment Worksheet": "AIG-ASS-02",
    "AIG-ASS-11 AI Security Review Checklist": "AIG-ASS-11", "AIG-DEC-01 Gate Map": "AIG-DEC-01",
    "AIG-DEC-02 Decision-Ready Paper": "AIG-DEC-02", "AIG-DEC-03 Governance Decision Record": "AIG-DEC-03",
    "AIG-DEC-04 Gate Log": "AIG-DEC-04", "AIG-AGT-02 Agentic Classification Reference": "AIG-AGT-02",
    "AIG-AGT-03 Agentic Triage": "AIG-AGT-03", "AIG-AGT-04 Agent Record (ASBOM)": "AIG-AGT-04",
    "AIG-AGT-06 Agentic Action / Decision Record": "AIG-AGT-06", "AIG-OPS-01 Deployment and Rollout Plan": "AIG-OPS-01",
    "AIG-OPS-02 Monitoring and Review Log": "AIG-OPS-02",
  };
  for (const [name, id] of Object.entries(byId)) {
    assert.ok(index[id].startsWith(`v${logic.SUITE.versions[name]}`), `${name}: tool ${logic.SUITE.versions[name]}, index ${index[id]}`);
  }
  assert.equal(Object.keys(byId).length, Object.keys(logic.SUITE.versions).length - 1); // all but the UC-ID view (not indexed)
  assert.match(html, /Aligned to AI governance suite v3\.9\.1 \(30 September 2026\): Playbook 19\.9\.11/);
});

// ---- v3.8 / v3.9 logic rules ---------------------------------------------------

// AIG-ASS-01 B17 reimplemented from the workbook formula (valid, complete inputs).
function ass01B17(c) {
  const w = [0.25, 0.2, 0.2, 0.15, 0.1, 0.1];
  const d16 = c.reduce((sum, v, i) => sum + ((v - 1) / 4) * w[i] * 100, 0);
  if (d16 >= 80) return "Priority 1 – Critical";
  if (d16 >= 60 || c[0] === 5 || c[2] === 5) return "Priority 2 – High";
  if (d16 >= 40) return "Priority 3 – Standard";
  if (d16 >= 20) return "Priority 4 – Routine";
  return "Priority 5 – Observe";
}

test("AGPI priority equals AIG-ASS-01 B17 (with the Resident/Legal floor) for all 15,625 score sets", () => {
  const ids = logic.DIMENSIONS.map((d) => d.id);
  let checked = 0;
  const walk = (i, acc) => {
    if (i === 6) {
      const scores = Object.fromEntries(ids.map((id, k) => [id, acc[k]]));
      const p = logic.governancePriority(logic.calculateAgpi(scores), scores, []);
      assert.equal(p.ass01Label, ass01B17(acc));
      assert.equal(p.label, ass01B17(acc));
      checked += 1;
      return;
    }
    for (let v = 1; v <= 5; v += 1) walk(i + 1, [...acc, v]);
  };
  walk(0, []);
  assert.equal(checked, 15625);
});

test("a use with a §4.4.6 trigger cannot be Priority 5; the floor note matches AIG-ASS-01 B21", () => {
  const p = logic.governancePriority(0, ones(), ["novel"]);
  assert.equal(p.label, "Priority 4 – Routine");
  assert.equal(p.ass01Label, "Priority 5 – Observe");
  assert.ok(p.overrideApplied);
  const floored = logic.governancePriority(logic.calculateAgpi({ ...ones(), resident: 5 }), { ...ones(), resident: 5 }, []);
  assert.equal(floored.label, "Priority 2 – High");
  assert.equal(floored.floorNote, "Priority floor applied: Resident/Legal = 5 (AGPI band Priority 4 – Routine raised to Priority 2 – High)");
});

// AIG-ASS-02 Risk Assessment C38, C41, C42 and C43 reimplemented from the workbook
// formulas; the agentic floor (row 82) is passed in as its value.
function ass02C43({ L, I, C, evidenced, verified, triggers, agentic, c82 = "None" }) {
  const inherent = L * I;
  const inherentTier = inherent >= 16 ? "Critical" : inherent >= 11 ? "High" : inherent >= 6 ? "Medium" : "Low";
  const residual = inherent * (C / 5);
  const residualTier = residual > 15 ? "Critical" : residual > 10 ? "High" : residual > 5 ? "Medium" : "Low";
  const eligible = evidenced && (!["High", "Critical"].includes(inherentTier) || verified);
  const floor = triggers.includes("statutory") || agentic !== "No" ? "Critical" : triggers.length ? "High" : "Low";
  const order = ["Low", "Medium", "High", "Critical"];
  const idx = Math.max(
    order.indexOf(eligible ? residualTier : inherentTier),
    order.indexOf(floor),
    c82 === "Critical" ? 3 : c82 === "High" ? 2 : 0,
    I === 5 ? 1 : 0,
  );
  return order[idx];
}

test("governing tier equals AIG-ASS-02 C43 over the risk grid (L, I, C, control evidence, trigger floors)", () => {
  const evidences = [
    ["Not evidenced — planned or unverified", false, false],
    ["Implemented and evidenced", true, false],
    ["Implemented, evidenced and independently verified", true, true],
  ];
  const triggerSets = [[], ["novel"], ["statutory"]];
  let n = 0;
  for (let L = 1; L <= 5; L += 1) for (let I = 1; I <= 5; I += 1) for (let C = 1; C <= 5; C += 1) {
    for (const [evidence, evidenced, verified] of evidences) for (const triggers of triggerSets) {
      const { results } = triage({ impact: { ...impacts(1), residentImpact: I }, likelihood: L, control: C, evidence, triggers });
      assert.equal(results.effectiveTierName, ass02C43({ L, I, C, evidenced, verified, triggers, agentic: "No" }), `L${L} I${I} C${C} ${evidence} ${triggers}`);
      n += 1;
    }
  }
  assert.equal(n, 1125);
});

test("impact floor: any confirmed Impact 5 sets at least Medium (Playbook §4.4.4 worked example)", () => {
  const { results } = triage({ impact: { ...impacts(1), financialImpact: 5 }, likelihood: 1, evidence: "Not evidenced — planned or unverified" });
  assert.equal(results.risk.inherent, 5);
  assert.equal(results.riskTierName, "Low");
  assert.equal(results.effectiveTierName, "Medium");
  assert.ok(results.impactFloorApplied);
  assert.match(results.floorReason, /Impact floor \(Severe impact\) → Medium/);
});

test("agency-tier minimum pathway: T0/T1 none, T2 Medium, T3 High, T4 High or Critical, T5 Critical", () => {
  assert.equal(logic.agencyMinimumTier(0, true), null);
  assert.equal(logic.agencyMinimumTier(1, true), null);
  assert.equal(logic.agencyMinimumTier(2, true), "Medium");
  assert.equal(logic.agencyMinimumTier(3, true), "High");
  assert.equal(logic.agencyMinimumTier(4, true), "High");
  assert.equal(logic.agencyMinimumTier(4, false), "Critical");
  assert.equal(logic.agencyMinimumTier(5, true), "Critical");
  const perAction = { actionAuthority: "Human approves each action" };
  const tierFor = (tierNum) => triage({ profile: perAction, agentic: { tierNum, tierLabel: logic.AGENCY_TIERS[tierNum] } }).results;
  assert.deepEqual([0, 1, 2, 3, 4, 5].map((n) => tierFor(n).effectiveTierName), ["Low", "Low", "Medium", "High", "High", "Critical"]);
  // Not action-capable: no agency minimum even if an assessment is passed.
  assert.equal(triage({ agentic: { tierNum: 5, tierLabel: logic.AGENCY_TIERS[5] } }).results.effectiveTierName, "Low");
  const pending = triage({ profile: perAction }).results;
  assert.ok(pending.agencyPending);
});

test("\"can it act?\" Unsure = Yes; per-action review Unsure = No → Critical floor", () => {
  const { profile, results } = triage({ profile: { actionAuthority: "Unsure — not yet confirmed" } });
  assert.equal(results.actionCapable, true);
  assert.equal(results.perActionReview, "Unsure");
  assert.ok(results.triggerIds.includes("agentic"));
  assert.equal(results.mandatoryFloorTier, "Critical");
  assert.equal(results.effectiveTierName, "Critical");
  const route = logic.buildRoute(profile, results, {});
  assert.equal(route.find((g) => g.gateNumber === 2).applicability, "Required");
  assert.match(route.find((g) => g.gateNumber === 2).decision, /Unsure, so it is treated as Yes/);
  const reviewed = triage({ profile: { actionAuthority: "Human approves each action" } }).results;
  assert.equal(reviewed.perActionReview, "Yes");
  assert.ok(!reviewed.triggerIds.includes("agentic"));
  assert.equal(reviewed.effectiveTierName, "Low");
  const special = triage({ profile: { dataType: "Special category data" } }).results;
  assert.ok(special.triggerIds.includes("specialData"));
});

test("assurance intensity follows the governing tier and triggers only (AIG-ASS-02 C45), not AGPI", () => {
  const high = triage({ agpi: ones(5) }).results;
  assert.equal(high.priority.label, "Priority 1 – Critical");
  assert.equal(high.effectiveTierName, "Low");
  assert.equal(high.assuranceIntensity, "Proportionate");
  assert.equal(logic.assuranceIntensity("High", []), "Enhanced");
  assert.equal(logic.assuranceIntensity("Medium", []), "Standard");
  assert.equal(logic.assuranceIntensity("Low", ["novel"]), "Comprehensive / immediate");
  assert.match(logic.decisionRouteFor("Low"), /the officer or forum with confirmed delegation \(Service Owner\/Service Manager only if delegated\)/);
  assert.doesNotMatch(app + JSON.stringify(logic.buildRoute(baseProfile({}), high, {})), /higher of the priority route/i);
});

test("gates follow DEC-01 v1.6: Gate 2 and Gate 6 for every action-capable use (T0 included), Gate 5 from Medium, Gate 4 if procured", () => {
  const t0 = triage({ profile: { actionAuthority: "Human approves each action" }, agentic: { tierNum: 0, tierLabel: logic.AGENCY_TIERS[0] } });
  const route = logic.buildRoute(t0.profile, t0.results, {});
  const gate = (r, n) => r.find((g) => g.gateNumber === n);
  assert.equal(t0.results.effectiveTierName, "Low");
  assert.equal(gate(route, 2).applicability, "Required");
  assert.equal(gate(route, 6).applicability, "Required");
  assert.match(gate(route, 6).decision, /grants the permitted autonomy level/);
  assert.equal(gate(route, 5).applicability, "Conditional");
  assert.equal(gate(route, 4).applicability, "Conditional");
  const low = triage();
  assert.equal(gate(logic.buildRoute(low.profile, low.results, {}), 2).applicability, "Conditional");
  const medium = triage({ impact: { ...impacts(1), residentImpact: 3 }, likelihood: 3, evidence: "Not evidenced — planned or unverified", profile: { source: "Procured" } });
  assert.equal(medium.results.effectiveTierName, "Medium");
  const mRoute = logic.buildRoute(medium.profile, medium.results, {});
  assert.equal(gate(mRoute, 5).applicability, "Required");
  assert.equal(gate(mRoute, 4).applicability, "Required");
  const assurance = route.find((g) => g.key === "assurance");
  assert.equal(assurance.gate, null);
  assert.match(assurance.decision, /does not decide/);
});

test("agency T3+ needs a Board recommendation, T4 AIG-ASS-11 before Gate 2, T5 executive escalation", () => {
  const perAction = { actionAuthority: "Human approves each action" };
  const routeFor = (n) => { const t = triage({ profile: perAction, agentic: { tierNum: n, tierLabel: logic.AGENCY_TIERS[n] } }); return logic.buildRoute(t.profile, t.results, {}); };
  assert.doesNotMatch(routeFor(2).find((g) => g.gateNumber === 2).decision, /Board recommendation/);
  assert.match(routeFor(3).find((g) => g.gateNumber === 2).decision, /formal AI Assurance Board recommendation/);
  assert.match(routeFor(4).find((g) => g.gateNumber === 2).decision, /AIG-ASS-11 security review \(ASI01–ASI10\) must be complete before this decision/);
  assert.match(routeFor(5).find((g) => g.gateNumber === 6).decision, /no consequential production use until resolved/);
});

test("v3.9: resident-facing generative AI at Medium needs the AIG-ASS-11 Section 7 adversarial test before Gate 6", () => {
  const med = triage({ profile: { capability: "Generative AI", publicFacing: "Yes" }, impact: { ...impacts(1), residentImpact: 3 }, likelihood: 3, evidence: "Not evidenced — planned or unverified" });
  assert.equal(med.results.effectiveTierName, "Medium");
  const route = logic.buildRoute(med.profile, med.results, {});
  assert.ok(route.find((g) => g.gateNumber === 6).evidence.includes(logic.ADVERSARIAL_TEST));
  assert.ok(logic.buildEvidenceList(med.profile, med.results).includes(logic.ADVERSARIAL_TEST));
  const internal = triage({ profile: { capability: "Generative AI" }, impact: { ...impacts(1), residentImpact: 3 }, likelihood: 3, evidence: "Not evidenced — planned or unverified" });
  assert.ok(!logic.buildEvidenceList(internal.profile, internal.results).includes(logic.ADVERSARIAL_TEST));
});

test("agency tier follows AIG-AGT-02 Tables A and B: the Table C calibration examples reproduce", () => {
  const run = (dimensions, multipliers, extra = {}) => logic.computeAgentic({ dimensions, multipliers, killSwitch: true, rollback: true, boundariesTested: true, ...extra });
  assert.equal(run({ consequence: 1, autonomy: 1, authority: 1, reach: 1, controllability: 0 }, []).tierLabel, "T1 assisted");
  const ex2 = run({ consequence: 2, autonomy: 2, authority: 2, reach: 3, controllability: 2 }, ["Credential access", "External communication"]);
  assert.equal(ex2.tierLabel, "T2 bounded agent");
  const ex3 = run({ consequence: 4, autonomy: 3, authority: 2, reach: 3, controllability: 2 }, ["Credential access", "Persistence"]);
  assert.equal(ex3.tierLabel, "T4 high-agency");
  assert.deepEqual(ex3.setBy, ["A: Consequence 4", "rule C4"]);
  const ex4 = run({ consequence: 4, autonomy: 4, authority: 4, reach: 4, controllability: 4 }, ["Credential access", "Delegation", "External communication", "Memory", "Persistence"], { otherD1: true });
  assert.equal(ex4.tierLabel, "T5 exceptional / high-consequence");
  assert.deepEqual(ex4.setBy, ["rule B2", "rule D1"]);
  // Governing tiers in Table C: booking agent and housing agent act without per-action review → Critical.
  const booking = triage({ profile: { actionAuthority: "Acts within defined bounds — monitored" }, impact: { ...impacts(1), residentImpact: 3 }, likelihood: 3, agentic: ex2, evidence: "Not evidenced — planned or unverified" }).results;
  assert.equal(booking.effectiveTierName, "Critical");
  assert.equal(booking.agencyMinTier, "Medium");
  const copilot = triage({ profile: { actionAuthority: "Human approves each action" }, impact: { ...impacts(1), residentImpact: 2 }, likelihood: 2, agentic: run({ consequence: 1, autonomy: 1, authority: 1, reach: 1, controllability: 0 }, []) }).results;
  assert.equal(copilot.effectiveTierName, "Low");
  // Table A cells, rules B1, C1-C5 and D1 (kill-switch not demonstrated).
  assert.deepEqual(logic.AGENCY_TABLE_A.autonomy, [0, 1, 2, 2, 3, 5]);
  assert.deepEqual(logic.AGENCY_TABLE_A.reach, [0, 0, 1, 2, 3, 5]);
  assert.equal(run({ autonomy: 4, reach: 4 }, []).tierNum, 4);
  assert.equal(run({}, ["Memory"]).tierNum, 1);
  assert.equal(run({}, ["Goal adaptation"]).tierNum, 2);
  assert.equal(run({}, ["Financial authority"]).tierNum, 3);
  assert.equal(run({ authority: 3 }, ["Tool discovery"]).tierNum, 4);
  assert.equal(run({}, ["Self-modification"]).tierNum, 5);
  assert.equal(logic.computeAgentic({ dimensions: {}, multipliers: [], killSwitch: false }).tierNum, 5);
  assert.equal(run({}, []).tierLabel, "T0 informational");
});

// ---- v3.9.1 --------------------------------------------------------------------

// Evaluate the AIG-ASS-02 Risk Assessment C82 agentic-floor formula (read from the v3.9.1 workbook)
// for one agency tier label (C73) and pathway (C74), with Step 5 complete and no C56 conflict.
function ass02C82(formula, tierLabel, pathway) {
  const f = formula.replace(/^=/, "");
  const branches = [...f.matchAll(/IF\(OR\(((?:LEFT\(C73,2\)="T\d"|ISNUMBER\(SEARCH\("[A-Za-z]+",C74\)\)|,)+)\),"(Critical|High|Medium)"/g)];
  assert.ok(branches.length >= 3, "C82 tier branches found");
  for (const [, terms, result] of branches) {
    const tiers = [...terms.matchAll(/LEFT\(C73,2\)="(T\d)"/g)].map((m) => m[1]);
    const words = [...terms.matchAll(/SEARCH\("([A-Za-z]+)",C74\)/g)].map((m) => m[1].toLowerCase());
    if (tiers.includes(tierLabel.slice(0, 2)) || words.some((wd) => pathway.toLowerCase().includes(wd))) return result;
  }
  return "None";
}

test("v3.9.1: agency minimum equals the AIG-ASS-02 C82 agentic floor for every tier, T2 included (no carve-outs)", () => {
  const { C82, C43 } = contract["ASS-02"]["Risk Assessment"].formulas;
  assert.match(C82, /LEFT\(C73,2\)="T2"/, "workbook applies the T2 minimum");
  assert.match(C43, /IF\(C82="Medium",2/, "governing tier ranks a Medium agentic floor");
  const perAction = { actionAuthority: "Human approves each action" };
  for (let n = 0; n <= 5; n++) {
    const ag = logic.computeAgentic({ dimensions: {}, multipliers: [], killSwitch: true, rollback: true, boundariesTested: true });
    const agentic = { ...ag, tierNum: n, tierLabel: logic.AGENCY_TIERS[n], pathway: logic.AGENCY_PATHWAYS[n] };
    const workbook = ass02C82(C82, logic.AGENCY_TIERS[n], agentic.pathway || "");
    // per-action review evidenced, so T4 stays High (the C56 floor makes it Critical otherwise)
    assert.equal(logic.agencyMinimumTier(n, true) || "None", workbook, `T${n}`);
    const r = triage({ profile: perAction, agentic }).results;
    assert.equal(r.effectiveTierName, workbook === "None" ? "Low" : workbook, `T${n} governing tier from a Low risk tier`);
  }
});

test("v3.9.1: Gate 6 evidence carries the AIG-OPS-01 section 8 business continuity link exactly", () => {
  const rows = contract["OPS-01"].rows;
  const bc = rows.find((r) => r[0].startsWith("Business continuity link"));
  assert.ok(bc, "section 8 row present in AIG-OPS-01 v1.6");
  assert.equal(bc[0], "Business continuity link (Proposed — for Council confirmation)");
  assert.ok(logic.BUSINESS_CONTINUITY_LINK.includes(bc[0]), "label quoted exactly");
  assert.ok(logic.BUSINESS_CONTINUITY_LINK.includes(bc[1]), "question quoted exactly");
  for (const t of [triage(), triage({ profile: { actionAuthority: "Human approves each action" } })]) {
    const gate6 = logic.buildRoute(t.profile, t.results, {}).find((g) => g.gateNumber === 6);
    assert.ok(gate6.evidence.includes(logic.BUSINESS_CONTINUITY_LINK));
  }
  // the new row follows the existing section 8 rows
  assert.deepEqual(rows.map((r) => r[0]).slice(0, 3), ["Safe-withdrawal / rollback procedure", "Who can invoke suspension", "Fallback process if the system is unavailable"]);
});
