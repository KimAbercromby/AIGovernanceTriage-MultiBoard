"use strict";
// Suite v3.9.9: proportionate Agent Record (Playbook F.3; AIG-AGT-04 v0.6 column BL).
// Every agent that can act needs the core record; persistence, memory, tool discovery,
// credential access and delegation add their own sheets; T3 and above, or financial
// authority, needs the full ASBOM. An unassessed tier fails safe to Full.
const test = require("node:test");
const assert = require("node:assert/strict");
const logic = require("../src/triage-logic.js");

const agent = (dims, multipliers = []) => logic.computeAgentic({ dimensions: dims, multipliers, killSwitch: true, rollback: true, boundariesTested: true });
const zero = { consequence: 0, autonomy: 0, authority: 0, reach: 0, controllability: 0 };

test("a T0 agent with no features needs only the core record", () => {
  const a = agent(zero);
  assert.equal(a.tierNum, 0);
  assert.equal(a.recordLevel.level, "Core");
  assert.deepEqual(a.recordLevel.sheets, []);
});

test("memory or delegation switch on their own sheets below T3", () => {
  const m = agent(zero, ["Memory"]);
  assert.equal(m.recordLevel.level, "Core plus features");
  assert.ok(m.recordLevel.sheets.includes("Memory Controls"));
  const d = agent(zero, ["Delegation"]);
  assert.equal(d.tierNum, 2);
  assert.equal(d.recordLevel.level, "Core plus features");
  assert.ok(d.recordLevel.sheets.includes("Agent Authority Graph (AIG-AGT-05)"));
  const t = agent(zero, ["Credential access"]);
  assert.ok(t.recordLevel.sheets.includes("Tool Authority Registry"));
  const p = agent(zero, ["Persistence"]);
  assert.ok(p.recordLevel.sheets.includes("Runtime Controls (stop and containment)"));
});

test("T3 and above, or financial authority, needs the full ASBOM", () => {
  const t3 = agent({ ...zero, consequence: 3 });
  assert.equal(t3.tierNum, 3);
  assert.equal(t3.recordLevel.level, "Full");
  const fin = agent(zero, ["Financial authority"]);
  assert.equal(fin.recordLevel.level, "Full");
  const t5 = agent(zero, ["Self-modification"]);
  assert.equal(t5.recordLevel.level, "Full");
});

test("an unassessed agency tier fails safe to Full", () => {
  assert.equal(logic.agentRecordLevel(null).level, "Full");
  assert.match(logic.agentRecordLevel(null).reason, /fail safe/);
});

test("the core field list names real AIG-AGT-04 Agent Record columns", () => {
  const contract = require("./fixtures/suite-v3.9.9-contract.json");
  const headers = contract["AGT-04"]["Agent Record"].headers;
  logic.AGENT_RECORD_CORE_FIELDS.forEach((f) => assert.ok(headers.includes(f), f));
  assert.ok(headers.includes("Record level required (Core / Core plus features / Full)"));
});
