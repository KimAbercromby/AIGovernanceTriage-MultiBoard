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

test("AIG-INV-04 export is a draft handoff and never manufactures system identity or assurance state", () => {
  const { profile, results } = fixture();
  const draft = logic.buildRegisterDraftHandoff(profile, results, null);
  assert.deepEqual(draft.headers, logic.DRAFT_HANDOFF_HEADERS);
  assert.ok(draft.rows.every((row) => row.length === draft.headers.length));

  const supportedFields = {
    "AI Register": [
      "AIR-ID", "System name", "Purpose and boundary", "Service area", "Service Owner",
      "Supplier / source", "Lifecycle stage", "Approval status", "Operational status",
      "Can it act?", "Decision record ref", "Latest gate Event ID",
      "Assessment / evidence ref", "Next review",
    ],
    "Assessment summary": [
      "AIR-ID", "Priority (AIG-ASS-01)", "AIG-ASS-01 ref / date", "Risk tier (AIG-ASS-02)", "AIG-ASS-02 ref / date",
      "Agency tier (AIG-AGT-02/AIG-AGT-03)", "AIG-AGT-02/AIG-AGT-03 ref / date", "Privacy / DPIA position",
      "Equality / EIA position", "Other specialist finding refs", "AIG-AGT-04 Agent Record ref",
      "AIG-AGT-05 Authority Graph ref", "AIG-OPS-02 Monitoring ref", "As-at date",
    ],
  };
  assert.deepEqual([...new Set(draft.rows.map((row) => row[0]))].sort(), Object.keys(supportedFields).sort());
  assert.ok(draft.rows.every(([sheet, field]) => supportedFields[sheet].includes(field)),
    "every suggestion must use a field name on the proposed workbook's real sheets");
  assert.ok(draft.rows.some((row) => row[0] === "AI Register" && row[1] === "System name"));
  assert.ok(draft.rows.some((row) => row[0] === "Assessment summary" && row[1] === "Priority (AIG-ASS-01)"));
  assert.ok(draft.rows.every((row) => !/Register Core|Assurance Snapshot/.test(row[0])));
  assert.ok(draft.rows.every((row) => !/Approved Purpose \/ Boundary|Governance Approval Status|Is Agent\?|Agent Record \(AIG-AGT-04\) Ref|AGPI \/ assurance \/ risk result/.test(row[1])));

  const get = (sheet, field) => draft.rows.find((row) => row[0] === sheet && row[1] === field);
  const identity = get("AI Register", "AIR-ID");
  assert.match(identity[2], /Proposed AIG-INV-04/);
  assert.equal(identity[3], "");
  assert.match(identity[5], /Council-issued AIR-ID/);
  assert.match(identity[4], /No value asserted/);
  assert.equal(get("AI Register", "Approval status")[3], "");
  assert.equal(get("AI Register", "Operational status")[3], "");
  assert.equal(get("AI Register", "Can it act?")[3], "");
  assert.match(get("AI Register", "Purpose and boundary")[5], /not approved purpose/);
  assert.equal(get("Assessment summary", "AIG-AGT-04 Agent Record ref")[3], "");
  assert.equal(get("Assessment summary", "AIG-AGT-05 Authority Graph ref")[3], "");
});

test("Capabilities and System Map handoff proposes UC→CAP without minting IDs or requiring AIR-ID", () => {
  const { profile } = fixture();
  const handoff = logic.buildCapabilitiesMapHandoff(profile);
  assert.deepEqual(handoff.headers, [
    "Target workbook / sheet",
    "Suggested field",
    "Draft proposal",
    "Review, evidence or authority still required",
  ]);
  assert.ok(handoff.rows.every((row) => row.length === handoff.headers.length));
  assert.equal(handoff.rows.find((row) => row[1] === "UC-ID")[2], "");
  assert.equal(handoff.rows.find((row) => row[1] === "CAP-ID")[2], "");
  assert.match(handoff.rows.find((row) => row[1] === "From type / ID → relationship → To type / ID")[2], /UC \/ blank → requires → CAP \/ blank/);
  assert.match(handoff.rows.find((row) => row[1] === "AIR context")[3], /Leave blank for UC → CAP/);
  assert.match(handoff.rows.find((row) => row[1] === "System entry")[3], /without an existing official AIR-ID/);
  assert.match(handoff.rows.find((row) => row[1] === "Authority and record boundaries")[3], /AIG-AGT-04 is authoritative.*AIG-AGT-05 is a derived delegation view/);
});

