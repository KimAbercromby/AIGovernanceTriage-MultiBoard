"use strict";

// One test per v3.9.2 pilot-readiness finding fixed in this tool (scenario test of
// suite v3.9.1, 30 September 2026). Expected values come from the v3.9.2 workbooks
// via test/fixtures/suite-v3.9.8-contract.json and from the AIG-DEC-01 v1.8 Gate 4
// rule, Playbook §6.4.4 and AIG-OPS-02 v1.6 (Proposed — for Council confirmation).

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const logic = require("../src/triage-logic.js");
const contract = require("./fixtures/suite-v3.9.8-contract.json");

const root = path.join(__dirname, "..");
const app = fs.readFileSync(path.join(root, "src", "triage-app.js"), "utf8");
const retireApp = fs.readFileSync(path.join(root, "src", "retire-app.js"), "utf8");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");

function profile(overrides) {
  return {
    situation: "New use", fastTrack: "All ten No", registerId: "AIR-T001", ucId: "UC-T001", ucIdStatus: "Provisional — operator-entered, unverified",
    systemName: "Scenario", purpose: "Purpose", usePurpose: "Use", serviceArea: "Service", serviceOwner: "Owner",
    supplierDeveloper: "Supplier", source: "Internally developed", capability: "Predictive AI",
    actionAuthority: "None — outputs only", systemsAccessed: "", lifecycle: "Idea", dataType: "None",
    procurementRoute: "Built in-house", affectsIndividuals: "No", publicFacing: "No", dateFirstUsed: "", ...overrides,
  };
}
const agpi = (o = {}) => ({ resident: 1, trust: 1, legal: 1, visibility: 1, strategic: 1, oversight: 1, ...o });
const impacts = (o = {}) => ({ residentImpact: 1, legalImpact: 1, reputationImpact: 1, operationalImpact: 1, financialImpact: 1, ...o });
function run(p, o = {}) {
  return logic.calculateTriage({
    profile: p, agpiScores: agpi(o.agpi), impactScores: impacts(o.impacts), likelihood: o.likelihood || 2,
    control: o.control || 3, controlEvidence: o.evidence || "Not evidenced — planned or unverified",
    controlEvidenceRef: o.ref, verificationRef: o.verRef, triggerIds: o.triggers || [], agentic: o.agentic || null,
    governanceInvestigation: o.investigation,
  });
}
const gate = (p, r, n) => logic.buildRoute(p, r, {}).find((g) => g.gateNumber === n);
function gatePlanRows(p, r) {
  const csv = logic.buildGatePlanCsv(p, logic.buildRoute(p, r, {}), r);
  return csv.replace(/^﻿/, "").trim().split("\r\n").slice(1).map((l) => l.slice(1, -1).split('","'));
}

// ---- T-01 ----------------------------------------------------------------------
test("T-01: AI found already in use always gets full retrospective intake, never light-touch (S10)", () => {
  // S10: shadow AI, free public tool, discovered live; otherwise all-low answers.
  const base = { source: "Free / public tool", procurementRoute: "Free public tool", capability: "Generative AI" };
  const newUse = profile(base);
  assert.equal(logic.isLightTouch(newUse, run(newUse)), true, "control: a new all-low use can be light-touch");
  for (const p of [profile({ ...base, situation: "Found already in use" }), profile({ ...base, lifecycle: "Live" })]) {
    const r = run(p);
    assert.equal(logic.isFoundInUse(p), true);
    assert.equal(logic.isLightTouch(p, r), false);
    const reg = logic.buildRegisterDraftHandoff(p, r, null).rows;
    assert.equal(reg.find((row) => row[1] === "Intake type")[3], "Retrospective");
    assert.match(gatePlanRows(p, r)[0][3], /^Retrospective intake \(found already in use\)/);
    assert.match(logic.paperRoute(p, r), /Standard/);
  }
  const changed = profile({ ...base, situation: "Change to a use in governance" });
  assert.equal(logic.isLightTouch(changed, run(changed)), false, "a change re-enters intake");
  assert.match(gatePlanRows(changed, run(changed))[0][3], /^Re-entry: change to a use in governance/);
  assert.equal(logic.buildRegisterDraftHandoff(changed, run(changed), null).rows.find((row) => row[1] === "Intake type")[3], "");
  assert.equal(logic.isLightTouch(profile({ ...base, situation: "Already approved" }), run(profile({ ...base, situation: "Already approved" }))), false);
  // The page asks the question with the Route Finder's four situations.
  const select = /<select id="situation">([\s\S]*?)<\/select>/.exec(html)[1];
  assert.deepEqual([...select.matchAll(/<option>([^<]+)<\/option>/g)].map((m) => m[1]), Object.values(logic.SITUATIONS));
  assert.match(app, /"situation",/);
  assert.match(app, /function situationNote/);
});

