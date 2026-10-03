"use strict";
// Suite v3.9.7: AIG-DEC-01 v1.11 Gate 1 and 3 rule. Gates 1 and 3 (investment and
// strategic case) are proposed N/A only for a new UC-ID under an existing AIR-ID that
// needs no new investment, at Low or Medium, and cannot act.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const logic = require("../src/triage-logic.js");

const NO = "No — existing approved system and licence, no new cost";
const agpi = { resident: 1, trust: 2, legal: 2, visibility: 2, strategic: 1, oversight: 1 };
const low = { residentImpact: 1, legalImpact: 2, reputationImpact: 2, operationalImpact: 1, financialImpact: 1 };
function profile(o) {
  return {
    situation: "New use", fastTrack: "All ten No", registerId: "AIR-SIM1", ucId: "", ucIdStatus: "Pending — no UC-ID entered",
    systemName: "Copilot (fictional)", purpose: "Assistant", usePurpose: "Meeting-notes summary", serviceArea: "Customer Services",
    serviceOwner: "Owner", supplierDeveloper: "Microsoft", source: "Embedded in platform / supplier feature", capability: "Generative AI",
    actionAuthority: "None — outputs only", systemsAccessed: "", lifecycle: "Idea", dataType: "Personal data",
    procurementRoute: "Existing contract or licence", newInvestment: NO, systemApproval: "Yes — Approved and Active, review not overdue", affectsIndividuals: "No", publicFacing: "No", dateFirstUsed: "", ...o,
  };
}
const run = (p, impacts = low, likelihood = 2) => logic.calculateTriage({
  profile: p, agpiScores: agpi, impactScores: impacts, likelihood, control: 2,
  controlEvidence: "Not evidenced — planned or unverified", triggerIds: [], agentic: null,
});
const gate = (route, n) => route.find((g) => g.gateNumber === n);

test("Copilot new use, existing licence, no new investment, Low: Gates 1 and 3 proposed N/A; Gate 6 carries the screening", () => {
  const p = profile({});
  const r = run(p);
  assert.equal(r.effectiveTierName, "Low");
  const route = logic.buildRoute(p, r, {});
  for (const n of [1, 3]) {
    assert.equal(gate(route, n).applicability, "Not applicable");
    assert.match(gate(route, n).naRationale, /Gate 1 and 3 rule/);
  }
  assert.equal(gate(route, 6).applicability, "Required");
  assert.ok(gate(route, 6).evidence.some((e) => /screening outcome \(may be by reference/.test(e)));
  assert.ok(gate(route, 6).evidence.includes("Purpose and expected benefits"));
  assert.equal(logic.isLightTouch(p, r), true);
});

test("the rule does not apply when investment is Yes or Unsure, there is no AIR-ID, a new contract is needed, or the use can act", () => {
  for (const o of [{ newInvestment: "Yes" }, { newInvestment: "Unsure (counts as Yes)" }, { newInvestment: undefined },
    { procurementRoute: "New contract, licence change or contract variation" }, { procurementRoute: "Not yet known" }, { actionAuthority: "Human approves each action" },
    { situation: "Found already in use" }]) {
    const p = profile(o);
    const route = logic.buildRoute(p, run(p), {});
    assert.equal(gate(route, 1).applicability, "Required", JSON.stringify(o));
    assert.equal(gate(route, 3).applicability, "Required", JSON.stringify(o));
  }
});

test("High or Critical keeps Gates 1 and 3 even with no new investment", () => {
  const p = profile({});
  const r = run(p, { residentImpact: 4, legalImpact: 4, reputationImpact: 3, operationalImpact: 3, financialImpact: 2 }, 4);
  assert.ok(["High", "Critical"].includes(r.effectiveTierName), r.effectiveTierName);
  const route = logic.buildRoute(p, r, {});
  assert.equal(gate(route, 1).applicability, "Required");
  assert.equal(gate(route, 3).applicability, "Required");
});

test("at Medium the carried items go to Gate 5, not Gate 6", () => {
  const p = profile({});
  const r = run(p, { residentImpact: 3, legalImpact: 3, reputationImpact: 2, operationalImpact: 2, financialImpact: 1 }, 3);
  assert.equal(r.effectiveTierName, "Medium");
  const route = logic.buildRoute(p, r, {});
  assert.equal(gate(route, 1).applicability, "Not applicable");
  assert.ok(gate(route, 5).evidence.includes("Purpose and expected benefits"));
  assert.ok(!gate(route, 6).evidence.includes("Purpose and expected benefits"));
});

test("Gate plan export leaves column J for the steward and puts the proposed rationale in the handoff", () => {
  const p = profile({});
  const r = run(p);
  const csv = logic.buildGatePlanCsv(p, logic.buildRoute(p, r, {}), r);
  const rows = csv.replace(/^﻿/, "").trim().split("\r\n").slice(1).map((l) => l.slice(1, -1).split('","'));
  const g1 = rows.find((x) => x[2] === "Gate 1 Strategic prioritisation");
  assert.equal(g1[4], "Not applicable");
  assert.equal(g1[9], "");
  assert.match(g1[g1.length - 1], /Proposed N\/A rationale for column J.*Gate 1 and 3 rule/);
});

test("the page asks the new investment question with the three answers", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  const sel = /<select id="newInvestment">([\s\S]*?)<\/select>/.exec(html)[1];
  assert.deepEqual([...sel.matchAll(/<option>([^<]+)<\/option>/g)].map((m) => m[1]), Object.values(logic.NEW_INVESTMENT));
});