test("AIG-DEC-04 gate-plan output is a prospective plan handoff, not an event row", () => {
  const { profile, results } = fixture();
  const route = logic.buildRoute(profile, results, {});
  const csv = logic.buildGatePlanCsv(profile, route);
  assert.match(csv, /Prospective requirement/);
  assert.match(csv, /not an event, condition or approval/);
  assert.match(csv, /Draft only/);
  assert.doesNotMatch(csv, /Event ID/);
});

test("formal decisions stay with AIG-DEC-03 and AIG-DEC-04 record types stay distinct", () => {
  const { profile, results } = fixture();
  const handoff = logic.buildArtefactHandoff(profile, results);
  const decision = handoff.find((item) => item.artefact.includes("AIG-DEC-03"));
  assert.match(decision.note, /does not create an AIR-ID, plan\/event\/condition row, approval/);
  assert.match(decision.fields[1].value, /Gate Plans, dated Gate Events and event-linked Gate Conditions/);
});

test("public triage offers the proposed controlled AIG-INV-05 map handoff without geographic branding", () => {
  const html = require("node:fs").readFileSync(require("node:path").join(__dirname, "../index.html"), "utf8");
  assert.match(html, /downloadCapabilitiesMap/);
  assert.match(html, /proposed AIG-INV-05 map handoff/i);
  assert.match(html, /AIG-INV-05 Capabilities and System Map/);
  assert.match(html, /UC → CAP needs no AIR-ID · relationship pointers only, not decision authority/);
  assert.match(html, /AIG-INV-04 \(AI Register\) owns the permanent Council-issued AIR-ID.*AIG-DEC-04 \(Gate Log\).*AIG-INV-05/);
  assert.doesNotMatch(html, /Westminster/i);
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
  const operationalStatus = handoff.rows.find((row) => row[1] === "Operational status");
  assert.equal(operationalStatus[0], "AI Register");
  assert.equal(operationalStatus[3], "");
  assert.match(handoff.readiness.status, /unverified/);
  assert.equal(handoff.readiness.complete, false);
  assert.ok(handoff.rows.some((row) => row[1] === "AIR-ID"));
  assert.ok(handoff.rows.some((row) => row[0] === "Assessment summary" && row[1] === "Other specialist finding refs"));
  const decision = logic.buildRetirementDecisionRecord(retirement);
  assert.match(decision, /NOT A FORMAL AIG-DEC-03 RECORD/);
  assert.match(decision, /User-entered draft: Progress \(not verified or approved\)/);
  assert.match(decision, /no readiness or completion conclusion/);
  assert.match(decision, /AIR-ID evidence in AIG-INV-04/);
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
  assert.ok(readiness.outstanding.some((item) => /Current AIG-INV-04 governance priority not verified/.test(item)));
  assert.ok(readiness.outstanding.some((item) => /Current AIG-INV-04 assurance\/risk tier not verified/.test(item)));
});

