"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const logic = require("../src/triage-logic.js");
const exactRows = require("../src/exact-rows.js");
const localTemplates = require("../src/local-templates.js");

const root = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const app = read("src/triage-app.js");
const html = read("index.html");
const build = read("scripts/build.js");

function makePilot({ agpi = 1, impact = 1, likelihood = 1, control = 5, triggers = [], agentic = false } = {}) {
  const agpiScores = Object.fromEntries(logic.DIMENSIONS.map((dimension) => [dimension.id, agpi]));
  const impactScores = Object.fromEntries(logic.IMPACT_DIMENSIONS.map((dimension) => [dimension.id, impact]));
  const profile = {
    registerId: "",
    systemName: "Synthetic pilot",
    purpose: "Synthetic triage validation",
    serviceArea: "Synthetic",
    serviceOwner: "Synthetic owner",
    supplierDeveloper: "",
    source: "Internally developed",
    capability: agentic ? "Agentic AI" : "Predictive AI",
    actionAuthority: agentic ? "Acts within defined bounds — monitored" : "None — outputs only",
    systemsAccessed: "",
    lifecycle: "Idea",
    dateFirstUsed: "",
    dataType: "None",
  };
  const agpiScore = logic.calculateAgpi(agpiScores);
  const priority = logic.priorityFor(agpiScore);
  const risk = logic.calculateRisk(impactScores, likelihood, control);
  const inherentTierName = risk.inherent <= 5 ? "Low" : risk.inherent <= 10 ? "Medium" : risk.inherent <= 15 ? "High" : "Critical";
  const triggerIds = triggers.slice();
  const floor = triggerIds.includes("statutory") || triggerIds.includes("agentic")
    ? "Critical"
    : triggerIds.length ? "High" : "Low";
  const order = ["Low", "Medium", "High", "Critical"];
  const effectiveTierName = [inherentTierName, risk.tier.name, floor]
    .sort((a, b) => order.indexOf(b) - order.indexOf(a))[0];
  const results = {
    agpiScore,
    priority,
    rawAgpiPriority: priority.label,
    effectiveGovernancePriority: priority.label,
    risk,
    triggerIds,
    inherentTierName,
    residualTierName: risk.tier.name,
    effectiveTierName,
    floorReason: triggerIds.length ? "mandatory trigger" : "",
    assuranceIntensity: "Standard",
    governanceStatus: "Triage complete — formal governance approvals pending",
  };
  const calculation = { profile, results, agpiScores, impactScores, route: [] };
  const agenticResult = agentic ? {
    tierLabel: "T2 — Managed",
    pathway: "Agentic oversight",
    capabilities: ["Read", "Execute"],
    multipliers: [],
  } : null;
  return { calculation, agenticResult };
}