test("v3.9.8 (decision A1): a free new system goes to Gate 1 but not Gate 3", () => {
  for (const id of ["", "AIR-", "Copilot"]) {
    const p = profile({ registerId: id, source: "Free / public tool", procurementRoute: "Free public tool" });
    const r = run(p);
    const route = logic.buildRoute(p, r, {});
    assert.equal(gate(route, 1).applicability, "Required", `Gate 1 for '${id}'`);
    assert.equal(gate(route, 3).applicability, "Not applicable", `Gate 3 for '${id}'`);
    assert.ok(gate(route, 6).evidence.includes("Purpose and expected benefits"), "Gate 3 items carried to Gate 6");
  }
});

test("v3.9.8: a new system that needs money keeps both Gates 1 and 3", () => {
  const p = profile({ registerId: "", newInvestment: "Yes", procurementRoute: "New contract, licence change or contract variation" });
  const route = logic.buildRoute(p, run(p), {});
  assert.equal(gate(route, 1).applicability, "Required");
  assert.equal(gate(route, 3).applicability, "Required");
});

test("v3.9.8 (decision A5): a no-cost change to an approved use at Low skips Gates 1 and 3 but stays re-entry", () => {
  for (const situation of ["Change to a use in governance", "Already approved"]) {
    const p = profile({ situation });
    const r = run(p);
    const route = logic.buildRoute(p, r, {});
    assert.equal(logic.isReentry(p), true);
    assert.equal(logic.isLightTouch(p, r), false, "a change is never Light-touch");
    assert.equal(gate(route, 1).applicability, "Not applicable", situation);
    assert.equal(gate(route, 3).applicability, "Not applicable", situation);
    assert.match(gate(route, 1).naRationale, /changed use under AIR-SIM1/);
  }
  const money = profile({ situation: "Change to a use in governance", newInvestment: "Yes" });
  assert.equal(gate(logic.buildRoute(money, run(money), {}), 1).applicability, "Required", "a change that needs money keeps the gates");
});

test("v3.9.8 (decision A6): Gates 1 and 3 stay unless the existing system's approval is confirmed current", () => {
  for (const systemApproval of ["No — suspended, lapsed or review overdue", "Unsure (counts as No)", undefined]) {
    const p = profile({ systemApproval });
    const route = logic.buildRoute(p, run(p), {});
    assert.equal(gate(route, 1).applicability, "Required", String(systemApproval));
    assert.equal(gate(route, 3).applicability, "Required", String(systemApproval));
  }
  const fresh = profile({ registerId: "", systemApproval: undefined, source: "Free / public tool", procurementRoute: "Free public tool" });
  assert.equal(gate(logic.buildRoute(fresh, run(fresh), {}), 3).applicability, "Not applicable", "the question does not apply to a new system");
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  const sel = /<select id="systemApproval">([\s\S]*?)<\/select>/.exec(html)[1];
  assert.deepEqual([...sel.matchAll(/<option>([^<]+)<\/option>/g)].map((m) => m[1]), Object.values(logic.SYSTEM_APPROVAL));
});

test("v3.9.8 (decision B4): contradictory investment and procurement answers are flagged", () => {
  const p = profile({ procurementRoute: "New contract, licence change or contract variation" });
  assert.match(logic.answerConflicts(p).join(" "), /no new investment, but a new contract/);
  const route = logic.buildRoute(p, run(p), {});
  assert.equal(gate(route, 1).applicability, "Required");
  assert.equal(gate(route, 4).applicability, "Required");
  assert.deepEqual(logic.answerConflicts(profile({})), [], "no warning when answers agree");
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  assert.match(html, /id="investmentWarning"/);
});

test("v3.9.8 (decision E8): all-No Fast Track with a tier above Low is flagged", () => {
  const p = profile({});
  const med = logic.calculateTriage({ profile: p, agpiScores: agpi, impactScores: { residentImpact: 3, legalImpact: 3, reputationImpact: 2, operationalImpact: 2, financialImpact: 1 }, likelihood: 3,
    control: 2, controlEvidence: "Not evidenced — planned or unverified", triggerIds: [], agentic: null });
  assert.equal(med.effectiveTierName, "Medium");
  assert.match(logic.answerConflicts(p, med).join(" "), /All ten Fast-Track answers are No, but the risk scores give Medium/);
  assert.deepEqual(logic.answerConflicts(p, run(p)), [], "no warning at Low");
  assert.deepEqual(logic.answerConflicts(profile({ fastTrack: "One or more Yes or Unsure" }), med), [], "no warning when Fast Track has a Yes");
  assert.match(fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8"), /id="fastTrackWarning"/);
});
