"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const logic = require("../src/triage-logic.js");

function fixture({ dataType = "None", tier = "Low" } = {}) {
  const profile = {
    registerId: "",
    systemName: "Example system",
    purpose: "Draft purpose",
    serviceArea: "Service",
    serviceOwner: "Owner",
    supplierDeveloper: "",
    source: "Internally developed",
    capability: "Predictive AI",
    actionAuthority: "None — outputs only",
    systemsAccessed: "",
    lifecycle: "Idea",
    dateFirstUsed: "",
    dataType,
    affectsIndividuals: "No",
    publicFacing: "No",
    procurementRequired: "No",
  };
  const results = {
    agpiScore: 8,
    priority: logic.priorityFor(8),
    effectiveGovernancePriority: "Priority 5 – Observe",
    effectiveTierName: tier,
    risk: { impact: 1, inherent: 1, residual: 1, control: 5 },
    triggerIds: [],
    assuranceIntensity: "Proportionate",
    requirements: {},
  };
  results.requirements = logic.assessmentRequirements(profile, results);
  return { profile, results };
}

test("AGPI is a weighted prioritisation score in the 0–100 range", () => {
  const lowest = Object.fromEntries(logic.DIMENSIONS.map(({ id }) => [id, 1]));
  const highest = Object.fromEntries(logic.DIMENSIONS.map(({ id }) => [id, 5]));
  assert.equal(logic.calculateAgpi(lowest), 0);
  assert.equal(logic.calculateAgpi(highest), 100);
});

test("every risk tier carries equality, human-rights and privacy screening", () => {
  const low = fixture();
  const evidence = logic.buildEvidenceList(low.profile, low.results);
  assert.match(evidence.join("\n"), /Equality Act 2010 section 149 screening \(all tiers/);
  assert.match(evidence.join("\n"), /Human Rights Act 1998 section 6 screening \(all tiers/);
  assert.match(evidence.join("\n"), /Data protection and privacy screening \(all tiers/);

  const handoff = logic.buildArtefactHandoff(low.profile, low.results);
  assert.ok(handoff.some((item) => item.artefact.includes("Equality") &&
    item.section.includes("all tiers")));
  assert.ok(handoff.some((item) => item.artefact.includes("Human Rights") &&
    item.section.includes("all tiers")));
  assert.equal(low.results.requirements.dpiaScreening, true);
});

test("05 export is a draft handoff and never manufactures identity or assurance state", () => {
  const { profile, results } = fixture();
  const draft = logic.build05DraftHandoff(profile, results, null);
  assert.deepEqual(draft.headers, logic.DRAFT_HANDOFF_HEADERS);
  assert.ok(draft.rows.every((row) => row.length === draft.headers.length));

  const identity = draft.rows.find((row) => row[1] === "AIR-ID");
  assert.equal(identity[2], "");
  assert.match(identity[3], /Council-issued AIR-ID/);
  assert.equal(draft.rows.find((row) => row[1] === "Governance Approval Status")[2], "");
  assert.equal(draft.rows.find((row) => row[1] === "Operational Status")[2], "");
  assert.match(draft.rows.find((row) => row[1] === "Approved Purpose / Boundary")[3], /not approved/);
  assert.match(draft.rows.find((row) => row[1] === "Action Authority (summary)")[3], /does not grant authority/);
});

test("36 gate-plan output is a prospective plan handoff, not an event row", () => {
  const { profile, results } = fixture();
  const route = logic.buildRoute(profile, results, {});
  const csv = logic.buildGatePlanCsv(profile, route);
  assert.match(csv, /Prospective requirement/);
  assert.match(csv, /not an event or approval/);
  assert.match(csv, /Draft only/);
  assert.doesNotMatch(csv, /Event ID/);
});

test("formal decisions stay with WCC-AIG-16 and 36 record types stay distinct", () => {
  const { profile, results } = fixture();
  const handoff = logic.buildArtefactHandoff(profile, results);
  const decision = handoff.find((item) => item.artefact.includes("WCC-AIG-16"));
  assert.match(decision.note, /does not create an AIR-ID, plan\/event\/condition row, approval/);
  assert.match(decision.fields[1].value, /Gate Plan, dated Gate Events and event-linked Gate Conditions/);
});

test("CSV export escapes formula-injection prefixes", () => {
  const csv = logic.toCsv(["field"], [["=cmd|unsafe"]]);
  assert.match(csv, /'=cmd\|unsafe/);
});

test("retirement handoff keeps plan, event and conditions separate without implying decommission", () => {
  const retirement = {
    registerId: "",
    systemName: "Legacy service",
    priorityLevel: 5,
    priorityLabel: "Priority 5 - Observe",
    tier: "Low",
    forum: "Service governance forum",
    eventId: "",
    decision: "Progress",
    eventDate: "2026-10-01",
    decisionMaker: "Service lead",
    decommissionDate: "2026-11-01",
    dataDisposition: "Archive",
    accessTeardown: "Not yet",
  };
  const handoff = logic.buildRetirementGateLogRow(retirement);
  assert.ok(handoff.rows.some((row) => row[0].includes("Gate Plan")));
  assert.ok(handoff.rows.some((row) => row[0].includes("Gate Events")));
  assert.ok(handoff.rows.some((row) => row[0].includes("Gate Conditions")));
  assert.ok(handoff.rows.every((row) => row.length === handoff.headers.length));
  assert.equal(handoff.rows.find((row) => row[1] === "Event ID")[2], "");
  assert.equal(handoff.rows.find((row) => row[1] === "Operational Status")[2], "");
  assert.match(handoff.readiness.status, /unverified/);
  const decision = logic.buildRetirementDecisionRecord(retirement);
  assert.match(decision, /NOT A FORMAL WCC-AIG-16 RECORD/);
  assert.match(decision, /User-entered draft: Progress \(not verified or approved\)/);
});

test("unverified retirement priority uses full-depth prompts and cannot be ready", () => {
  const retirement = {
    priorityLabel: "",
    priorityLevel: logic.retLevelFor(""),
    tier: "",
    systemName: "Legacy service",
  };
  const readiness = logic.retirementReadiness(retirement);
  assert.equal(retirement.priorityLevel, 1);
  assert.equal(readiness.complete, false);
  assert.ok(readiness.outstanding.some((item) => /Current 05 governance priority not verified/.test(item)));
  assert.ok(readiness.outstanding.some((item) => /Current 05 assurance\/risk tier not verified/.test(item)));
});