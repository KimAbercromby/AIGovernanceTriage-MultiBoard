# AI Multi-Board Triage & Governance Router

A browser-only triage calculator for drafting an AI-system priority, risk profile,
proportionate governance route, specialist-screening prompts and lifecycle
handoffs. It preserves the tool's purpose as one front door for priority/risk
triage and multi-forum routing, with an additional retirement/decommissioning
workflow. The browser stores no entries and sends no data to a server.

**Public Pages:** https://kimabercromby.github.io/AIGovernanceTriage-MultiBoard/

## Suite alignment and status

This tool is aligned as a review aid to proposed, separate AI governance
workbook drafts. They are **proposed and unapproved**, not an approved or live
policy, process or record. This public tool does not read or write controlled
records and must not be treated as issued authority.

- **AIG-INV-04:** permanent Council-issued AIR-ID and current assurance state. Look up and
  verify an existing AIR-ID in the current controlled workbook; this tool never
  creates one. Its register review handoff is explicitly non-importable and does not
  assert current approval, operational state or assurance.
- **AIG-DEC-04:** its proposed draft separates prospective **Gate Plan**, dated **Gate
  Events**, and event-linked **Gate Conditions**. Exports are planning/review
  prompts only, not live rows or events.
- **AIG-INV-05 Capabilities and System Map:** a proposed controlled catalogue
  artefact, not approved or adopted. Triage offers a
  clearly labelled proposal for outcome-led use cases, capabilities and a UC →
  CAP relationship without an AIR-ID. The System map accepts only an existing
  official AIR-ID; the map is not a second register.
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
- Review the separate governance-priority and risk classifications, screening
  prompts, assurance evidence plan and configured governance route.
- Run agentic triage when a system can act. It proposes a tier and containment
  review; AIG-AGT-04 remains authoritative for permissions and delegations.
- Download an AIG-INV-04 review handoff, proposed controlled AIG-INV-05 map handoff,
  AGPI/risk/agentic pre-fills, prospective gate plan, artefact handoff or case
  summary, including a AIG-DEC-02 paper-review handoff with blank preparer and
  actual paper date. Outputs are drafts that must be reconciled with current
  records and local owners; they are not directly importable rows.
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