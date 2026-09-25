"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
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
  assert.equal(identity[3], "");
  assert.match(identity[5], /Council-issued AIR-ID/);
  assert.equal(draft.rows.find((row) => row[1] === "Governance Approval Status")[3], "");
  assert.equal(draft.rows.find((row) => row[1] === "Operational Status")[3], "");
  assert.match(draft.rows.find((row) => row[1] === "Approved Purpose / Boundary")[5], /not approved/);
  assert.match(draft.rows.find((row) => row[1] === "Action Authority (summary)")[5], /does not grant authority/);
  assert.ok(draft.rows.every((row) =>
    row[2].includes("Prompt") &&
    (row[4].includes("Proposal") || row[4].includes("No value asserted"))
  ));
});

test("36 gate-plan output is a prospective plan handoff, not an event row", () => {
  const { profile, results } = fixture();
  const route = logic.buildRoute(profile, results, {});
  const csv = logic.buildGatePlanCsv(profile, route);
  assert.match(csv, /Prospective requirement/);
  assert.match(csv, /WCC-AIG-36 Gate Plan/);
  assert.match(csv, /WCC-AIG-40 Gate Map/);
  assert.match(csv, /not an event, condition or approval/);
  assert.match(csv, /Draft only/);
  assert.match(csv, /Decision question for the authorised forum/);
  assert.match(csv, /\?"/);
  assert.doesNotMatch(csv, /WCC-AIG-38\/40/);
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
  assert.equal(handoff.rows.find((row) => row[1] === "Event ID")[3], "");
  assert.equal(handoff.rows.find((row) => row[1] === "Operational Status")[3], "");
  assert.match(handoff.readiness.status, /unverified/);
  assert.equal(handoff.readiness.complete, false);
  assert.ok(handoff.rows.some((row) => row[1] === "AIR-ID evidence ref"));
  assert.ok(handoff.rows.some((row) => row[1] === "Authority / delegation evidence ref"));
  assert.ok(handoff.rows.some((row) => row[1] === "Condition/action"));
  assert.ok(handoff.rows.every((row) =>
    (row[2].includes("Exact 36 contract") || row[2].includes("Prompt")) &&
    (row[4].includes("proposal") || row[4].includes("No value asserted"))
  ));
  const decision = logic.buildRetirementDecisionRecord(retirement);
  assert.match(decision, /NOT A FORMAL WCC-AIG-16 RECORD/);
  assert.match(decision, /User-entered draft: Progress \(not verified or approved\)/);
  assert.match(decision, /no readiness or completion conclusion/);
  assert.match(decision, /AIR-ID evidence in current 05/);
  assert.match(decision, /authority; self-report is insufficient/);
  assert.doesNotMatch(decision, /All retirement conditions met/);
});

test("36 retirement export names all Gate Plan, Gate Event and Gate Condition contract fields", () => {
  const handoff = logic.buildRetirementGateLogRow({ systemName: "Legacy service" });
  const fieldsFor = (sheet) => new Set(
    handoff.rows
      .filter((row) => row[0].includes(sheet))
      .map((row) => row[1]),
  );
  for (const field of ["Plan ID", "AIR-ID", "Gate/forum", "Trigger/lifecycle", "Requirement", "Basis/triage ref", "Target date", "Responsible role", "Plan state", "waiver rationale+authority", "Source version", "Plan QA"]) {
    assert.ok(fieldsFor("Gate Plan").has(field), `Gate Plan handoff lacks ${field}`);
  }
  for (const field of ["Event ID", "AIR-ID", "Gate/forum", "Lifecycle stage at event", "Decision date", "Decision", "Assurance opinion ref", "Decision-maker/role", "Next gate", "Event notes", "Decision record/minutes ref", "Technical snapshot/as-at ref", "Event record state", "Recorded by/role", "Evidence source/URI", "Event QA", "Plan ID", "priority override fields"]) {
    assert.ok(fieldsFor("Gate Events").has(field), `Gate Events handoff lacks ${field}`);
  }
  for (const field of ["Condition ID", "Event ID", "AIR-ID derived", "Condition/action", "Action owner/role", "Due date", "Condition state", "Resolved/waived on", "Resolution evidence/waiver authority ref", "Overdue derived", "Condition QA"]) {
    assert.ok(fieldsFor("Gate Conditions").has(field), `Gate Conditions handoff lacks ${field}`);
  }
  assert.ok(handoff.rows.filter((row) => row[0].includes("Gate Events")).every((row) =>
    row[4].includes("pending verification") || row[4].includes("No value asserted")
  ));
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
  assert.ok(readiness.outstanding.some((item) => /AIR-ID evidence from the current 05 record is missing/.test(item)));
  assert.ok(readiness.outstanding.some((item) => /Decision authority \/ delegation evidence is missing/.test(item)));
});

test("screening handoffs preserve pending legal applicability and evidence", () => {
  const { profile, results } = fixture();
  const handoff = logic.buildArtefactHandoff(profile, results);
  for (const artefact of [
    "WCC-AIG-10 Data Protection Impact Assessment",
    "WCC-AIG-11 Equality Impact Assessment",
    "WCC-AIG-12 Human Rights Assessment",
    "WCC-AIG-15 ATRS Record",
  ]) {
    const item = handoff.find((entry) => entry.artefact === artefact);
    assert.ok(item, `missing handoff for ${artefact}`);
    assert.ok(item.fields.some((field) => field.label === "Applicability owner" && /pending/.test(field.value)));
    assert.ok(item.fields.some((field) => field.label === "Evidence reference" && /Pending/.test(field.value)));
    assert.ok(item.fields.some((field) => field.label === "Screening status" && /Not completed/.test(field.value)));
    assert.match(item.note, /legal N\/A/);
  }
  assert.match(results.requirements.atrs, /owner applicability confirmation pending/);
});

test("agentic handoff routes 48, 45, 46, 39 and 50 without granting authority", () => {
  const { profile, results } = fixture();
  profile.capability = "Agentic AI";
  profile.actionAuthority = "Acts within defined bounds — monitored";
  results.triggerIds = ["agentic"];
  results.requirements = logic.assessmentRequirements(profile, results);
  const handoff = logic.buildArtefactHandoff(profile, results);
  const targets = handoff.map((item) => item.artefact).join("\n");
  for (const id of ["WCC-AIG-48", "WCC-AIG-45", "WCC-AIG-46", "WCC-AIG-39", "WCC-AIG-50"]) {
    assert.match(targets, new RegExp(id));
  }
  assert.match(handoff.find((item) => item.artefact.includes("WCC-AIG-46")).note, /not a grant of authority/);
  assert.match(handoff.find((item) => item.artefact.includes("WCC-AIG-50")).note, /No action record, decision or authority is created/);
});

test("canonical JSON labels itself as draft and carries no approval or agent authority", () => {
  const { profile, results } = fixture();
  const route = logic.buildRoute(profile, results, {});
  const calculation = {
    profile,
    results,
    agpiScores: Object.fromEntries(logic.DIMENSIONS.map(({ id }) => [id, 1])),
    impactScores: {},
    forums: {},
    route,
    evidence: [],
  };
  const json = JSON.stringify(logic.buildCanonicalRecord(calculation, undefined, null, "2026-09-25T00:00:00.000Z"));
  const record = JSON.parse(json);
  assert.equal(record.suiteVersion, "Proposed integrated AI governance suite draft — not approved");
  assert.equal(record.exportedAt, "2026-09-25T00:00:00.000Z");
  assert.equal(record.agentic.assessment, null);
  assert.match(record.authorityBoundary.note, /does not evidence gate approval/);
  assert.match(JSON.stringify(record.governance.plannedRoute[0]), /Is the proposal/);
});

test("38 handoff leaves preparer and actual assessment date blank and asks a decision question", () => {
  const { profile, results } = fixture();
  const calculation = {
    profile,
    results,
    route: logic.buildRoute(profile, results, {}),
  };
  const csv = logic.buildDecisionReadyHandoff(calculation);
  assert.match(csv, /WCC-AIG-38 field reference/);
  assert.match(csv, /Prepared by \(owner to complete\)/);
  assert.match(csv, /actual date; do not use export date/);
  assert.match(csv, /Decision question for this forum \(not an attained decision\)/);
  assert.doesNotMatch(csv, /AI Assurance function/);
  assert.doesNotMatch(csv, /25\/09\/2026/);
  assert.match(csv, /not an import-ready record/);
  assert.match(csv, /Is the proposal aligned/);
});

test("every output button has a maintained source handler and export gate", () => {
  const root = path.resolve(__dirname, "..");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const app = fs.readFileSync(path.join(root, "src/triage-app.js"), "utf8");
  const retire = fs.readFileSync(path.join(root, "src/retire-app.js"), "utf8");
  const triage = {
    downloadRegister: "registerExport",
    downloadCanonical: "canonicalExport",
    downloadAgpi: "agpiExport",
    downloadRisk: "riskExport",
    downloadGateReady: "gateReadyExport",
    downloadGates: "gateExport",
    downloadHandoff: "handoffExport",
    downloadAgent: "agentExport",
    downloadCapabilities: "capabilityVectorExport",
    downloadAgenticGovernance: "agenticGovernanceExport",
    downloadSummary: "summaryExport",
  };
  for (const [id, handler] of Object.entries(triage)) {
    assert.match(html, new RegExp(`id="${id}"`), `${id} exists in DOM`);
    assert.match(app, new RegExp(`byId\\("${id}"\\)\\.addEventListener\\("click", ${handler}\\)`), `${id} maps to ${handler}`);
    const start = app.indexOf(`function ${handler}()`);
    const body = app.slice(start, app.indexOf("\n  function ", start + 10));
    assert.match(body, /validateForExport\(\)/, `${handler} applies export validation`);
  }
  for (const id of ["retireDownloadGateLog", "retireDownloadDecision"]) {
    assert.match(html, new RegExp(`id="${id}"`), `${id} exists in DOM`);
    const start = retire.indexOf(`byId("${id}").addEventListener("click"`);
    const end = retire.indexOf("\n  });", start);
    const body = retire.slice(start, end);
    assert.ok(start >= 0, `${id} has a click handler`);
    assert.match(body, /if \(!validate\(\)\) return;/, `${id} applies retirement export validation`);
    assert.match(body, /download\(/, `${id} downloads output`);
  }
  assert.equal(Object.keys(triage).length + 2, 13, "this revision exposes 13 output buttons (not 14)");
});

test("AGPI score cards have explicit accessible labels and label-wide pointer targets", () => {
  const root = path.resolve(__dirname, "..");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const app = fs.readFileSync(path.join(root, "src/triage-app.js"), "utf8");
  assert.match(app, /input\.id = `score-\$\{dimension\.id\}-\$\{score\}`/);
  assert.match(app, /label\.htmlFor = input\.id/);
  assert.match(app, /label\.append\(input, span\)/);
  assert.match(html, /\.scale > label > span \{[\s\S]*?pointer-events: none;/);
  assert.match(html, /\.scale label \{[\s\S]*?display: block;[\s\S]*?cursor: pointer;/);
});

test("default scores and computed route tiers stay visibly provisional", () => {
  const root = path.resolve(__dirname, "..");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const app = fs.readFileSync(path.join(root, "src/triage-app.js"), "utf8");
  assert.match(html, /id="riskProvisionalCue"/);
  assert.match(html, /id="priorityProvisionalCue"/);
  assert.match(html, /Provisional triage route · not current 05 assurance/);
  assert.match(app, /Synthetic \/ incomplete example: untouched score fields still use built-in defaults/);
  assert.match(app, /not current 05 assurance/);
  assert.match(app, /Provisional · \$\{results\.effectiveTierName\}/);
  assert.doesNotMatch(html, /id="inherentRisk">6</);
  assert.doesNotMatch(html, /id="residualRisk">3\.6</);
});