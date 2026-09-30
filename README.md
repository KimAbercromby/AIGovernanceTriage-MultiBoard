# AI Multi-Board Triage & Governance Router

A browser-only triage calculator for drafting an AI-system priority, risk profile,
proportionate governance route, specialist-screening prompts and lifecycle
handoffs. It preserves the tool's purpose as one front door for priority/risk
triage and multi-forum routing, with an additional retirement/decommissioning
workflow. The browser stores nothing you enter and sends no data to a server.
It also includes eleven fictional demo scenarios (see **Pilot lab demo** below).

**Public Pages:** https://kimabercromby.github.io/AIGovernanceTriage-MultiBoard/

## Pilot lab demo

A **Pilot lab** panel at the top of the triage form loads one of eleven uses of a
made-up system, *DEMO: Riverside Repairs Assistant* (AIR-DEMO-01, UC-DEMO-01 to
UC-DEMO-11). Together they produce every AGPI priority (1 to 5), every risk tier
(Low to Critical) and agency tiers T1 to T5, using the tool's own logic. Under the
suite v3.9 tier-assignment table (AIG-AGT-02 / AIG-AGT-03 Tables A and B) UC-DEMO-06
moved from T0 to T1 (its Consequence score of 1 sets a T1 floor), so no scenario now
shows T0; its scores were left unchanged.

The demo is guarded so it cannot be mistaken for, or turned into, a Council record:

- the identifiers are marked DEMO and are not Council-issued;
- a fixed banner states the data is fictional while a demo is loaded;
- every export, copy and print route is switched off while a demo is loaded;
- **Clear demo** reloads the page, so no demo value carries into a real triage.

The scenarios live in `src/pilot-scenarios.js` and the guard in `src/pilot-demo.js`.
`test/pilot-scenarios.test.js` checks each scenario still produces its documented
outcome, and that every export control the tool wires up is blocked in demo mode.

## Suite alignment and status

This tool is aligned as a review aid to proposed, separate AI governance
workbook drafts: **AI governance suite v3.9.1 (30 September 2026)**, Playbook 19.9.11,
Gate Map AIG-DEC-01 1.7, AGPI Triage AIG-ASS-01 1.3, Risk Worksheet AIG-ASS-02 1.9,
Deployment and Rollout Plan AIG-OPS-01 1.6, Register AIG-INV-04 1.0, Gate Log
AIG-DEC-04 1.0, Agent Record AIG-AGT-04 0.3 and Capabilities and System Map
AIG-INV-05 0.3. They are **proposed and unapproved**,
not an approved or live policy, process or record. This public tool does not read
or write controlled records and must not be treated as issued authority.

Rules applied (Proposed — for Council confirmation):

- **Priority is urgency only.** AGPI bands per AIG-ASS-01; a Resident Impact or Legal &
  Regulatory Exposure score of 5 sets at least Priority 2; a use with a §4.4.6 trigger
  cannot be Priority 5. The priority does not set the route or assurance depth.
- **Governing tier sets the route:** the highest of the risk tier (inherent until
  controls are evidenced; High/Critical reductions need independent verification),
  the §4.4.6 trigger floor, the impact floor (any confirmed Impact 5 → at least
  Medium) and, for action-capable uses, the agency-tier minimum (T0/T1 none, T2
  Medium, T3 High, T4 High or Critical without evidenced per-action review, T5
  Critical). "Can it act?" Unsure counts as Yes; per-action review Unsure counts as
  No (Critical floor).
- **Gates (AIG-DEC-01 v1.7):** Gate 2 and Gate 6 are mandatory for every
  action-capable use (T0 included) and Gate 6 grants the permitted autonomy level;
  Gate 4 applies when procured; Gate 5 from Medium; resident-facing generative AI at
  Medium needs the AIG-ASS-11 Section 7 adversarial test before Gate 6; the Gate 6
  evidence list carries the AIG-OPS-01 section 8 business continuity link (v3.9.1:
  prioritised activity in the business continuity plan? Yes / No / Not known). The AI
  Assurance Board advises and never decides.
- **Agency tier:** the AIG-AGT-02 / AIG-AGT-03 tier-assignment table (Tables A and B,
  highest floor wins; a kill-switch that is not demonstrated is a rule D1 trigger).

- **AIG-INV-04:** permanent Council-issued AIR-ID and current assurance state. Look up and
  verify an existing AIR-ID in the current controlled workbook; this tool never
  creates one. Its register review handoff is explicitly non-importable and does not
  assert current approval, operational state or assurance. The one-row-per-AIR-ID
  Assessment summary priority remains blank in a use-specific handoff; use triage
  is not copied into the system-level priority summary.
- **Use-case scope:** one AIR-ID identifies a system, not every purpose for which it
  may be used. Triage priority and risk for each materially different outcome/workflow
  separately, including non-agentic uses, with a distinct UC-ID for each use. The
  operator may enter an existing or provisional UC-ID, or explicitly leave it pending;
  pending means use-specific UC-ID not yet supplied, never a shared-system-baseline
  selection. This tool never issues or independently verifies UC-IDs. Each export carries the
  exact scoped purpose and identifier context. A system-level record, map relationship
  or triage score is not use approval.