// ---- T-02 ----------------------------------------------------------------------
test("T-02: retire mode asks every closure question whatever the priority (S21 P4, S22 P2)", () => {
  const all = logic.RETIREMENT_FIELDS.map((f) => f.id);
  for (let level = 1; level <= 5; level += 1) {
    assert.deepEqual(logic.retirementFieldsFor(level).map((f) => f.id), all, `P${level}`);
  }
  for (const id of ["monitoringClosure", "atrsAction", "supplierExit", "residentNotify", "conditionsClosed", "postReview", "fallback"]) {
    assert.ok(all.includes(id), id);
  }
  // S22 (P2): open conditions and incidents must be closed or transferred first.
  const s22 = logic.retirementReadiness({ priorityLabel: "Priority 2 – High", priorityLevel: 2, conditionsClosed: "No" });
  assert.ok(s22.outstanding.includes("Open conditions or incidents not closed or transferred."));
  const s21 = logic.retirementReadiness({ priorityLabel: "Priority 4 – Routine", priorityLevel: 4, monitoringClosure: "To be closed", supplierExit: "In progress" });
  assert.ok(s21.outstanding.includes("Post-Deployment Monitoring Log (AIG-OPS-02) not yet closed."));
  assert.ok(s21.outstanding.includes("Supplier exit (data return or destruction) not yet completed."));
  assert.ok(s21.outstanding.includes("Post-retirement / lessons-learned review not yet scheduled."));
  // Every field is rendered: each group is in the render order (the "Decision authority"
  // question was previously never shown).
  logic.RETIREMENT_FIELDS.forEach((f) => assert.ok(logic.RETIREMENT_GROUP_ORDER.includes(f.group), `${f.id}: ${f.group}`));
  assert.doesNotMatch(retireApp, /level <= f\.showAtOrAbove/);
  assert.ok(logic.RETIREMENT_FIELDS.every((f) => !("showAtOrAbove" in f)));
});

// ---- T-03 ----------------------------------------------------------------------
test("T-03: Autonomy 0 with every action human-approved is valid, so a T0 agent can be assessed (S12)", () => {
  assert.deepEqual(logic.autonomyRangeFor("Human approves each action"), { min: 0, max: 1 });
  assert.deepEqual(logic.autonomyRangeFor("Acts within defined bounds — monitored"), { min: 2, max: 5 });
  assert.deepEqual(logic.autonomyRangeFor("Fully autonomous"), { min: 3, max: 5 });
  assert.match(app, /const range = logic\.autonomyRangeFor\(actionAuthority\);/);
  assert.doesNotMatch(app, /minimumAutonomy/);
  // S12 agency scores: Consequence 0, Autonomy 0, Authority 0, Reach 1, Controllability 1.
  const agentic = logic.computeAgentic({
    dimensions: { consequence: 0, autonomy: 0, authority: 0, reach: 1, controllability: 1 },
    multipliers: [], capabilities: ["Write"], killSwitch: true, rollback: true, boundariesTested: true,
  });
  assert.equal(agentic.tierLabel, "T0 informational");
  const p = profile({ actionAuthority: "Human approves each action", capability: "Generative AI", procurementRoute: "New contract, licence change or contract variation", source: "Procured", lifecycle: "Pilot" });
  const r = run(p, { agpi: { trust: 2 }, agentic });
  assert.equal(r.agencyPending, false);
  assert.equal(r.effectiveTierName, "Low");
  assert.equal(r.agencyMinTier, null);
  assert.equal(gate(p, r, 2).applicability, "Required");
  assert.equal(gate(p, r, 6).applicability, "Required");
});

