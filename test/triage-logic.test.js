"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const logic = require("../src/triage-logic.js");
// Header rows and controlled lists read from the suite v3.9.7 workbooks
// (regenerate with scripts/extract-suite-fixture.py).
const contract = require("./fixtures/suite-v3.9.7-contract.json");
const PRIORITY_ASS = "Effective Governance Priority (AIG-ASS-01, after any authorised override)";
const OPERATIONAL = "Operational Status (system baseline)";

function fixture({ dataType = "None", tier = "Low" } = {}) {
  const profile = {
    fastTrack: "All ten No",
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
  // Section names are the documents' own headings; the all-tier screening rule is in the note.
  assert.ok(handoff.some((item) => item.artefact.includes("Equality") &&
    item.section.includes("Purpose and Affected Groups") && /Screen every system/.test(item.note)));
  assert.ok(handoff.some((item) => item.artefact.includes("Human Rights") &&
    item.section.includes("Convention and Protocol Rights Screening") && /Screen every system/.test(item.note)));
  assert.equal(low.results.requirements.dpiaScreening, true);
});

test("AIG-INV-04 export is a draft handoff and never manufactures system identity or assurance state", () => {
  const { profile, results } = fixture();
  const draft = logic.buildRegisterDraftHandoff(profile, results, null);
  assert.deepEqual(draft.headers, logic.DRAFT_HANDOFF_HEADERS);
  assert.ok(draft.rows.every((row) => row.length === draft.headers.length));

  const supportedFields = {
    "AI Register": contract["INV-04"]["AI Register"].headers.filter((h) => h !== "Row check"),
    "Assessment summary": contract["INV-04"]["Assessment summary"].headers.filter((h) => h !== "Row check"),
  };
  assert.deepEqual([...new Set(draft.rows.map((row) => row[0]))].sort(), Object.keys(supportedFields).sort());
  for (const [sheet, fields] of Object.entries(supportedFields)) {
    assert.deepEqual(draft.rows.filter((row) => row[0] === sheet).map((row) => row[1]), fields,
      `${sheet}: one row per v3.9.7 workbook column, in order`);
  }
  assert.equal(draft.rows.find((row) =>
    row[0] === "Assessment summary" && row[1] === PRIORITY_ASS)[3], "");
  assert.ok(draft.rows.every((row) => !/Register Core|Assurance Snapshot/.test(row[0])));
  assert.ok(draft.rows.every((row) => !/Approved Purpose \/ Boundary|Is Agent\?|Agent Record \(AIG-AGT-04\) Ref|AGPI \/ assurance \/ risk result/.test(row[1])));

  const get = (sheet, field) => draft.rows.find((row) => row[0] === sheet && row[1] === field);
  const identity = get("AI Register", "AIR-ID");
  assert.match(identity[2], /Proposed AIG-INV-04/);
  assert.equal(identity[3], "");
  assert.match(identity[5], /Council-issued AIR-ID/);
  assert.match(identity[4], /No value asserted/);
  assert.equal(get("AI Register", "Governance Approval Status (system baseline; not use approval)")[3], "");
  assert.equal(get("AI Register", OPERATIONAL)[3], "");
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
  const rel = (label) => handoff.rows.find((row) => row[0].endsWith("/ Relationships") && row[1] === label);
  assert.deepEqual(["From type", "From ID", "Relationship", "To type", "To ID"].map((l) => rel(l)[2]), ["UC", "", "requires", "CAP", ""]);
  assert.match(handoff.rows.find((row) => row[1] === "AIR context")[3], /Leave blank for UC → CAP/);
  assert.match(handoff.rows.find((row) => row[1] === "Note (not a column) — System entry")[3], /without an existing official AIR-ID/);
  assert.match(handoff.rows.find((row) => row[1] === "Note (not a column) — Authority and record boundaries")[3], /AIG-AGT-04 is authoritative.*AIG-AGT-05 is a derived delegation view/);
});