- **AIG-DEC-04:** its proposed draft separates prospective **Gate Plan**, dated **Gate
  Events**, and event-linked **Gate Conditions**. The "Download Gate Log plan rows"
  export gives paste-ready rows for the Gate plan sheet only: one row per AIG-DEC-01
  decision gate 1 to 6, columns A to L, with Gate / forum from the workbook's gate
  list, Requirement Required or Conditional and Plan state Planned (Plan ID, target
  date and any N/A rationale left blank for the governance steward), followed by
  guidance columns that are not pasted. It never creates Gate Events or Conditions.
- **AIG-INV-05 Capabilities and System Map:** a proposed controlled catalogue
  artefact, not approved or adopted. Triage offers a
  clearly labelled proposal for outcome-led use cases, capabilities and a UC →
  CAP relationship without an AIR-ID. It carries only an operator-entered UC-ID
  or a pending marker, with proposed pointers to the separate UC current view.
  The System map accepts only an existing official AIR-ID; the map is not a
  second register or source of decisions/status.
- **AIG-DEC-03:** authorised decisions remain in the decision record or approved native forum
  minutes. The tool can prepare decision prompts; it does not decide or approve.
- **AIG-AGT-04 / AIG-AGT-05:** AIG-AGT-04 is authoritative for agent scope and permissions;
  AIG-AGT-05 covers derived delegation paths. A map link, agency classification,
  Agent Record handoff or capability vector grants no authority.

AGPI is governance prioritisation, not a legal risk finding or waiver. Every
priority tier includes Equality Act 2010 section 149, Human Rights Act 1998
section 6 and data-protection/privacy screening prompts. Equality, legal,
privacy/DPO, commercial and other responsible owners determine applicable
case-specific duties and whether a fuller assessment is required. ATRS, EU AI
Act and procurement outcomes are conditional where relevant and require
case-specific/legal or commercial owner confirmation. This tool does not claim
legal scope, FRIA completion, publication, ISO conformity, approval or verified
evidence.

## Workflows

- Enter a system profile, AGPI dimension scores, risk impacts and any mandatory
  escalation triggers.
- Enter the exact purpose/outcome being assessed and an existing/provisional
  operator-supplied UC-ID, or leave the UC-ID explicitly pending. Re-score each
  materially different use independently; the same AIR-ID remains the system
  identity. This applies to non-agentic as well as agentic use.
- Review the separate governance-priority and risk classifications, screening
  prompts, assurance evidence plan and configured governance route.
- Run agentic triage when a system can act. It proposes a tier and containment
  review; AIG-AGT-04 remains authoritative for permissions and delegations.
- Download an AIG-INV-04 review handoff, proposed controlled AIG-INV-05 map handoff,
  AGPI/risk/agentic pre-fills, Gate Log plan rows, artefact handoff or case
  summary, including a AIG-DEC-02 paper-review handoff with blank preparer and
  actual paper date. Outputs are drafts that must be reconciled with current
  records and local owners; they are not directly importable rows. UC-ID and
  scope values are prompts/pointers only: exports create no UC-ID, approval,
  filled decision status, delegated authority or Gate Event.
- Switch to retirement/decommissioning for a user-entered checklist and
  separate draft handoffs for a prospective plan, dated event and event-linked
  conditions. The checklist remains unverified and cannot assert readiness,
  decision completion or switch-off authority; it does not change Register
  status.

Default scores are synthetic examples until each score input has been entered
and the user confirms review. Calculated priorities, risk tiers, evidence
prompts and route decisions remain provisional decision support even after that
confirmation. Specialist applicability, evidence references and legal N/A
positions remain pending the relevant owner.

The calculations are decision-support aids, not legal advice, an assurance
opinion, formal assessment or deployment authority. Forums, local delegations,
legal scope and evidence quality must be confirmed by the responsible owners.

## Source, tests and static deployment

The source is maintained as readable JavaScript under `src/`; `index.html`
embeds the browser scripts so the public app is one self-contained static file.
There are no runtime dependencies or network calls.

After editing `src/`:

```sh
node scripts/build.js
node scripts/build.js --check
node --test test/*.test.js
```

`test/suite-v3.9.1-contract.test.js` checks every export's field labels, order and
controlled values against `test/fixtures/suite-v3.9.1-contract.json`, which records the
header rows and dropdown lists read from the suite workbooks (file, sheet and row).
Regenerate it for a new suite release with
`python3 scripts/extract-suite-fixture.py <folder of suite .xlsx/.docx files>`.

Publish `index.html` from the repository root with GitHub Pages. The build
script synchronises maintained sources into the embedded scripts, preserving
self-contained/static deployment. Node.js is only needed for build and tests.

## Companion tools

- [Lifecycle Walkthrough](https://kimabercromby.github.io/AIGovernanceWalkthrough-MultiBoard/)
- [Triage Engines Simulation](https://kimabercromby.github.io/triage-engines-simulation/)

## Privacy

All calculations happen in the browser. The tool uses no cookies, analytics,
external services, persistent storage or credentials. Refreshing clears entered
values. Do not enter sensitive personal or special-category information.