// ---- T-04 ----------------------------------------------------------------------
// AIG-ASS-02 v1.10 Risk Assessment E41 (read from the workbook) and C43's use of it.
function workbookTier({ L, I, C, e37, e38, e39, e40 }) {
  const e41 = contract["ASS-02"]["Risk Assessment"].formulas.E41;
  assert.equal(e41, '=IF(AND(E37="Yes",E38<>"",OR(AND(C38<>"High",C38<>"Critical"),AND(E39="Yes",E40<>""))),"Yes","No")');
  const inherent = L * I;
  const c38 = inherent >= 16 ? "Critical" : inherent >= 11 ? "High" : inherent >= 6 ? "Medium" : "Low";
  const c40 = inherent * (C / 5);
  const c41 = c40 > 15 ? "Critical" : c40 > 10 ? "High" : c40 > 5 ? "Medium" : "Low";
  const eligible = e37 === "Yes" && e38 !== "" && ((c38 !== "High" && c38 !== "Critical") || (e39 === "Yes" && e40 !== ""));
  const order = ["Low", "Medium", "High", "Critical"];
  return order[Math.max(order.indexOf(eligible ? c41 : c38), I === 5 ? 1 : 0)];
}

test("T-04: the pre-fill carries control evidence into ASS-02 E37:E40 and C43 recomputes the tool's tier (S18)", () => {
  assert.deepEqual(Object.values(contract["ASS-02"]["Risk Assessment"].evidenceLabels), ["Controls evidenced?", "Control evidence ref", "Independent check?", "Verification ref"]);
  assert.deepEqual(contract["ASS-02"]["Risk Assessment"].lists.E37, ["Yes", "No"]);
  assert.deepEqual(contract["ASS-02"]["Risk Assessment"].lists.E39, ["Yes", "No"]);
  // S18: L5, highest impact 5, C3, controls implemented, evidenced and independently verified.
  const s18 = { L: 5, I: 5, C: 3 };
  const p = profile({ lifecycle: "Testing" });
  let checked = 0;
  for (const evidence of logic.CONTROL_EVIDENCE) {
    for (const [ref, verRef] of [["EV-1", "IA-1"], ["EV-1", ""], ["", ""]]) {
      for (const [L, I, C] of [[s18.L, s18.I, s18.C], [2, 2, 3], [3, 4, 2], [4, 4, 1], [5, 3, 3]]) {
        const r = run(p, { likelihood: L, control: C, impacts: { financialImpact: I }, evidence, ref, verRef });
        const f = Object.fromEntries(logic.controlEvidenceFields(r));
        const wb = workbookTier({ L, I, C, e37: f["Controls evidenced?"], e38: f["Control evidence ref"], e39: f["Independent check?"], e40: f["Verification ref"] });
        assert.equal(r.effectiveTierName, wb, `${evidence} / ${ref || "-"} / ${verRef || "-"} / L${L} I${I} C${C}`);
        checked += 1;
      }
    }
  }
  assert.equal(checked, 45);
  const s18r = run(p, { likelihood: 5, control: 3, impacts: { financialImpact: 5 }, evidence: logic.CONTROL_EVIDENCE[2], ref: "Buffer rules + reconciliation", verRef: "Internal Audit report" });
  assert.equal(s18r.effectiveTierName, "High");
  assert.deepEqual(logic.controlEvidenceFields(s18r), [
    ["Controls evidenced?", "Yes"], ["Control evidence ref", "Buffer rules + reconciliation"],
    ["Independent check?", "Yes"], ["Verification ref", "Internal Audit report"],
  ]);
  assert.match(logic.fieldReferenceType("Risk Assessment", "Controls evidenced?"), /Risk Assessment E37/);
  assert.match(app, /\.\.\.logic\.controlEvidenceFields\(r\)\.map\(\(\[field, value\]\) => \[field, value, "Risk Assessment"\]\)/);
  assert.match(html, /id="controlEvidenceRef"/);
  assert.match(html, /id="verificationRef"/);
});

// ---- T-07 / T-08 ---------------------------------------------------------------
test("T-07: an embedded feature under an existing licence needs no DDQ; Gate 4 N/A and light-touch stays possible (S01)", () => {
  const p = profile({ source: "Embedded in platform / supplier feature", procurementRoute: "Existing contract or licence" });
  const r = run(p, { agpi: { strategic: 2 }, impacts: { operationalImpact: 2 } });
  assert.equal(r.requirements.supplierDueDiligence, false);
  assert.equal(r.requirements.supplierChecks, "partial");
  assert.equal(r.effectiveTierName, "Low");
  assert.equal(logic.isLightTouch(p, r), true, "S01 light-touch per the Fast-Track answers");
  const g4 = gate(p, r, 4);
  assert.equal(g4.applicability, "Not applicable");
  assert.match(g4.status, /^N\/A — existing contract \/ free tool/);
  const evidence = logic.buildEvidenceList(p, r);
  assert.ok(!evidence.includes("Supplier AI Due Diligence Questionnaire"));
  assert.ok(evidence.some((e) => e.includes("section 5 (data protection and security) and section 8 (business continuity and exit)")));
  const row = gatePlanRows(p, r).find((x) => x[2] === "Gate 4 Procurement");
  assert.equal(row[4], "Not applicable");
  assert.equal(row[9], "", "column J is left for the steward");
  assert.match(row[row.length - 1], /Proposed N\/A rationale for column J[^:]*: N\/A — existing contract \/ free tool: AI feature enabled under an existing contract or licence/);
  assert.ok(contract["DEC-04"]["Gate plan"].lists["E4:E353"].includes(row[4]));
  // Legacy profile (before v3.9.2): embedded source with procurement "No" reads the same.
  assert.equal(logic.procurementRouteOf({ source: "Embedded in platform / supplier feature", procurementRequired: "No" }), "Existing contract or licence");
});