test("AIG-DEC-04 gate-plan output is paste-ready for the Gate plan sheet, not an event row", () => {
  const { profile, results } = fixture();
  profile.registerId = "AIR-EXAMPLE";
  const route = logic.buildRoute(profile, results, {});
  const csv = logic.buildGatePlanCsv(profile, route, results);
  const lines = csv.replace(/^\uFEFF/, "").trim().split("\r\n");
  const header = lines[0].split('","').map((cell) => cell.replace(/^"|"$/g, ""));
  // Columns A to L must match the AIG-DEC-04 "Gate plan" sheet exactly, in order.
  assert.deepEqual(header.slice(0, 12), [
    "Plan ID", "AIR-ID", "Gate / forum", "Trigger / stage", "Requirement",
    "Basis / triage ref", "Target date", "Responsible role", "Plan state",
    "N-A / waiver rationale and authority ref",
    "UC-ID scope(s) (blank only for explicit system baseline)",
    "Decision scope (UC-ID specific / Shared system baseline)",
  ]);
  assert.deepEqual(header.slice(0, 12), logic.GATE_PLAN_HEADERS);
  assert.equal(header[12], logic.GATE_PLAN_ROW_CHECK_NOTE, "column M (the workbook Row check) is labelled, not pasted");
  assert.ok(header.slice(13).every((h) => h.startsWith("Guidance only, do not paste")));
  assert.equal(lines.length, route.filter((gate) => gate.gate).length + 1);
  const rows = lines.slice(1).map((line) => line.split('","').map((cell) => cell.replace(/^"|"$/g, "")));
  rows.forEach((row) => {
    assert.equal(row.length, header.length);
    assert.equal(row[0], "", "Plan ID is left for the governance steward");
    assert.equal(row[1], "AIR-EXAMPLE");
    assert.ok(["Required", "Conditional", "Not applicable"].includes(row[4]));
    // v3.9.7: column J is left for the governance steward (the DEC-04 row check then
    // asks for the rationale and authority ref); a proposed N/A rationale goes in the
    // handoff guidance column. Gates 1 and 3 can also be proposed N/A (Gate 1 and 3 rule).
    assert.equal(row[9], "");
    if (row[4] === "Not applicable") {
      assert.ok(["Gate 1 Strategic prioritisation", "Gate 3 Case for change / strategic alignment", "Gate 4 Procurement"].includes(row[2]));
      assert.match(row[row.length - 1], /Proposed N\/A rationale for column J/);
    }
    assert.equal(row[6], "", "Target date is left blank");
    assert.equal(row[8], "Planned");
    assert.ok(["Planned", "Complete", "Superseded", "Cancelled"].includes(row[8]));
    assert.ok(["UC-ID specific", "Shared system baseline"].includes(row[11]));
  });
  assert.equal(rows.find((row) => row[2] === "Gate 4 Procurement")[4], "Not applicable", "built in-house with no procurement");
  rows.forEach((row) => assert.ok(contract["DEC-04"]["Gate plan"].lists["C4:C353"].includes(row[2]), `Gate / forum "${row[2]}" not in the AIG-DEC-04 list`));
  assert.match(rows[0][5], /AGPI \d+/);
  assert.match(csv, /not a decision, approval or Gate Event/);
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
    row[0] === "Assessment summary" && row[1] === PRIORITY_ASS);
  assert.equal(priority[3], "", "UC-specific triage priority must not populate the one-row-per-AIR-ID system summary");
  assert.match(priority[5], /one-row-per-AIR-ID system summary/);
  assert.match(priority[5], /UC-ID UC-EXAMPLE/);
  assert.match(priority[5], /Prioritise "one" case workflow for review/);
  assert.match(priority[5], /Re-score materially different uses separately/);

  const map = logic.buildCapabilitiesMapHandoff(profile, results);
  assert.equal(map.rows.find((row) => row[1] === "UC-ID")[2], "UC-EXAMPLE");
  assert.match(map.rows.find((row) => row[1] === "UC-ID")[3], /never issues identifiers or verifies an ID/);
  assert.equal(map.rows.find((row) => row[1] === "Outcome-led use case")[2], profile.usePurpose);
  assert.equal(map.rows.find((row) => row[0].endsWith("/ Relationships") && row[1] === "From ID")[2], "UC-EXAMPLE");
  assert.ok(map.rows.some((row) => row[0].includes("UC_ID_Risk_Decision_Current_View") &&
    row[1] === "AIG-DEC-04 dated Decision Event ID" &&
    row[2] === ""));
  assert.match(map.rows.find((row) => row[1] === "AGPI priority (UC-specific)")[3], /Triage prompt only/);
  assert.match(map.rows.find((row) => row[1] === "Risk tier (UC-specific)")[3], /Triage prompt only/);
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
  assert.match(handoff.rows.find((row) => row[1] === "Note (not a column) — UC-ID status (operator entry only)")[2], /Pending/);
  const plan = logic.buildGatePlanCsv(profile, logic.buildRoute(profile, results, {}), results);
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
  assert.match(app, /"UC-ID \(blank only for explicit system baseline\)", p\.ucId/);
  assert.match(app, /Note \(not imported\) — UC-ID interpretation/);
  assert.match(app, /UC-ID-specific provisional use triage; ID pending, not a selected shared system baseline/);
  // Must be a value the AIG-ASS-02 Triage Import B63 dropdown accepts.
  assert.match(app, /Triage \/ assessment scope", "UC-ID specific"/);
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
    row[0] === "Assessment summary" && row[1] === PRIORITY_ASS);
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
    priorityLabel: "Priority 5 – Observe",
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
  assert.ok(handoff.rows.some((row) => row[0] === "AIG-DEC-04 / Gate plan"));
  assert.ok(handoff.rows.some((row) => row[0] === "AIG-DEC-04 / Gate events"));
  assert.ok(handoff.rows.some((row) => row[0] === "AIG-DEC-04 / Conditions"));
  assert.ok(handoff.rows.every((row) => row.length === handoff.headers.length));
  assert.equal(handoff.rows.find((row) => row[1] === "Event ID")[3], "");
  const operationalStatus = handoff.rows.find((row) => row[1] === OPERATIONAL);
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
  const fieldsFor = (sheet) => handoff.rows
    .filter((row) => row[0] === `AIG-DEC-04 / ${sheet}` && !row[1].startsWith("Note (not a column)"))
    .map((row) => row[1]);
  // Every column of the AIG-DEC-04 Gate Log workbook (row 3), in order, except
  // formula-owned checks.
  for (const sheet of ["Gate plan", "Gate events", "Conditions"]) {
    const spec = contract["DEC-04"][sheet];
    const columns = spec.headers.filter((h, i) => !spec.formulaColumns.includes(String.fromCharCode(65 + i)));
    assert.deepEqual(fieldsFor(sheet), columns, `${sheet} handoff must list every v3.9.7 column in order`);
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
  assert.match(csv, /"Prepared by","Date","Decision required"/);
  assert.match(csv, /actual paper date; do not use the export date/);
  assert.doesNotMatch(csv, /AI Assurance function/);
  assert.match(csv, /not an import-ready record/);
  assert.match(csv, /UC-ID entry status \(operator statement only; not verification\)/);
  assert.match(csv, /exact use purpose \/ outcome scoped to this triage/);
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
  // AIG-AGT-04 v3.9.7 column name; left blank with a caveat, never filled from UC triage.
  assert.match(app, /\["AGPI Priority \(from AIG-INV-04\)", ""\]/);
  assert.match(app, /this UC-specific triage priority is not the system summary/);
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
test("Risk Assessment pre-fill rows match AIG-ASS-02 Triage Import A5:A63 exactly, in order", () => {
  const source = require("node:fs").readFileSync(require("node:path").join(__dirname, "..", "src", "triage-app.js"), "utf8");
  const start = source.indexOf("function riskPrefillCsv");
  const body = source.slice(start, source.indexOf("return fieldValueCsv(rows", start));
  const labels = [...body.matchAll(/^\s*\[\s*"([^"]+)"\s*,/gm)].map((m) => m[1]);
  const triageImport = Object.values(contract["ASS-02"]["Triage Import"].labels);
  assert.deepEqual(labels.slice(0, triageImport.length), triageImport);
  assert.ok(labels.slice(triageImport.length).every((label) => label.startsWith("Note (not imported)")));
});

test("retirement decision options are AIG-DEC-04 Gate Events outcomes", () => {
  // "Paused — pending decision" (v3.9.2) belongs to a Precautionary pause event only.
  const gateLogOutcomes = contract["DEC-04"]["Gate events"].lists["G4:G553"].filter((o) => o !== "Paused — pending decision");
  const field = logic.RETIREMENT_FIELDS.find((f) => f.id === "decision");
  assert.deepEqual(field.options.filter((o) => !o.startsWith("Pending")), gateLogOutcomes);
  const opinion = logic.buildRetirementGateLogRow({ decision: "Opinion only" });
  assert.equal(opinion.rows.find((row) => row[1] === "Event type")[3], "");
});

test("retirement is scoped per UC-ID and a whole-system retirement needs every use closed", () => {
  const named = logic.buildRetirementGateLogRow({ retireScope: "Named use(s) only — UC-ID specific", ucIds: "UC-0012-A" });
  assert.equal(named.rows.find((row) => row[1] === "UC-ID(s) covered by this dated event")[3], "UC-0012-A");
  assert.equal(named.rows.find((row) => row[1] === "Decision scope (UC-ID specific / Shared system baseline)")[3], "UC-ID specific");
  assert.match(named.rows.find((row) => row[1] === OPERATIONAL)[5], /AIR-ID row stays active/);

  assert.ok(logic.retirementReadiness({}).outstanding.some((item) => /Retirement scope not stated/.test(item)));
  assert.ok(logic.retirementReadiness({ retireScope: "Named use(s) only — UC-ID specific" }).outstanding.some((item) => /UC-ID\(s\) being retired/.test(item)));
  const whole = { retireScope: "Whole system — shared system baseline" };
  assert.ok(logic.retirementReadiness(whole).outstanding.some((item) => /every UC-ID under this AIR-ID/.test(item)));
  assert.ok(!logic.retirementReadiness({ ...whole, allUsesClosed: "Confirmed — every linked UC-ID closed or retired" }).outstanding.some((item) => /every UC-ID under this AIR-ID/.test(item)));
});

test("risk tier follows inherent risk until controls are implemented and evidenced (Playbook §4.4.8)", () => {
  const base = { inherentTierName: "Medium", residualTierName: "Low" };
  assert.equal(logic.effectiveRiskTier({ ...base, controlEvidence: logic.CONTROL_EVIDENCE[0] }).effectiveTierName, "Medium");
  assert.equal(logic.effectiveRiskTier({ ...base }).effectiveTierName, "Medium");
  assert.equal(logic.effectiveRiskTier({ ...base, controlEvidence: "Implemented and evidenced" }).effectiveTierName, "Low");
  const floored = logic.effectiveRiskTier({ ...base, mandatoryFloorTier: "Critical", controlEvidence: "Implemented and evidenced" });
  assert.equal(floored.effectiveTierName, "Critical");
  assert.ok(floored.floorRaised);
  assert.equal(logic.effectiveRiskTier({ inherentTierName: "Critical", residualTierName: "Medium", mandatoryFloorTier: "High", controlEvidence: "Implemented, evidenced and independently verified" }).effectiveTierName, "High");
  assert.deepEqual([1, 5, 5.1, 10, 10.1, 15, 15.1, 25].map(logic.tierNameForScore), ["Low", "Low", "Medium", "Medium", "High", "High", "Critical", "Critical"]);
});

test("a High or Critical inherent tier drops only on independently verified controls", () => {
  const crit = { inherentTierName: "Critical", residualTierName: "Medium" };
  const ev = logic.effectiveRiskTier({ ...crit, controlEvidence: "Implemented and evidenced" });
  assert.equal(ev.effectiveTierName, "Critical");
  assert.ok(ev.verificationNeeded);
  assert.equal(logic.effectiveRiskTier({ ...crit, controlEvidence: "Implemented, evidenced and independently verified" }).effectiveTierName, "Medium");
  assert.equal(logic.effectiveRiskTier({ ...crit, mandatoryFloorTier: "High", controlEvidence: "Implemented, evidenced and independently verified" }).effectiveTierName, "High");
  assert.equal(logic.effectiveRiskTier({ inherentTierName: "Medium", residualTierName: "Low", controlEvidence: "Implemented and evidenced" }).effectiveTierName, "Low");
  assert.equal(logic.CONTROL_EVIDENCE.length, 3);
});

test("light-touch and Low uses are not asked for Medium+ assessments (governance by trigger)", () => {
  const low = fixture();
  const ev = logic.buildEvidenceList(low.profile, low.results).join("\n");
  assert.equal(logic.isLightTouch(low.profile, low.results), true);
  assert.doesNotMatch(ev, /^Responsible AI Assessment$/m);
  assert.doesNotMatch(ev, /^AI Security Review Checklist/m);
  assert.match(ev, /Security policy compliance check/);
  assert.match(ev, /Model Card \(short form/);
  assert.match(ev, /Equality Act 2010 section 149 screening \(all tiers/);
});

test("Medium uses need the Responsible AI Assessment; High uses also need the full security checklist", () => {
  const medium = fixture({ tier: "Medium" });
  const evM = logic.buildEvidenceList(medium.profile, medium.results);
  assert.ok(evM.includes("Responsible AI Assessment"));
  assert.ok(!evM.includes(logic.SECURITY_REVIEW_EVIDENCE));
  assert.ok(evM.includes("Model Card"));
  const high = fixture({ tier: "High" });
  const evH = logic.buildEvidenceList(high.profile, high.results);
  assert.ok(evH.includes("Responsible AI Assessment"));
  assert.ok(evH.includes(logic.SECURITY_REVIEW_EVIDENCE));
  assert.equal(logic.SECURITY_REVIEW_EVIDENCE, "AI Security Review Checklist, including the Section 8 threat model");
});

test("action-capable or triggered Low uses keep the full assessments", () => {
  const acting = fixture();
  acting.profile.actionAuthority = "Human approves each action";
  const evA = logic.buildEvidenceList(acting.profile, acting.results);
  assert.equal(logic.isLightTouch(acting.profile, acting.results), false);
  assert.ok(evA.includes("Responsible AI Assessment"));
  assert.ok(evA.includes(logic.SECURITY_REVIEW_EVIDENCE));
  const trig = fixture();
  trig.results.triggerIds = ["novel"];
  const evT = logic.buildEvidenceList(trig.profile, trig.results);
  assert.ok(evT.includes("Responsible AI Assessment"));
  assert.ok(evT.includes(logic.SECURITY_REVIEW_EVIDENCE));
});

test("High and Critical uses with personal data indicate a DPIA (Playbook §4.5.9, AIG-ASS-05)", () => {
  const high = fixture({ dataType: "Personal data", tier: "High" });
  assert.match(logic.assessmentRequirements(high.profile, high.results).dpia, /^Potential DPIA/);
  const crit = fixture({ dataType: "Personal data", tier: "Critical" });
  assert.match(logic.assessmentRequirements(crit.profile, crit.results).dpia, /^Potential DPIA/);
  const med = fixture({ dataType: "Personal data", tier: "Medium" });
  assert.match(logic.assessmentRequirements(med.profile, med.results).dpia, /^Screening required/);
  const noData = fixture({ dataType: "None", tier: "High" });
  assert.match(logic.assessmentRequirements(noData.profile, noData.results).dpia, /^Screening required/);
});

test("Register lifecycle stage is proposed from the governance position, within the AIG-INV-04 list", () => {
  assert.deepEqual(logic.REGISTER_LIFECYCLE_STAGES, [
    "Idea and Innovation", "Registration and Intake", "Risk Assessment and Review",
    "Approval and Assurance", "Deployment and Operation", "Monitoring and Review",
    "Retirement and Decommissioning",
  ]);
  const expected = {
    Idea: "Risk Assessment and Review",
    Pilot: "Risk Assessment and Review",
    Testing: "Risk Assessment and Review",
    Live: "Risk Assessment and Review",
    Retired: "Retirement and Decommissioning",
  };
  Object.entries(expected).forEach(([state, stage]) => {
    const { profile, results } = fixture();
    profile.lifecycle = state;
    const row = logic.buildRegisterDraftHandoff(profile, results, null).rows
      .find((r) => r[0] === "AI Register" && r[1] === "Lifecycle stage");
    assert.equal(row[3], stage, `operational state ${state}`);
    assert.ok(logic.REGISTER_LIFECYCLE_STAGES.includes(row[3]));
    assert.match(row[5], /AI Governance Lead confirms/);
    assert.match(row[5], new RegExp(`Operational state entered: ${state}`));
  });
});

test("AIG-INV-05 handoff has one row per map column, with exact headings and controlled values", () => {
  const { profile, results } = fixture();
  const handoff = logic.buildCapabilitiesMapHandoff(profile, results);
  // Column headings from the v3.9.7 AIG-INV-05 workbook (formula check columns excluded), in sheet order.
  const COLUMNS = Object.fromEntries(["Use cases", "Capabilities", "Relationships"].map((sheet) => {
    const spec = contract["INV-05"][sheet];
    return [sheet, spec.headers.filter((h, i) => !spec.formulaColumns.includes(String.fromCharCode(65 + i)))];
  }));
  const rel = contract["INV-05"].Relationships.lists;
  const LISTS = {
    Confidence: contract["INV-05"]["Use cases"].lists["G4:G253"],
    State: contract["INV-05"]["Use cases"].lists["I4:I253"],
    "From type": rel["B4:B1003"],
    "To type": rel["E4:E1003"],
    Relationship: rel["D4:D1003"],
  };
  for (const [sheet, columns] of Object.entries(COLUMNS)) {
    const rows = handoff.rows.filter((row) => row[0] === `AIG-INV-05 Capabilities and System Map / ${sheet}`);
    const fields = rows.map((row) => row[1]).filter((label) => !label.startsWith("Note (not a column)"));
    assert.deepEqual(fields, columns, `${sheet} rows must match the workbook columns in order`);
    rows.forEach((row) => {
      if (LISTS[row[1]] && row[2]) assert.ok(LISTS[row[1]].includes(row[2]), `${sheet} / ${row[1]}: "${row[2]}" not in the dropdown`);
    });
  }
  const other = handoff.rows.filter((row) => row[0].startsWith("AIG-INV-05") && !/\/ (Use cases|Capabilities|Relationships)$/.test(row[0]));
  assert.ok(other.every((row) => row[1].startsWith("Note (not a column)")), "rows for other sheets are notes, not fields");
});
