"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const ExactRows = require("../src/exact-rows.js");

const IMPACT_KEYS = [
  "residentImpact",
  "legalImpact",
  "reputationImpact",
  "operationalImpact",
  "financialImpact",
];

function makeCalculation(tier) {
  const profile = {
    systemName: `Synthetic ${tier} pilot`,
    purpose: "Synthetic test purpose",
    source: "Internally developed",
    capability: "Predictive AI",
    actionAuthority: "None — outputs only",
    lifecycle: "Idea",
    dataType: "None",
    affectsIndividuals: "No",
    publicFacing: "No",
    procurementRequired: "No",
    triggers: [],
  };
  const agpiScores = {
    resident: tier === "Low" ? 1 : tier === "Medium" ? 3 : tier === "Critical" ? 5 : 3,
    trust: tier === "Low" ? 1 : tier === "Medium" ? 3 : tier === "Critical" ? 5 : 3,
    legal: tier === "Low" ? 1 : tier === "Medium" ? 3 : tier === "Critical" ? 5 : 3,
    visibility: tier === "Low" ? 1 : tier === "Medium" ? 3 : tier === "Critical" ? 5 : 3,
    strategic: tier === "Low" ? 1 : tier === "Medium" ? 3 : tier === "Critical" ? 5 : 3,
    oversight: tier === "Low" ? 1 : tier === "Medium" ? 3 : tier === "Critical" ? 5 : 3,
  };
  const impactScores = Object.fromEntries(
    IMPACT_KEYS.map((key) => [key, tier === "Low" ? 1 : tier === "Medium" ? 3 : tier === "Critical" ? 5 : 4]),
  );
  const likelihood = tier === "Low" ? 1 : tier === "Medium" ? 3 : tier === "Critical" ? 5 : 3;
  const control = tier === "Low" ? 5 : tier === "Medium" ? 3 : tier === "Critical" ? 5 : 4;
  const impact = Math.max(...Object.values(impactScores));
  const inherent = likelihood * impact;
  const residual = Math.round(inherent * (control / 5) * 10) / 10;
  const inherentTierName = inherent <= 5 ? "Low" : inherent <= 10 ? "Medium" : inherent <= 15 ? "High" : "Critical";
  const residualTierName = residual <= 5 ? "Low" : residual <= 10 ? "Medium" : residual <= 15 ? "High" : "Critical";
  const effectiveTierName = tier === "High" ? "High" : tier;
  const score = tier === "Low" ? 0 : tier === "Medium" ? 50 : tier === "Critical" ? 100 : 50;
  const priority = tier === "Low" ? "Priority 5 – Observe" : tier === "Medium" ? "Priority 3 – Standard" : tier === "Critical" ? "Priority 1 – Critical" : "Priority 3 – Standard";

  return {
    profile,
    agpiScores,
    impactScores,
    route: [
      {
        forum: "Synthetic review forum",
        requirement: "Review the proposed assessment",
      },
    ],
    results: {
      agpiScore: score,
      priority: { label: priority },
      rawAgpiPriority: priority,
      effectiveGovernancePriority: priority,
      risk: { impact, likelihood, control, inherent, residual },
      inherentTierName,
      residualTierName,
      effectiveTierName,
      triggerIds: [],
      floorReason: "",
      assuranceIntensity: "Proportionate",
      governanceStatus: "Triage complete — formal governance approvals pending",
    },
  };
}

function getResult(built, key) {
  return built.rows.find((item) => item.key === key);
}

test("source spreadsheet headers and column order match the controlled row layouts", () => {
  assert.deepEqual(ExactRows.SCHEMAS.registerCore.headers, [
    "AIR-ID", "System / Model Name", "Approved Purpose / Boundary", "Service Area",
    "Service Owner", "Supplier / Developer", "Source", "Primary AI Type (summary)",
    "Lifecycle Stage", "Date Registered", "Date First Used", "Governance Approval Status",
    "Operational Status", "Action Authority (summary)", "Is Agent?", "Agent Record (45) Ref",
    "Last Review Date", "Next Review Date", "05 source / version", "Reconciled on",
    "Register QA (structural)", "Authority escalation (derived)", "Escalation / approval evidence ref",
    "Escalation Gate Event ID", "Approved view row (derived)",
  ]);
  assert.deepEqual(ExactRows.SCHEMAS.gatePlan.headers, [
    "Plan ID", "AIR-ID", "Gate / forum", "Trigger / lifecycle stage", "Requirement",
    "Basis / triage ref", "Target date", "Responsible role", "Plan state",
    "N-A / waiver rationale and authority ref", "Source version", "Plan QA",
  ]);
  assert.deepEqual(ExactRows.SCHEMAS.agpiTriage.headers, [
    "Governance dimension", "Weight", "Score (1–5)", "Weighted points", "Assessment consideration",
  ]);
  assert.deepEqual(ExactRows.SCHEMAS.triageImport.headers, [
    "Canonical field", "Value", "Capture status", "Used in WCC-AIG-07", "Implementation note",
  ]);
  assert.equal(ExactRows.SCHEMAS.agentRecord.headers.length, 51);
  assert.deepEqual(ExactRows.SCHEMAS.capabilityVector.headers, [
    "AIR-ID", "Read", "Write", "Execute", "Communicate", "Purchase", "Delegate", "Persuade",
    "Code", "Discover", "Persist", "Replicate", "Learn", "Escalate",
    "Multiplier: Credential access", "Multiplier: Self-modification", "Multiplier: Tool discovery",
    "Multiplier: Goal adaptation", "Multiplier: External comms", "Notes",
  ]);
});

