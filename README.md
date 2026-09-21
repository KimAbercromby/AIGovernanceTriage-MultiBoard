# AI Multi-Board Triage & Governance Router

An interactive, organisation-neutral tool that classifies an AI system once and
carries that one classification across the governance forums that already exist.
One front door, one AI Register identifier (`AIR-ID`), one triage, one assurance
opinion, and a gate record that threads the forums together.

**Live tool:** https://kimabercromby.github.io/AIGovernanceTriage-MultiBoard/

## What it does

Every system enters the same front door and is captured once under one AIR-ID.
The tool then scores it and places it on one of three proportionate routes:

- **Light-touch route** for low-risk systems that cannot act: register as
  Priority 4 with a single light AI Register row and stop. No specialist
  assessments are triggered.
- **Standard route** for systems that inform decisions or touch residents:
  complete the Intake and only the assessments actually triggered, then follow
  the board route.
- **Enhanced / agentic route** for anything that can take actions: the agentic
  triage runs in addition to the priority triage.

## The engines

- **Priority (AGPI).** Six dimensions scored 1 to 5, normalised, weighted and
  summed to a 0 to 100 index, then banded into five priority levels.
- **Risk.** Likelihood by worst-of-five impact, discounted for control
  effectiveness to a residual tier, with a governance floor so strong controls
  cannot hide a severe inherent risk.
- **Mandatory escalation triggers.** Seven hard gates; any one floors the risk
  tier and mandates comprehensive assurance regardless of the scores.
- **Agentic triage (for systems that can act).** A single "can it act?" gate.
  When it fires, the system is scored as a profile across five agency dimensions
  (consequence, autonomy, authority, reach, controllability), the base tier is
  `max(autonomy, authority)`, and safety floors raise it to an agency tier from
  T0 to T5. Containment is checked (kill-switch demonstrated, rollback,
  boundaries tested); with no demonstrated kill-switch the tool says do not
  deploy. The autonomy level and agency tier are written to the Agent Record
  (ASBOM).

## Exports

- **Register row** matching the 36-column AI Register (05) in order, including
  the four agentic columns, with Residual Risk and Risk Tier left blank for the
  workbook to calculate.
- **Gate plan** for the planned governance route.
- **Artefact handoff** routing each captured field to the artefact whose form
  owns it.
- **Full summary** of the triage result.

A retirement mode handles decommissioning through a retirement gate.

## The tool suite

This is one of three companion tools:

- **Triage Calculator and Router** (this repo): produces the actual priority,
  risk and agency result for a system, with register and handoff exports.
- **[Lifecycle Walkthrough](https://kimabercromby.github.io/AIGovernanceWalkthrough-MultiBoard/)**:
  walks a system through the governance lifecycle from intake to retirement.
- **[Triage Engines Simulation](https://kimabercromby.github.io/triage-engines-simulation/)**:
  shows how the priority, risk and agency engines each reach their answer.

## Publish with GitHub Pages

This repository requires only `README.md` and `index.html`.

1. Add both files to the root of the repository.
2. Open the repository's **Settings**.
3. Select **Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select the `main` branch and the `/ (root)` folder, then save.

The published address is:

`https://kimabercromby.github.io/AIGovernanceTriage-MultiBoard/`

## How it runs

A single self-contained HTML file. It runs entirely in the browser, stores no
data, and has no dependencies.

## Important interpretation note

The forums and roles shown are generic; each organisation maps them to its own
approved authorities. This tool structures triage and planned routing. It does
not record that a gate has passed or grant permission to deploy. Formal
decisions, conditions and evidence are recorded at the relevant gate.
