# AI Multi-Board Triage & Governance Router

A browser-only triage calculator for drafting an AI-system priority, risk profile,
proportionate governance route, specialist-screening prompts and lifecycle
handoffs. It preserves the tool's purpose as one front door for priority/risk
triage and multi-forum routing, with an additional retirement/decommissioning
workflow. The browser stores no entries and sends no data to a server.

**Public Pages:** https://kimabercromby.github.io/AIGovernanceTriage-MultiBoard/

## Suite alignment and status

This tool is aligned as a review aid to the proposed Westminster AI governance
integration suite. The Council suite is a **proposed, unapproved draft**, not an
approved or live policy, process or workbook. This public tool does not read or
write Council records and must not be treated as Council-issued authority.

- **05:** permanent Council-issued AIR-ID and current assurance state. Look up and
  verify an existing AIR-ID in the current controlled workbook; this tool never
  creates one. Its "05 review handoff" is explicitly non-importable and does not
  assert current approval, operational state or assurance.
- **36:** the proposed integrated workbook separates prospective **Gate Plan**,
  dated **Gate Events**, and event-linked **Gate Conditions**. Exports are
  planning/review prompts only, not live rows or events.
- **16:** authorised decisions remain in WCC-AIG-16 or approved native forum
  minutes. The tool can prepare decision prompts; it does not decide or approve.
- **45:** agent permissions and delegations belong in WCC-AIG-45. An agency
  classification, Agent Record handoff or capability vector grants no authority.

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
  review; WCC-AIG-45 remains authoritative for permissions and delegations.
- Download a 05 review handoff, AGPI/risk/agentic pre-fills, prospective gate
  plan, artefact handoff or case summary. Outputs are drafts that must be
  reconciled with the current controlled workbook and local owners; they are
  not directly importable rows.
- Switch to retirement/decommissioning for a user-entered checklist and
  separate draft handoffs for a prospective plan, dated event and event-linked
  conditions. A "complete" checklist means only that answers were entered; it is
  not verified evidence and does not change the Register status.

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