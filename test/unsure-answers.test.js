const test = require("node:test");
const assert = require("node:assert/strict");
const logic = require("../src/triage-logic.js");

// "Not sure" on "Could outputs materially affect individuals or services?" and
// "Public-facing or resident-facing output?" counts as Yes everywhere, so that an
// unknown answer never lowers scrutiny (Playbook §3.10.1: where there is uncertainty,
// the higher level of governance scrutiny applies).
const U = logic.UNSURE_COUNTS_AS_YES;
function profile(overrides) {
  return {
    situation: "New use", fastTrack: "All ten No", registerId: "AIR-T001", ucId: "UC-T001", ucIdStatus: "Provisional — operator-entered, unverified",
    systemName: "Scenario", purpose: "Purpose", usePurpose: "Use", serviceArea: "Service", serviceOwner: "Owner",
    supplierDeveloper: "Supplier", source: "Internally developed", capability: "Generative AI",
    actionAuthority: "None — outputs only", systemsAccessed: "", lifecycle: "Idea", dataType: "None",
    procurementRoute: "Built in-house", affectsIndividuals: "No", publicFacing: "No", dateFirstUsed: "", ...overrides,
  };
}
const ones = { resident: 1, trust: 1, legal: 1, visibility: 1, strategic: 1, oversight: 1 };
function run(p, impacts) {
  return logic.calculateTriage({
    profile: p, agpiScores: ones,
    impactScores: { residentImpact: 1, legalImpact: 1, reputationImpact: 1, operationalImpact: 1, financialImpact: 1, ...(impacts || {}) },
    likelihood: 2, control: 3, controlEvidence: "Not evidenced — planned or unverified", triggerIds: [], agentic: null,
  });
}

test("the Unsure value is the one shown in the form", () => {
  assert.equal(U, "Unsure (counts as Yes)");
  assert.equal(logic.yesOrUnsure("Yes"), true);
  assert.equal(logic.yesOrUnsure(U), true);
  assert.equal(logic.yesOrUnsure("No"), false);
  assert.equal(logic.yesOrUnsure(""), false);
});

test("Unsure is a Fast-Track conflict, like Yes (an all-No screen cannot stand)", () => {
  const yes = logic.fastTrackConflicts(profile({ affectsIndividuals: "Yes", publicFacing: "Yes" }));
  const unsure = logic.fastTrackConflicts(profile({ affectsIndividuals: U, publicFacing: U }));
  assert.equal(unsure.length, yes.length);
  assert.ok(unsure.some((s) => /Q3 or Q4/.test(s) && /not yet known/.test(s)));
  assert.ok(unsure.some((s) => /Q5/.test(s) && /not yet known/.test(s)));
  assert.equal(logic.fastTrackConflicts(profile({})).length, 0);
});

test("Unsure gives the same assessment prompts as Yes (EIA, ATRS)", () => {
  for (const field of ["affectsIndividuals", "publicFacing"]) {
    const pYes = profile({ [field]: "Yes" }), pUnsure = profile({ [field]: U });
    const rYes = logic.assessmentRequirements(pYes, run(pYes));
    const rUnsure = logic.assessmentRequirements(pUnsure, run(pUnsure));
    assert.equal(rUnsure.atrs, rYes.atrs, field + " ATRS");
    assert.equal(rUnsure.eia, rYes.eia, field + " EIA");
  }
});

test("Unsure public-facing generative AI at Medium still needs the adversarial test before Gate 6", () => {
  const pYes = profile({ publicFacing: "Yes" }), pUnsure = profile({ publicFacing: U });
  const impacts = { residentImpact: 3, legalImpact: 3 };
  const rYes = run(pYes, impacts), rUnsure = run(pUnsure, impacts);
  assert.equal(rYes.effectiveTierName, "Medium");
  const ev = (p, r) => logic.buildRoute(p, r, {}).find((g) => g.gateNumber === 6).evidence.join(" | ");
  assert.equal(ev(pUnsure, rUnsure), ev(pYes, rYes));
  assert.match(ev(pUnsure, rUnsure), /adversarial/i);
});

test("Unsure opens the contestability prompt, and handoffs say Unsure rather than Not stated", () => {
  const p = profile({ affectsIndividuals: U, publicFacing: U });
  const items = logic.buildArtefactHandoff(p, run(p));
  assert.ok(items.some((i) => /AIG-OPS-04/.test(i.artefact)));
  const values = items.flatMap((i) => i.fields.map((f) => f.value));
  assert.ok(values.includes("Unsure (treated as Yes until confirmed)"));
  assert.ok(!items.flatMap((i) => i.fields).some((f) => /individuals|resident facing/i.test(f.label) && f.value === "Not stated"));
});