test("AIG-DEC-04 retirement handoff includes the separate plan, event and condition contracts", () => {
  const handoff = logic.buildRetirementGateLogRow({ systemName: "Legacy service" });
  const fieldsFor = (sheet) => new Set(
    handoff.rows.filter((row) => row[0].includes(sheet)).map((row) => row[1]),
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
  assert.ok(handoff.rows.every((row) =>
    (row[2].includes("AIG-DEC-04 contract") || row[2].includes("Proposed AIG-INV-04") || row[2].includes("Prompt")) &&
    (row[4].includes("proposal") || row[4].includes("No value asserted"))
  ));
});

test("specialist screening handoffs preserve pending applicability and evidence", () => {
  const { profile, results } = fixture();
  const handoff = logic.buildArtefactHandoff(profile, results);
  for (const artefact of [
    "AIG-ASS-05 Data Protection Impact Assessment",
    "AIG-ASS-06 Equality Impact Assessment",
    "AIG-ASS-07 Human Rights Assessment",
    "AIG-ASS-10 ATRS Record",
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

test("agentic handoff routes the grouped AGT/OPS artefacts without granting authority", () => {
  const { profile, results } = fixture();
  profile.capability = "Agentic AI";
  profile.actionAuthority = "Acts within defined bounds — monitored";
  results.triggerIds = ["agentic"];
  results.requirements = logic.assessmentRequirements(profile, results);
  const handoff = logic.buildArtefactHandoff(profile, results);
  const targets = handoff.map((item) => item.artefact).join("\n");
  for (const id of ["AIG-AGT-03", "AIG-AGT-04", "AIG-AGT-05", "AIG-OPS-02", "AIG-AGT-06"]) {
    assert.match(targets, new RegExp(id));
  }
  assert.match(handoff.find((item) => item.artefact.includes("AIG-AGT-05")).note, /not a grant of authority/);
  assert.match(handoff.find((item) => item.artefact.includes("AIG-AGT-06")).note, /No action record, decision or authority is created/);
});

test("canonical JSON and AIG-DEC-02 handoff remain provisional", () => {
  const { profile, results } = fixture();
  const route = logic.buildRoute(profile, results, {});
  const calculation = {
    profile, results,
    agpiScores: Object.fromEntries(logic.DIMENSIONS.map(({ id }) => [id, 1])),
    impactScores: {}, forums: {}, route, evidence: [],
  };
  const record = logic.buildCanonicalRecord(calculation, undefined, null, "2026-09-25T00:00:00.000Z");
  assert.equal(record.exportedAt, "2026-09-25T00:00:00.000Z");
  assert.equal(record.agentic.assessment, null);
  assert.match(record.authorityBoundary.note, /does not evidence gate approval/);
  assert.match(JSON.stringify(record.governance.plannedRoute[0]), /Is the proposal/);
  const csv = logic.buildDecisionReadyHandoff(calculation);
  assert.match(csv, /AIG-DEC-02 field reference/);
  assert.match(csv, /Prepared by \(owner to complete\)/);
  assert.match(csv, /actual date; do not use export date/);
  assert.match(csv, /Decision question for this forum \(not an attained decision\)/);
  assert.doesNotMatch(csv, /AI Assurance function/);
  assert.match(csv, /not an import-ready record/);
});

test("agentic exports are bound to the profile and answers that were reviewed", () => {
  const profile = fixture().profile;
  const inputs = { dimensions: { autonomy: 2 }, multipliers: ["Delegation"] };
  const assessment = logic.computeAgentic(inputs);
  const reviewedKey = logic.agenticContextKey(profile, inputs);

  assert.equal(
    logic.currentAgenticAssessment(assessment, reviewedKey, profile, inputs),
    assessment,
  );
  assert.equal(
    logic.currentAgenticAssessment(
      assessment,
      reviewedKey,
      { ...profile, systemName: "Different system" },
      inputs,
    ),
    null,
  );
  assert.equal(
    logic.currentAgenticAssessment(
      assessment,
      reviewedKey,
      profile,
      { ...inputs, dimensions: { autonomy: 4 } },
    ),
    null,
  );

  const app = require("node:fs").readFileSync(
    require("node:path").join(__dirname, "../src/triage-app.js"),
    "utf8",
  );
  assert.match(app, /function validateForExport\(\)[\s\S]*?logic\.currentAgenticAssessment/);
  assert.match(app, /buildCanonicalRecord\(calculation, latestAgentic \? readAgentic\(\) : null, latestAgentic\)/);
});

test("accessible score cards and default calculations stay visibly provisional", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const root = path.resolve(__dirname, "..");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const app = fs.readFileSync(path.join(root, "src/triage-app.js"), "utf8");
  assert.match(app, /input\.id = `score-\$\{dimension\.id\}-\$\{score\}`/);
  assert.match(app, /label\.htmlFor = input\.id/);
  assert.match(html, /id="riskProvisionalCue"/);
  assert.match(html, /id="priorityProvisionalCue"/);
  assert.match(app, /Synthetic \/ incomplete example: untouched score fields still use built-in defaults/);
  assert.match(app, /not current AIG-INV-04 assurance/);
  assert.match(html, /\.scale > label > span \{[\s\S]*?pointer-events: none;/);
  assert.match(html, /\.scale label \{[\s\S]*?display: block;[\s\S]*?cursor: pointer;/);
});