test("self-contained build embeds exact rows and local template modules before the app", () => {
  const ids = ["triage-logic", "triage-exact-rows", "local-templates", "triage-app", "retire-app"];
  const sourceOrder = ids.map((id) => build.indexOf(`["${id}"`));
  assert.ok(sourceOrder.every((position) => position >= 0));
  assert.deepEqual(sourceOrder, sourceOrder.slice().sort((a, b) => a - b));
  const scriptOrder = ids.map((id) => html.indexOf(`<script id="${id}">`));
  assert.ok(scriptOrder.every((position) => position >= 0));
  assert.deepEqual(scriptOrder, scriptOrder.slice().sort((a, b) => a - b));
  assert.match(build, /output\.replace\(pattern, \(_match, openingTag\) =>/);
});

test("low, medium, high, critical, and agentic pilots reach exact-header handoffs", () => {
  const fixtures = [
    [makePilot(), "Low"],
    [makePilot({ agpi: 3, impact: 3, likelihood: 3, control: 3 }), "Medium"],
    [makePilot({ agpi: 3, impact: 4, likelihood: 3, control: 4 }), "High"],
    [makePilot({ agpi: 5, impact: 5, likelihood: 5, control: 5 }), "Critical"],
    [makePilot({ agentic: true, triggers: ["agentic"] }), "Critical"],
  ];
  for (const [fixture, expectedTier] of fixtures) {
    const built = exactRows.buildExactRows(fixture.calculation, { agentic: fixture.agenticResult });
    const riskRows = built.rows.find((row) => row.key === "triageImport");
    const tierValue = riskRows.rows.find((row) => row[0] === "Effective Governance Tier")[1];
    assert.equal(tierValue, expectedTier);
    assert.equal(riskRows.headers.join(","), exactRows.SCHEMAS.triageImport.headers.join(","));
  }
  const agent = exactRows.buildExactRows(fixtures[4][0].calculation, {
    agentic: fixtures[4][0].agenticResult,
  });
  assert.equal(agent.rows.find((row) => row.key === "capabilityVector").rows.length, 1);
  assert.equal(agent.rows.find((row) => row.key === "agentRecord"), undefined);
  assert.ok(agent.report.omittedSheets.some((item) => /authority|runtime/i.test(item.reason)));
  assert.equal(agent.rows.find((row) => row.key === "registerCore").rows[0][0], "");
});

test("exact-header downloads and agentic gating are wired in the public UI", () => {
  const controls = {
    downloadExactRegister: "registerCore",
    downloadExactGatePlan: "gatePlan",
    downloadExactAgpi: "agpiTriage",
    downloadExactRisk: "triageImport",
    downloadExactCapabilities: "capabilityVector",
  };
  for (const [id, key] of Object.entries(controls)) {
    assert.ok(html.includes(`id="${id}"`), `${id} is present`);
    assert.match(app, new RegExp(`byId\\("${id}"\\)\\.addEventListener\\("click", \\(\\) => downloadExactRow\\("${key}"\\)\\)`));
  }
  assert.match(app, /agentic: latestAgentic/);
  assert.match(app, /capabilityButton\.hidden = !latestAgentic/);
  assert.match(app, /agentTemplateOption\.disabled = !latestAgentic/);
  assert.match(html, /#downloadExactCapabilities\[hidden\],#templateAgentVectorOption\[hidden\]\{display:none!important\}/);
  assert.match(app, /function downloadExactReadiness\(\)/);
  assert.match(app, /exact\.report\.missing/);
});

test("assessing or changing agency refreshes the route and export status", () => {
  const assessed = app.slice(app.indexOf("function renderAgentic()"), app.indexOf("  buildAgenticInputs();"));
  assert.match(assessed, /host\.innerHTML = html; host\.hidden = false;\s*update\(\);/);
  const invalidated = app.slice(app.indexOf("const invalidateAgency ="), app.indexOf('byId("agenticStep").addEventListener'));
  assert.match(invalidated, /Run Assess agency again before exporting agentic records\.";\s*update\(\);/);
});

test("native template controls require a reviewed case, a selected local file and verified IDs for Gate Plan", () => {
  assert.match(html, /id="templateFile" accept="\.xlsx,\.docx"/);
  assert.match(html, /id="confirmTemplateAirId"/);
  assert.match(html, /id="createTemplateCopy"/);
  assert.match(html, /04\/38 Word documents have no supported/);
  assert.match(app, /if \(!validateForExport\(\)\) return;\s*const fileInput = byId\("templateFile"\)/);
  assert.match(app, /if \(!file\)/);
  assert.match(app, /LocalTemplates\.fillWorkbookTemplate\(file, \{ kind, cells \}\)/);
  assert.match(app, /LocalTemplates\.fillWordTemplate\(file/);
  assert.match(app, /The 36 Gate Plan copy requires an existing AIR-ID verified/);
  assert.match(app, /function verifiedTemplateAirId/);
  assert.doesNotMatch(app, /\bfetch\s*\(/);
});

test("05 candidate copy maps only safe Register Core fields", () => {
  assert.match(html, /<option value="registerCore">05 — Register Core candidate row/);
  assert.match(html, /05 copy fills candidate values in row 5 only/);
  const mapper = app.match(/if \(kind === "registerCore"\) \{([\s\S]*?)\n    \}\n    if \(kind === "agentVector"\)/);
  assert.ok(mapper, "The 05 template mapper exists.");
  for (const address of ["A5", "B5", "D5", "E5", "F5", "G5", "H5", "I5", "K5", "N5", "O5"]) {
    assert.ok(mapper[1].includes(`"${address}"`) || mapper[1].includes(`${address} =`), `Safe candidate cell ${address} is mapped.`);
  }
  assert.doesNotMatch(mapper[1], /C5|J5|L5|M5|Date Registered|Governance Approval Status|Operational Status/);
  assert.match(mapper[1], /verifiedTemplateAirId\(calculation\)/);
});

test("07 template mapper skips B20/B21 and creates a valid copy when the revised source is available", async (context) => {
  assert.match(app, /if \(!\[20, 21\]\.includes\(5 \+ index\)/);
  assert.match(html, /B20 authorised uplift and B21 derived effective priority remain blank in both/);
  assert.match(read("README.md"), /B20 \(authorised priority uplift\)\s+and B21 \(effective/);
  const exactBuilder = app.match(/function buildExactExport\(calculation\) \{([\s\S]*?)\n  \}/);
  assert.ok(exactBuilder);
  assert.match(exactBuilder[1], /"Authorised Governance Priority Uplift", "Effective Governance Priority"/);
  assert.match(exactBuilder[1], /item\[1\] = ""/);

  const sourceDir = path.resolve(root, "../.local/conversation-workspace/files/WCC_Integrated_Draft_2026-09-25/revised_core");
  const sourceFile = fs.existsSync(sourceDir)
    ? fs.readdirSync(sourceDir).filter((name) => /^07_.*\.xlsx$/i.test(name)).map((name) => path.join(sourceDir, name))[0]
    : undefined;
  if (!sourceFile) {
    context.skip("The revised local 07 workbook template is not available in this checkout.");
    return;
  }

  const pilot = makePilot();
  const importRows = exactRows
    .buildExactRows(pilot.calculation)
    .rows.find((row) => row.key === "triageImport");
  const cells = {};
  importRows.rows.forEach((row, index) => {
    const addressRow = 5 + index;
    const value = row[1];
    if (![20, 21].includes(addressRow) && value != null && String(value).trim() !== "") {
      cells[`B${addressRow}`] = value;
    }
  });
  assert.ok(importRows.rows.find((row) => row[0] === "Effective Governance Priority")[1]);
  assert.equal(Object.hasOwn(cells, "B20"), false);
  assert.equal(Object.hasOwn(cells, "B21"), false);

  const source = new Uint8Array(fs.readFileSync(sourceFile));
  const filled = await localTemplates.fillWorkbookTemplate(source, { kind: "riskImport", cells });
  assert.ok(filled instanceof Uint8Array);
  assert.ok(filled.byteLength > 0);
});

test("the static handoffs do not publish confidential source-template files", () => {
  assert.doesNotMatch(html, /conversation-workspace|revised_core|Integrated_Draft_2026/);
  assert.match(read("README.md"), /selected file is not uploaded or retained/i);
  assert.match(read("README.md"), /do not contain supported\s+placeholders/i);
  assert.doesNotMatch(read("src/triage-app.js"), /\bfetch\s*\(|XMLHttpRequest|localStorage|sessionStorage/);
});