test("T-08: the procurement answer drives Gate 4 per the AIG-DEC-01 v1.8 rule, whatever the Source", () => {
  const expected = {
    "New contract, licence change or contract variation": ["Required", "Required", ""],
    "Existing contract or licence": ["Not applicable", "Not applicable", "N/A — existing contract / free tool"],
    "Free public tool": ["Not applicable", "Not applicable", "N/A — existing contract / free tool"],
    "Built in-house": ["Not applicable", "Not applicable", "N/A (built in-house)"],
    "Not yet known": ["Conditional", "Conditional", ""],
  };
  const html4 = /<select id="procurementRoute">([\s\S]*?)<\/select>/.exec(html)[1];
  assert.deepEqual([...html4.matchAll(/<option>([^<]+)<\/option>/g)].map((m) => m[1]), Object.values(logic.PROCUREMENT));
  for (const source of ["Internally developed", "Procured", "Embedded in platform / supplier feature", "Free / public tool"]) {
    for (const [route, [applicability, planRequirement, rationale]] of Object.entries(expected)) {
      const p = profile({ source, procurementRoute: route });
      const r = run(p);
      assert.equal(gate(p, r, 4).applicability, applicability, `${source} / ${route}`);
      const row = gatePlanRows(p, r).find((x) => x[2] === "Gate 4 Procurement");
      assert.equal(row[4], planRequirement);
      assert.equal(row[9], "");
      if (rationale) assert.ok(row[row.length - 1].includes(`for column J (the steward confirms it and adds the authority ref, their name and date): ${rationale}`), `${route}: ${row[row.length - 1]}`);
      assert.equal(r.requirements.supplierDueDiligence, route === "New contract, licence change or contract variation");
    }
  }
  // S09: free public tool, nothing procured → not "Applies (procured)".
  const s09 = profile({ source: "Free / public tool", procurementRoute: "Free public tool" });
  assert.equal(run(s09).gate4.label, "N/A — existing contract / free tool");
});

// ---- T-09 ----------------------------------------------------------------------
test("T-09: Governance Investigation Required? is asked and exported to AIG-ASS-01 B19 (S09)", () => {
  const select = /<select id="governanceInvestigation">([\s\S]*?)<\/select>/.exec(html)[1];
  assert.deepEqual([...select.matchAll(/<option>([^<]+)<\/option>/g)].map((m) => m[1]), ["No", "Yes"]);
  assert.deepEqual(contract["ASS-01"]["AGPI Triage"].lists.B19, ["Yes", "No"]);
  assert.match(app, /\["Governance Investigation Required\? \(Yes \/ No\)", r\.governanceInvestigation \? "Yes" : "No"\]/);
  const r = run(profile(), { agpi: { resident: 4, trust: 4, legal: 4 }, investigation: "Yes" });
  assert.equal(r.effectiveGovernancePriority, "Governance Investigation Required — route to discovery");
});

