const test = require("node:test");
const assert = require("node:assert/strict");
const logic = require("../src/triage-logic.js");

const allNo = () => Object.fromEntries(logic.PLATFORM_AGENT_TRIGGERS.map((t) => [t.id, "No"]));
const base = (over) => ({ onPlatform: "Yes", audience: "Just the person who built it", matchesPattern: "No", triggers: allNo(), ...over });

test("F.8 lists seven triggers for individual governance", () => {
  assert.equal(logic.PLATFORM_AGENT_TRIGGERS.length, 7);
});
test("not on a platform: triage in its own right", () => {
  const s = logic.platformAgentScreen({ onPlatform: "No" });
  assert.equal(s.cls, "notPlatform");
  assert.equal(s.triageNeeded, true);
  assert.equal(logic.platformAgentScreen({ onPlatform: "Unsure" }).cls, "notPlatform");
});
test("personal agent with no triggers needs no individual triage", () => {
  const s = logic.platformAgentScreen(base());
  assert.equal(s.cls, "personal");
  assert.equal(s.lgaTier, "Tier 1");
  assert.equal(s.triageNeeded, false);
});
test("team agent matching an approved pattern with its UC-ID is an approved-pattern agent", () => {
  const s = logic.platformAgentScreen(base({ audience: "A team or service", matchesPattern: "Yes", patternUcId: "UC-0412" }));
  assert.equal(s.cls, "pattern");
  assert.equal(s.triageNeeded, false);
});
test("team agent with no approved pattern: the pattern is triaged once", () => {
  assert.equal(logic.platformAgentScreen(base({ audience: "A team or service" })).cls, "patternCandidate");
  assert.equal(logic.platformAgentScreen(base({ audience: "A team or service", matchesPattern: "Yes" })).cls, "patternCandidate");
});
test("any trigger answered Yes or Unsure means individual governance", () => {
  for (const t of logic.PLATFORM_AGENT_TRIGGERS) {
    for (const v of ["Yes", "Unsure"]) {
      const s = logic.platformAgentScreen(base({ triggers: { ...allNo(), [t.id]: v } }));
      assert.equal(s.cls, "individual", `${t.id}=${v}`);
      assert.equal(s.lgaTier, "Tier 3");
    }
  }
});
test("unanswered triggers count as Unsure", () => {
  assert.equal(logic.platformAgentScreen({ onPlatform: "Yes", audience: "Just the person who built it", triggers: {} }).cls, "individual");
});
test("sharing with the whole organisation is itself a trigger", () => {
  const s = logic.platformAgentScreen(base({ audience: "The whole organisation", matchesPattern: "Yes", patternUcId: "UC-1" }));
  assert.equal(s.cls, "individual");
  assert.ok(s.triggersMet.some((t) => t.id === "orgWide"));
});
test("screening CSV has one row aligned to its headers", () => {
  const csv = logic.buildPlatformAgentCsv(base({ agentName: "X" }), null, new Date(2026, 9, 16));
  const lines = csv.replace(/^﻿/, "").trim().split("\r\n");
  assert.equal(lines.length, 2);
  assert.equal(lines[0].split('","').length, logic.PLATFORM_AGENT_HEADERS.length);
  assert.match(lines[1], /By 01\/01\/2027/);
});

// ---- Exact match to the AIG-AGT-04 v0.7 Platform Agent Inventory sheet ----------
const contract = require("./fixtures/suite-v3.9.11-contract.json");
const inv = contract["AGT-04"]["Platform Agent Inventory"];
test("screening record columns equal the Platform Agent Inventory sheet, in order", () => {
  assert.deepEqual(logic.PLATFORM_AGENT_HEADERS, inv.headers);
  assert.equal(inv.source.row, 4);
});
test("every class, audience and LGA tier the tool writes is in the sheet's controlled lists", () => {
  const listFor = (col) => inv.lists[`${col}5:${col}203`];
  assert.deepEqual(Object.values(logic.PLATFORM_AGENT_AUDIENCE), listFor("G"));
  assert.deepEqual(Object.values(logic.PLATFORM_AGENT_CLASSES).sort(), [...listFor("J")].sort());
  const allNo = Object.fromEntries(logic.PLATFORM_AGENT_TRIGGERS.map((t) => [t.id, "No"]));
  const cases = [
    { onPlatform: "Yes", audience: "Just the person who built it", triggers: allNo },
    { onPlatform: "Yes", audience: "A team or service", matchesPattern: "Yes", patternUcId: "UC-1", triggers: allNo },
    { onPlatform: "Yes", audience: "A team or service", triggers: allNo },
    { onPlatform: "Yes", audience: "The whole organisation", triggers: allNo },
  ];
  for (const c of cases) {
    const row = logic.buildPlatformAgentRow(c, null, new Date(2026, 9, 16));
    assert.ok(listFor("K").includes(row[10]), row[10]);
    assert.ok(listFor("N").includes(row[13]), row[13]);
    assert.ok(listFor("J").includes(row[9]), row[9]);
  }
});