for (const tier of ["Low", "Medium", "High", "Critical"]) {
  test(`${tier} pilot rows preserve source headers, scores, formulas, and route`, () => {
    const calculation = makeCalculation(tier);
    const built = ExactRows.buildExactRows(calculation);
    const register = getResult(built, "registerCore");
    const gatePlan = getResult(built, "gatePlan");
    const agpi = getResult(built, "agpiTriage");
    const imported = getResult(built, "triageImport");

    assert.deepEqual(register.headers, ExactRows.SCHEMAS.registerCore.headers);
    assert.equal(register.rows[0][0], "");
    assert.equal(register.rows[0][1], `Synthetic ${tier} pilot`);
    assert.equal(register.rows[0][2], "");
    assert.equal(register.rows[0][11], "");
    assert.equal(register.rows[0][20], "");
    assert.equal(register.rows[0][21], "");
    assert.equal(register.rows[0][24], "");

    assert.deepEqual(gatePlan.headers, ExactRows.SCHEMAS.gatePlan.headers);
    assert.equal(gatePlan.rows.length, 1);
    assert.equal(gatePlan.rows[0][2], "Synthetic review forum");
    assert.equal(gatePlan.rows[0][4], "Review the proposed assessment");
    assert.equal(gatePlan.rows[0][0], "");
    assert.equal(gatePlan.rows[0][6], "");
    assert.equal(gatePlan.rows[0][7], "");
    assert.equal(gatePlan.rows[0][11], "");

    assert.deepEqual(agpi.headers, ExactRows.SCHEMAS.agpiTriage.headers);
    assert.equal(agpi.rows.length, 6);
    const expectedAgpiScore = tier === "Low" ? 1 : tier === "Medium" ? 3 : tier === "Critical" ? 5 : 3;
    assert.deepEqual(agpi.rows[0], ["Resident Impact", 0.25, expectedAgpiScore, "", agpi.rows[0][4]]);
    assert.ok(agpi.rows.every((row) => row[3] === ""));

    const effectiveTier = imported.rows.find((row) => row[0] === "Effective Governance Tier");
    const agpiPriority = imported.rows.find((row) => row[0] === "Raw AGPI Priority");
    assert.equal(effectiveTier[1], tier);
    assert.equal(
      agpiPriority[1],
      tier === "Low"
        ? "Priority 5 – Observe"
        : tier === "Medium"
          ? "Priority 3 – Standard"
          : tier === "Critical"
            ? "Priority 1 – Critical"
            : "Priority 3 – Standard",
    );
    assert.ok(built.report.missing.includes("Permanent AIR-ID from the existing register"));
  });
}

test("agentic pilot emits conservative capability vector and no invented mandate or event", () => {
  const calculation = makeCalculation("Critical");
  calculation.profile.capability = "Agentic AI";
  calculation.profile.actionAuthority = "Fully autonomous";
  calculation.results.triggerIds = ["agentic"];
  calculation.results.floorReason = "mandatory trigger";
  const agentic = {
    capabilities: ["Read", "Write", "Execute"],
    multipliers: ["Credential access"],
    consequence: 4,
    autonomy: 5,
    authority: 4,
    reach: 4,
    controllability: 2,
    autonomyLabel: "A5",
    tierLabel: "T4",
    pathway: "Enhanced review",
    killSwitch: true,
    rollback: false,
  };
  const built = ExactRows.buildExactRows(calculation, { agentic });
  const imported = getResult(built, "triageImport");
  const vector = getResult(built, "capabilityVector");
  const register = getResult(built, "registerCore");

  assert.equal(register.rows[0][14], "Yes");
  assert.equal(imported.rows.find((row) => row[0] === "Trigger — Agentic Autonomous Action")[1], "Yes");
  assert.equal(imported.rows.find((row) => row[0] === "Mandatory Risk Floor")[1], "Critical");
  assert.equal(imported.rows.find((row) => row[0] === "Agentic Authority")[1], 4);
  assert.equal(vector.rows.length, 1);
  assert.equal(vector.headers[vector.headers.indexOf("AIR-ID")], "AIR-ID");
  assert.equal(vector.rows[0][0], "");
  assert.equal(vector.rows[0][vector.headers.indexOf("Read")], "Yes");
  assert.equal(vector.rows[0][vector.headers.indexOf("Write")], "Yes");
  assert.equal(vector.rows[0][vector.headers.indexOf("Purchase")], "");
  assert.equal(vector.rows[0][vector.headers.indexOf("Multiplier: Credential access")], "Yes");
  assert.equal(vector.rows[0][vector.headers.indexOf("Multiplier: Self-modification")], "");
  assert.equal(built.rows.some((item) => item.key === "agentRecord"), false);
  assert.ok(built.report.omittedSheets.some((item) => item.sheet === "Agent Record"));
  assert.ok(built.report.omittedSheets.some((item) => item.sheet === "Gate Events"));
});

test("formula fields remain empty and source-form-only sheets are not passed off as rows", () => {
  const built = ExactRows.buildExactRows(makeCalculation("Medium"));
  assert.equal(getResult(built, "registerCore").rows[0][20], "");
  assert.equal(getResult(built, "registerCore").rows[0][21], "");
  assert.equal(getResult(built, "registerCore").rows[0][24], "");
  assert.equal(getResult(built, "gatePlan").rows[0][11], "");
  assert.ok(getResult(built, "agpiTriage").rows.every((row) => row[3] === ""));
  assert.ok(built.report.omittedSheets.some((item) => item.sheet === "Risk Assessment"));
});

test("CSV uses the supplied exact header order and escapes formula-like values", () => {
  const csv = ExactRows.toCsv(
    ["AIR-ID", "System / Model Name"],
    [["", "=1+1"]],
  );
  assert.match(csv, /^\uFEFF"AIR-ID","System \/ Model Name"\r\n/);
  assert.match(csv, /,"'=1\+1"\r\n$/);
});