// ---- W-05 ----------------------------------------------------------------------
test("W-05: the AGPI pre-fill exports the new ASS-01 row 23 trigger answer and row 24 check", () => {
  assert.match(app, /\["Mandatory escalation trigger applies \(Playbook §4\.4\.6\)\? \(Yes \/ No \/ Unsure\)", r\.triggerAnswer\]/);
  assert.match(app, /\["Trigger floor: a §4\.4\.6 trigger use is at least Priority 4 \(Proposed — for Council confirmation\)", r\.priority\.triggerFloorNote\]/);
  const list = contract["ASS-01"]["AGPI Triage"].lists.B23;
  assert.equal(run(profile()).triggerAnswer, "No");
  assert.equal(run(profile(), { triggers: ["novel"] }).triggerAnswer, "Yes");
  assert.equal(run(profile({ actionAuthority: "Unsure — not yet confirmed" })).triggerAnswer, "Unsure");
  for (const v of ["No", "Yes", "Unsure"]) assert.ok(list.includes(v));
  // S07: novel deployment, low AGPI → Priority 4 in the tool and in ASS-01 B17.
  const s07 = run(profile(), { triggers: ["novel"] });
  assert.equal(s07.rawAgpiPriority, "Priority 4 – Routine");
  assert.equal(s07.priority.triggerFloorNote, "Trigger floor applied: §4.4.6 trigger use raised from Priority 5 – Observe to Priority 4 – Routine");
});

// ---- T-12 / W-08 / W-11 --------------------------------------------------------
test("T-12: the triage states the §6.4.4 monitoring cadence and the OPS-02 minimum sample for the governing tier", () => {
  const expected = {
    Low: /routine operational monitoring by the Service Owner; performance review annual; formal review annual; minimum sample 10 per review/,
    Medium: /operational monitoring monthly; performance review quarterly; formal review annual \(AI Governance Working Group\); minimum sample 20 per review/,
    High: /operational monitoring continuous \(logged at least monthly\); performance review monthly; formal review quarterly, reported to the AI Assurance Board; minimum sample the greater of 30 or 5%/,
    Critical: /continuous monitoring with a formal review at least monthly, reported to each AI Assurance Board meeting; minimum sample the greater of 30 or 5% of the window’s population, plus 100% of adverse or fully automated decisions/,
  };
  for (const [tier, re] of Object.entries(expected)) {
    assert.match(logic.monitoringMinimum(tier, false), re, tier);
    assert.doesNotMatch(logic.monitoringMinimum(tier, false), /Action-capable/);
    assert.match(logic.monitoringMinimum(tier, true), /Action-capable: the Monitoring and Review Plan raises \(never lowers\) this cadence; the size of the raise is to be set by the Council \(AIG-OPS-02 column AP\)/);
  }
  assert.match(run(profile(), { triggers: ["novel"] }).monitoringMinimum, /for the High governing tier/);
  assert.match(html, /id="summaryMonitoring"/);
  assert.match(app, /byId\("summaryMonitoring"\)\.textContent/);
});

test("W-08: the agentic monitoring handoff fills the new OPS-02 AO / AP columns with controlled values", () => {
  const ops = contract["OPS-02"]["Monitoring Log"];
  assert.deepEqual(ops.headers.slice(-2), ["Review type (§6.4.4: operational / performance / formal)", "Agentic cadence raise applied? (action-capable uses)"]);
  assert.deepEqual(logic.OPS02_REVIEW_TYPES, ops.lists["AO5:AO2000"]);
  assert.deepEqual(logic.OPS02_AGENTIC_RAISE, ops.lists["AP5:AP2000"]);
  assert.match(app, /add\(monitoring, "Review type \(§6\.4\.4: operational \/ performance \/ formal\)", "Operational monitoring"/);
  assert.match(app, /add\(monitoring, "Agentic cadence raise applied\? \(action-capable uses\)", r\.actionCapable \? "Action-capable: raise not yet set" : "Not action-capable"/);
});

test("W-11: High needs an independent assurance review; Critical independent challenge and assurance", () => {
  const p = profile();
  const high = run(p, { triggers: ["novel"] });
  assert.equal(high.effectiveTierName, "High");
  assert.ok(logic.buildEvidenceList(p, high).includes("Independent assurance review (Playbook §4.5.3, §4.5.9)"));
  const critical = run(p, { triggers: ["statutory"] });
  assert.ok(logic.buildEvidenceList(p, critical).includes("Independent challenge and independent assurance (Playbook §3.10.2)"));
  const low = run(p);
  assert.ok(!logic.buildEvidenceList(p, low).some((e) => /Independent (assurance|challenge)/.test(e)));
});

test("W-06: Gate events headers include the v3.9.2 precautionary-pause columns V and W", () => {
  const spec = contract["DEC-04"]["Gate events"];
  const columns = spec.headers.filter((h, i) => !spec.formulaColumns.includes(String.fromCharCode(65 + i)));
  assert.deepEqual(logic.GATE_EVENT_HEADERS, columns);
  assert.ok(spec.lists["E4:E553"].includes("Precautionary pause (containment)"));
});
