"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const logic = require("../src/triage-logic.js");

function fixture({ dataType = "None", tier = "Low" } = {}) {
  const profile = {
    registerId: "",
    ucId: "",
    ucIdStatus: "Pending — no UC-ID entered",
    systemName: "Example system",
    purpose: "Draft purpose",
    usePurpose: "Draft use outcome",
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
  assert.equal(draft.rows.find((row) =>
    row[0] === "Assessment summary" && row[1] === "Priority (AIG-ASS-01)")[3], "");
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
  assert.match(handoff.rows.find((row) => row[1] === "From type / ID → relationship → To type / ID")[2], /UC \/ blank \(pending\) → requires → CAP \/ blank/);
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

test("use-scoped handoffs carry exact outcome and operator UC-ID without issuing authority", () => {
  const { profile, results } = fixture();
  profile.registerId = "AIR-EXAMPLE";
  profile.ucId = "UC-EXAMPLE";
  profile.ucIdStatus = "Provisional — operator-entered, unverified";
  profile.usePurpose = 'Prioritise "one" case workflow for review';
  const register = logic.buildRegisterDraftHandoff(profile, results, null);
  const priority = register.rows.find((row) =>
    row[0] === "Assessment summary" && row[1] === "Priority (AIG-ASS-01)");
  assert.equal(priority[3], "", "UC-specific triage priority must not populate the one-row-per-AIR-ID system summary");
  assert.match(priority[5], /one-row-per-AIR-ID system summary/);
  assert.match(priority[5], /UC-ID UC-EXAMPLE/);
  assert.match(priority[5], /Prioritise "one" case workflow for review/);
  assert.match(priority[5], /Re-score materially different uses separately/);

  const map = logic.buildCapabilitiesMapHandoff(profile, results);
  assert.equal(map.rows.find((row) => row[1] === "UC-ID")[2], "UC-EXAMPLE");
  assert.match(map.rows.find((row) => row[1] === "UC-ID")[3], /never issues identifiers or verifies an ID/);
  assert.equal(map.rows.find((row) => row[1] === "Outcome-led use case")[2], profile.usePurpose);
  assert.match(map.rows.find((row) => row[1] === "From type / ID → relationship → To type / ID")[2], /UC \/ UC-EXAMPLE → requires → CAP \/ blank/);
  assert.ok(map.rows.some((row) => row[0].includes("UC_ID_Risk_Decision_Current_View") &&
    row[1] === "AIG-DEC-04 dated Decision Event ID / date" &&
    row[2] === ""));
  assert.match(map.rows.find((row) => row[1] === "AGPI priority (UC-specific)")[2], /Triage prompt only/);
  assert.match(map.rows.find((row) => row[1] === "Risk tier (UC-specific)")[2], /Triage prompt only/);
  assert.ok(map.rows.every((row) => row.length === map.headers.length));

  const route = logic.buildRoute(profile, results, {});
  const plan = logic.buildGatePlanCsv(profile, route);
  assert.match(plan, /UC-EXAMPLE/);
  assert.match(plan, /UC-ID specific/);
  assert.match(plan, /Prioritise ""one"" case workflow for review/);
  assert.match(plan, /not a decision, approval or Gate Event/);

  const artifacts = logic.buildArtefactHandoff(profile, results);
  const scope = artifacts.find((item) => item.artefact.startsWith("UC-ID-scoped triage context"));
  assert.ok(scope);
  assert.equal(scope.fields.find((field) => field.label === "Exact purpose / outcome scoped to this triage").value, profile.usePurpose);
  assert.match(scope.note, /does not create approval, decision status, delegated authority or a gate event/);
  const exported = logic.buildHandoffCsv(profile, results);
  assert.match(exported, /UC-EXAMPLE/);
  assert.match(exported, /Prioritise ""one"" case workflow for review/);
});

test("a pending UC-ID is explicit in AIG-INV-05 handoff and does not mint an identifier", () => {
  const { profile, results } = fixture();
  const handoff = logic.buildCapabilitiesMapHandoff(profile);
  const id = handoff.rows.find((row) => row[1] === "UC-ID");
  assert.equal(id[2], "");
  assert.match(id[3], /UC-ID pending by operator choice/);
  assert.match(id[3], /blank does not mean shared system baseline/);
  assert.match(handoff.rows.find((row) => row[1] === "UC-ID status (operator entry only)")[2], /Pending/);
  const plan = logic.buildGatePlanCsv(profile, logic.buildRoute(profile, results, {}));
  assert.match(plan, /pending UC-ID remains use-specific, not baseline/);
  assert.match(plan, /Pending — no UC-ID entered; use-specific provisional case, not shared system baseline/);
  assert.match(plan, /UC-ID specific/);
  const decisionPaper = logic.buildDecisionReadyHandoff({
    profile,
    results,
    route: logic.buildRoute(profile, results, {}),
  });
  assert.match(decisionPaper, /Pending — no UC-ID entered; use-specific provisional case/);
  assert.match(decisionPaper, /Draft use outcome/);
  const artifactCsv = logic.buildHandoffCsv(profile, results);
  assert.match(artifactCsv, /Pending — not entered/);
  assert.match(artifactCsv, /Draft use outcome/);
  const app = require("node:fs").readFileSync(require("node:path").join(__dirname, "../src/triage-app.js"), "utf8");
  assert.match(app, /pending use-specific ID is distinct/);
  assert.match(app, /UC-ID-specific provisional use triage; ID pending, not a selected shared system baseline/);
  assert.match(app, /Triage \/ assessment scope", "UC-ID-specific"/);
});

test("materially different uses retain separate triage priorities without writing either to the system summary", () => {
  const { profile: base, results: baselineResults } = fixture();
  const lowProfile = {
    ...base,
    ucId: "UC-LOW",
    ucIdStatus: "Existing — operator says verified; owner must re-check",
    usePurpose: "Drafting routine internal correspondence",
  };
  const highProfile = {
    ...base,
    ucId: "UC-HIGH",
    ucIdStatus: "Provisional — operator-entered, unverified",
    usePurpose: "Recommending statutory eligibility outcomes",
  };
  const lowResults = {
    ...baselineResults,
    agpiScore: 10,
    priority: logic.priorityFor(10),
  };
  const highResults = {
    ...baselineResults,
    agpiScore: 95,
    priority: logic.priorityFor(95),
  };
  const lowSystemHandoff = logic.buildRegisterDraftHandoff(lowProfile, lowResults, null);
  const highSystemHandoff = logic.buildRegisterDraftHandoff(highProfile, highResults, null);
  const systemPriority = (handoff) => handoff.rows.find((row) =>
    row[0] === "Assessment summary" && row[1] === "Priority (AIG-ASS-01)");
  assert.equal(systemPriority(lowSystemHandoff)[3], "");
  assert.equal(systemPriority(highSystemHandoff)[3], "");
  assert.match(systemPriority(lowSystemHandoff)[5], /Priority 5/);
  assert.match(systemPriority(highSystemHandoff)[5], /Priority 1/);
  const lowCurrentView = logic.buildCapabilitiesMapHandoff(lowProfile, lowResults);
  const highCurrentView = logic.buildCapabilitiesMapHandoff(highProfile, highResults);
  assert.match(lowCurrentView.rows.find((row) => row[1] === "AGPI priority (UC-specific)")[2], /Priority 5/);
  assert.match(highCurrentView.rows.find((row) => row[1] === "AGPI priority (UC-specific)")[2], /Priority 1/);
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

test("triage and retirement show a continuous AIR-ID trail without claiming live updates", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  const triage = fs.readFileSync(path.join(__dirname, "../src/triage-app.js"), "utf8");
  const retire = fs.readFileSync(path.join(__dirname, "../src/retire-app.js"), "utf8");
  assert.match(html, /id="continuityIdentity"/);
  assert.match(html, /id="continuityNext"/);
  assert.match(html, /id="retireContinuityIdentity"/);
  assert.match(html, /AIG-DEC-03 or approved minutes; cite it in a dated AIG-DEC-04 Gate Event/);
  assert.match(html, /no case details transferred/i);
  assert.match(html, /No retirement decision, Gate Event or Register update is made here/);
  assert.match(triage, /renderContinuity\(profile, route\)/);
  assert.match(retire, /byId\("retireContinuityIdentity"\)\.textContent/);
  const liveTriage = html.split('<script id="triage-app">')[1]?.split("</script>")[0];
  const liveRetire = html.split('<script id="retire-app">')[1]?.split("</script>")[0];
  assert.ok(liveTriage && liveRetire, "the public page embeds both active scripts");
  assert.match(liveTriage, /function renderContinuity\(profile, route\)/);
  assert.match(liveTriage, /renderContinuity\(profile, route\)/);
  assert.match(liveRetire, /byId\("retireContinuityIdentity"\)\.textContent/);
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
  assert.match(csv, /UC-ID \(scope reference only; verify; never create\)/);
  assert.match(csv, /UC-ID entry status \(operator statement only; not verification\)/);
  assert.match(csv, /Exact use purpose \/ outcome scoped to this triage/);
});

test("browser UI collects exact UC scope and rejects contradictory ID status before exports", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const root = path.resolve(__dirname, "..");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const app = fs.readFileSync(path.join(root, "src/triage-app.js"), "utf8");
  assert.match(html, /id="ucId"/);
  assert.match(html, /id="ucIdStatus"/);
  assert.match(html, /<textarea id="usePurpose" rows="2" required>/);
  assert.match(html, /including\s*\n?\s*non-agentic uses/);
  assert.match(app, /UC-ID and choose Existing or Provisional/);
  assert.match(app, /never issues or verifies a UC-ID/);
  assert.match(app, /This AGPI triage applies only to UC-ID/);
  assert.match(app, /This risk triage applies only to UC-ID/);
  assert.doesNotMatch(app, /AGPI Priority \(from AIG-INV-04\)/);
  assert.match(app, /Current system AGPI Priority \(verify AIG-INV-04\)/);
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