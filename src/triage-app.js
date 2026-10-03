(function () {
  "use strict";

  const logic = window.TriageLogic;
  const byId = (id) => document.getElementById(id);
  const form = byId("triageForm");
  let latestAgentic = null;
  let latestAgenticContextKey = null;
  const agencyExportIds = ["downloadAgent", "downloadCapabilities", "downloadAgenticGovernance"];
  function syncAgencyExportAvailability() {
    agencyExportIds.forEach((id) => {
      const button = byId(id);
      button.disabled = !latestAgentic;
      button.setAttribute("aria-disabled", String(!latestAgentic));
    });
  }
  const enteredAgpiDimensions = new Set();
  const enteredImpactDimensions = new Set();
  let likelihoodEntered = false;
  let controlEntered = false;

  if (!logic || !form) {
    throw new Error("The calculator could not initialise.");
  }

  const profileFieldIds = [
    "situation",
    "fastTrack",
    "registerId",
    "ucId",
    "ucIdStatus",
    "systemName",
    "purpose",
    "usePurpose",
    "serviceArea",
    "serviceOwner",
    "supplierDeveloper",
    "source",
    "capability",
    "actionAuthority",
    "systemsAccessed",
    "lifecycle",
    "dataType",
    "procurementRoute",
    "newInvestment",
    "systemApproval",
    "affectsIndividuals",
    "publicFacing",
    "dateFirstUsed",
  ];

  const forumLabels = {
    strategic: "Strategic prioritisation forum",
    technical: "Technical design authority",
    assurance: "AI assurance authority",
    digital: "Case for change / strategic alignment forum",
    commercial: "Procurement / commercial authority",
    ethics: "Ethics decision owner",
    release: "Go-live decision-maker",
  };

  function appendTextElement(parent, tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    element.textContent = text;
    parent.appendChild(element);
    return element;
  }

  function buildForumFields() {
    const container = byId("forumFields");
    Object.entries(logic.DEFAULT_FORUMS).forEach(([key, value]) => {
      const label = document.createElement("label");
      label.className = "field";
      appendTextElement(label, "span", "", forumLabels[key]);
      const input = document.createElement("input");
      input.id = `forum-${key}`;
      input.value = value;
      input.dataset.forum = key;
      input.autocomplete = "off";
      label.appendChild(input);
      container.appendChild(label);
    });
  }

  function buildDimensions() {
    const container = byId("dimensions");
    logic.DIMENSIONS.forEach((dimension) => {
      const section = document.createElement("fieldset");
      section.className = "dimension";

      const legend = document.createElement("legend");
      legend.className = "visually-hidden";
      legend.textContent = `${dimension.name}, weight ${dimension.weight}%`;
      section.appendChild(legend);

      const description = document.createElement("div");
      const title = appendTextElement(
        description,
        "p",
        "dimension-name",
        dimension.name,
      );
      const weight = appendTextElement(
        title,
        "span",
        "weight",
        `${dimension.weight}%`,
      );
      weight.setAttribute("aria-label", `Weight ${dimension.weight} percent`);
      appendTextElement(
        description,
        "p",
        "dimension-question",
        dimension.question,
      );
      section.appendChild(description);

      const scale = document.createElement("div");
      scale.className = "scale";
      logic.SCALE_LABELS.forEach((scaleLabel, index) => {
        const score = index + 1;
        const label = document.createElement("label");
        label.className = "scale-option";
        const input = document.createElement("input");
        input.type = "radio";
        input.id = `score-${dimension.id}-${score}`;
        input.name = `score-${dimension.id}`;
        input.value = String(score);
        input.checked = score === 1;
        input.dataset.dimension = dimension.id;
        label.htmlFor = input.id;
        input.setAttribute(
          "aria-label",
          `${dimension.name}: ${score}, ${scaleLabel}`,
        );

        const span = document.createElement("span");
        const contents = document.createElement("span");
        appendTextElement(contents, "strong", "", String(score));
        contents.append(document.createTextNode(scaleLabel));
        span.appendChild(contents);

        label.append(input, span);
        scale.appendChild(label);
      });
      section.appendChild(scale);
      container.appendChild(section);
    });
  }

  function buildTriggers() {
    const container = byId("triggers");
    container.className = "trigger-list";
    logic.TRIGGERS.forEach((trigger) => {
      const label = document.createElement("label");
      label.className = "trigger";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.value = trigger.id;
      input.dataset.trigger = trigger.id;
      const text = document.createElement("span");
      text.textContent = trigger.text;
      label.append(input, text);
      container.appendChild(label);
    });
  }

  function buildImpacts() {
    const container = byId("impacts");
    logic.IMPACT_DIMENSIONS.forEach((impact) => {
      const label = document.createElement("label");
      label.className = "field impact-field";
      appendTextElement(label, "span", "", impact.name);
      appendTextElement(label, "small", "", impact.hint);
      const select = document.createElement("select");
      select.id = `impact-${impact.id}`;
      select.dataset.impact = impact.id;
      for (let score = 1; score <= 5; score += 1) {
        const option = document.createElement("option");
        option.value = String(score);
        option.textContent = `${score} · ${logic.SCALE_LABELS[score - 1]}`;
        option.selected = score === 2;
        select.appendChild(option);
      }
      label.appendChild(select);
      container.appendChild(label);
    });
  }

  function getProfile() {
    return Object.fromEntries(
      profileFieldIds.map((id) => [id, byId(id).value.trim()]),
    );
  }

  function getForums() {
    return Object.fromEntries(
      Object.keys(logic.DEFAULT_FORUMS).map((key) => [
        key,
        byId(`forum-${key}`).value.trim() || logic.DEFAULT_FORUMS[key],
      ]),
    );
  }

  function getAgpiScores() {
    return Object.fromEntries(
      logic.DIMENSIONS.map((dimension) => {
        const selected = form.querySelector(
          `input[name="score-${dimension.id}"]:checked`,
        );
        return [dimension.id, Number(selected ? selected.value : 1)];
      }),
    );
  }

  function getImpactScores() {
    return Object.fromEntries(
      logic.IMPACT_DIMENSIONS.map((impact) => [
        impact.id,
        Number(byId(`impact-${impact.id}`).value),
      ]),
    );
  }

  // Triggers implied by the profile are ticked and locked: actions without evidenced
  // per-action human review (Unsure counts as No) and special category data.
  function syncImpliedTrigger(id, implied, reason) {
    const box = form.querySelector(`[data-trigger="${id}"]`);
    if (!box) return;
    if (implied) {
      if (!box.checked) box.dataset.autoChecked = "true";
      box.checked = true;
      box.disabled = true;
      box.title = reason;
    } else {
      box.disabled = false;
      box.removeAttribute("title");
      if (box.dataset.autoChecked === "true") {
        box.checked = false;
        delete box.dataset.autoChecked;
      }
    }
  }

  function getTriggerIds() {
    const profile = getProfile();
    const review = logic.perActionReview(profile);
    syncImpliedTrigger("agentic", review === "No" || review === "Unsure",
      review === "Unsure"
        ? "Automatically selected: per-action human review is Unsure, which is treated as No (Playbook §4.4.6)."
        : "Automatically selected because the system can execute actions without human review of each individual action.");
    syncImpliedTrigger("specialData", profile.dataType === "Special category data",
      "Automatically selected because the data type is special category data.");
    return logic.normaliseTriggerIds(profile, Array.from(form.querySelectorAll("[data-trigger]:checked")).map(
      (input) => input.dataset.trigger,
    ));
  }

  function currentAgentic() {
    if (!latestAgentic) return null;
    return logic.currentAgenticAssessment(latestAgentic, latestAgenticContextKey, getProfile(), readAgentic());
  }

  function calculateAll() {
    const profile = getProfile();
    const forums = getForums();
    const agpiScores = getAgpiScores();
    const impactScores = getImpactScores();
    const triggerIds = getTriggerIds();
    // Governance priority (urgency) and governing tier (route): Playbook §3.9.6,
    // §3.10.1 and §4.4; AIG-ASS-01 B17; AIG-ASS-02 Risk Assessment C43. The agency-tier
    // minimum applies once a current agentic assessment exists.
    const results = logic.calculateTriage({
      profile,
      agpiScores,
      impactScores,
      likelihood: byId("likelihood").value,
      control: byId("control").value,
      controlEvidence: byId("controlEvidence").value,
      controlEvidenceRef: byId("controlEvidenceRef").value,
      verificationRef: byId("verificationRef").value,
      triggerIds,
      agentic: currentAgentic(),
      governanceInvestigation: byId("governanceInvestigation").value,
    });
    return {
      profile,
      forums,
      agpiScores,
      impactScores,
      results,
      evidence: logic.buildEvidenceList(profile, results),
      route: logic.buildRoute(profile, results, forums),
    };
  }

  function renderRoute(route) {
    const body = byId("routeRows");
    body.replaceChildren();
    route.forEach((gate) => {
      const row = document.createElement("tr");

      const numberCell = document.createElement("td");
      // Show the AIG-DEC-01 gate number; the Assurance Board input is not a gate.
      appendTextElement(numberCell, "span", "gate-number", gate.gateNumber != null ? String(gate.gateNumber) : "A");
      appendTextElement(
        numberCell,
        "span",
        "gate-requirement",
        gate.requirement,
      );

      const decisionCell = document.createElement("td");
      appendTextElement(decisionCell, "span", "gate-forum", gate.forum);
      appendTextElement(decisionCell, "span", "gate-decision", gate.decision);

      const evidenceCell = document.createElement("td");
      const list = document.createElement("ul");
      list.className = "gate-evidence";
      gate.evidence.forEach((item) => {
        appendTextElement(list, "li", "", item);
      });
      evidenceCell.appendChild(list);
      appendTextElement(
        evidenceCell,
        "span",
        "handoff",
        `Handoff: ${gate.handoff}`,
      );

      const statusCell = document.createElement("td");
      const status = appendTextElement(
        statusCell,
        "span",
        "status-badge",
        gate.status,
      );
      if (gate.status.startsWith("Not required") || gate.status.startsWith("Conditional")) {
        status.classList.add("not-required");
      }

      row.append(numberCell, decisionCell, evidenceCell, statusCell);
      body.appendChild(row);
    });
  }

  function renderEvidence(evidence) {
    const list = byId("evidenceList");
    list.replaceChildren();
    evidence.forEach((item) => appendTextElement(list, "li", "", item));
  }

  function renderHandoff(profile, results) {
    const container = byId("handoffRows");
    if (!container) return;
    container.replaceChildren();
    const items = logic.buildArtefactHandoff(profile, results);
    items.forEach((item) => {
      const block = document.createElement("div");
      block.className = "handoff-item";
      const h = document.createElement("h4");
      h.textContent = item.artefact;
      block.appendChild(h);
      const sec = document.createElement("p");
      sec.className = "handoff-section";
      sec.textContent = item.section;
      block.appendChild(sec);
      const dl = document.createElement("dl");
      item.fields.forEach((f) => {
        const dt = document.createElement("dt");
        dt.textContent = f.label;
        const dd = document.createElement("dd");
        dd.textContent = f.value;
        dl.appendChild(dt);
        dl.appendChild(dd);
      });
      block.appendChild(dl);
      if (item.note) {
        const note = document.createElement("p");
        note.className = "handoff-note";
        note.textContent = item.note;
        block.appendChild(note);
      }
      container.appendChild(block);
    });
  }

  function renderContinuity(profile, route) {
    byId("continuityIdentity").textContent = profile.registerId
      ? `Entered AIR-ID: ${profile.registerId} · verify against AIG-INV-04`
      : "AIR-ID pending · use the intake reference until confirmed";
    byId("continuityIdentity").textContent += profile.ucId
      ? ` · UC-ID: ${profile.ucId} (${profile.ucIdStatus || "verification pending"})`
      : " · UC-ID pending for this use by operator choice; not a shared system baseline";
    const next = route.find((g) => g.gate && g.applicability === "Required") || route.find((g) => g.gate && g.applicability !== "Not applicable") || route[0];
    byId("continuityNext").textContent = next
      ? `Next proposed handoff: ${next.requirement} · ${next.forum}. Carry the confirmed AIR-ID forward; do not mark the gate complete here.`
      : "No gate has been proposed; the governance owner must confirm the route.";
  }

  // "What's happening?" (v3.9.2, T-01): found already in use → full retrospective
  // intake, never light-touch; change (or use beyond an approval) → re-entry.
  function situationNote(profile) {
    if (logic.isFoundInUse(profile)) {
      return "Found already in use: AI already in use always goes through full retrospective intake (AIG-INV-03) and triage, never Fast Track or the light-touch route. Register it on AIG-INV-04 (Intake type Retrospective) and apply a precautionary pause if there is a real risk of harm (Playbook \u00a74.7.17). ";
    }
    const situation = logic.situationOf(profile);
    if (situation === logic.SITUATIONS.change) {
      return "Change to a use in governance: this is re-entry. The changed use returns to full intake and triage on the same AIR-ID (Gate 7), never the light-touch route; tick the Material change trigger if the change is significant. ";
    }
    if (situation === logic.SITUATIONS.approved) {
      return "Already approved: if this use matches the approval exactly (AIR-ID, UC-ID, purpose, data, users and conditions in AIG-DEC-03, with the Register showing Approved and Active), no new triage is needed; use it within scope. If anything differs, it is a change and re-enters intake, as triaged here. ";
    }
    return "";
  }

  function governanceRoute(profile, results) {
    const canAct = logic.isActionCapable(profile, results.triggerIds);
    const review = results.perActionReview;
    const unsure = profile.actionAuthority === logic.ACTION_AUTHORITY.unsure;
    const lead = situationNote(profile);
    if (results.governanceInvestigation) {
      return {
        key: "standard",
        name: "Governance Investigation Required \u2014 route to discovery",
        why: lead + "AIG-ASS-01 B19 is Yes, so the governance priority is \u201cGovernance Investigation Required \u2014 route to discovery\u201d: the AI Governance Lead investigates ownership, purpose and current use before the priority and route are set. The governing tier below still shows the minimum route once the facts are confirmed.",
      };
    }

    if (canAct) {
      const gates = "Gate 2 (Technical design review, agentic control checkpoints) and Gate 6 (go-live, which grants the permitted autonomy level) are mandatory for every action-capable use, at any agency tier including T0.";
      const agency = results.agencyPending
        ? " Run Assess agency: the agency tier sets a minimum pathway (T2 Medium, T3 High, T4 High or Critical, T5 Critical) and the higher governs."
        : results.agencyTierLabel
          ? ` Agency tier ${results.agencyTierLabel}: minimum pathway ${results.agencyMinTier || "none"}.`
          : "";
      return {
        key: "agentic",
        name: "Agentic governance pathway",
        why: lead + (unsure
          ? "“Can it act?” is Unsure, so the use is treated as action-capable until confirmed, and per-action human review is treated as No. The mandatory agentic trigger therefore applies and the minimum governing tier is Critical (Playbook §4.4.6). "
          : review === "No" || results.triggerIds.includes("agentic")
            ? "This system can execute actions without human review of each individual action. The mandatory agentic trigger therefore applies and the minimum governing tier is Critical (Playbook §4.4.6). "
            : "This system can act, but each individual action remains human-approved. A Critical floor is not imposed solely because the system is agentic. ") +
          gates + agency + " Complete the Agentic Triage, Agent Record (ASBOM) and authority controls.",
      };
    }

    if (logic.isLightTouch(profile, results)) {
      return {
        key: "light",
        name: "Light-touch governance pathway",
        why: "Low risk and low governance priority do not waive duties. Complete Equality Act s149, HRA s6 and data-protection/privacy screening, verify the Council-issued AIR-ID and current AIG-INV-04 state, retain proportionate baseline documentation, named ownership, controls and review, and record the delegated decision for this UC-ID (by the officer or forum with confirmed delegation) before use (Playbook §3.8.2.1). This use reached this route through the one-page Fast-Track Screening (AIG-INV-02) with all ten answers No; the AI Governance Lead validates the route. With no new investment, Gate 3 is proposed N/A; for a new use of an existing approved system Gate 1 is N/A too, so the plan is the intake event, the single delegated decision (Gate 6) and review. A system new to the Council still goes to Gate 1, even if free (AIG-DEC-01 Gate 1 and 3 rule). The screening may be done by reference to a current covering assessment, such as the system's DPIA, recorded in the Fast-Track Part C box (Playbook \u00a74.6). The Fast-Track decides the route only: the equality, human-rights and privacy screening is still recorded, and can draw on the Fast-Track answers."
      };
    }

    const ftBlock = logic.lightTouchBlockReason(profile, results);
    if (ftBlock && !logic.isFoundInUse(profile) && !logic.isReentry(profile)) {
      return {
        key: "standard",
        name: "Non-agentic governance pathway \u00b7 Standard route at Low",
        why: ftBlock + " Low risk and low priority do not waive duties: complete the Equality Act s149, HRA s6 and data-protection/privacy screening and record the delegated decision for this UC-ID before use."
      };
    }
    if (logic.isFoundInUse(profile)) {
      return { key: "standard", name: "Retrospective intake (found already in use) \u00b7 non-agentic", why: lead + "Its route follows the governing tier (the highest of the risk tier, any \u00a74.4.6 trigger floor and the impact floor); the AGPI priority sets how quickly governance looks at it." };
    }
    if (logic.isReentry(profile)) {
      return { key: "standard", name: "Re-entry: full intake and triage for the changed use \u00b7 non-agentic", why: lead + "Its route follows the governing tier (the highest of the risk tier, any \u00a74.4.6 trigger floor and the impact floor); the AGPI priority sets how quickly governance looks at it." };
    }
    return {
      key: "standard",
      name: "Non-agentic governance pathway",
      why: "This system does not exercise autonomous action authority. Its route follows the governing tier (the highest of the risk tier, any §4.4.6 trigger floor and the impact floor); the AGPI priority sets how quickly governance looks at it, not the route."
    };
  }

  function update() {
    const calculation = calculateAll();
    const { profile, results, route, evidence } = calculation;
    renderContinuity(profile, route);

    const gRoute = governanceRoute(profile, results);
    const routeBanner = byId("routeBanner");
    if (routeBanner) {
      routeBanner.className = "route-banner route-" + gRoute.key;
      byId("routeBannerName").textContent = `Provisional · ${gRoute.name}`;
      byId("routeBannerWhy").textContent = gRoute.why;
    }

    const controlStatus = byId("controlStatus");
    if (controlStatus) {
      const evidenced = results.controlEvidence === "Implemented and evidenced" ||
        results.controlEvidence === "Implemented, evidenced and independently verified";
      const highInherent = results.inherentTierName === "High" || results.inherentTierName === "Critical";
      controlStatus.textContent = results.evidenceRefMissing
        ? "Not counted yet: add the control evidence reference (and, for a High or Critical risk before controls, the independent verification reference). AIG-ASS-02 counts controls only with these references (Risk Assessment E38 / E40)."
        : !evidenced
        ? "Not counted yet: controls are not evidenced, so the tier uses the risk before controls. This score only shows what the tier could become once they are in place and evidenced."
        : highInherent && results.controlEvidence !== "Implemented, evidenced and independently verified"
          ? "Not counted yet: the risk before controls is High or Critical, so the controls also need independent verification before they can lower the tier."
          : "Counted: controls are implemented and evidenced, so the tier uses the risk after controls (never below any trigger floor).";
    }
    byId("agpiScore").textContent = formatNumber(results.agpiScore);
    byId("agpiPriority").textContent = results.governanceInvestigation
      ? `Provisional · ${results.effectiveGovernancePriority} (AGPI band ${results.priority.label}) · UC-ID ${profile.ucId || "pending"} use-specific`
      : `Provisional · ${results.priority.label} · UC-ID ${profile.ucId || "pending"} use-specific`;
    byId("agpiAction").textContent = [
      `Typical governance attention (urgency): ${results.priority.action}`,
      results.priority.floorApplied ? `${results.priority.floorNote} (Proposed — for Council confirmation).` : "",
      results.priority.overrideNote,
      "The AGPI priority sets how quickly governance looks at this use; the route is set by the governing tier.",
    ].filter(Boolean).join(" ");
    byId("needle").style.left = `${results.agpiScore}%`;

    byId("impactScore").textContent = formatNumber(results.risk.impact);
    byId("inherentRisk").textContent =
      `${formatNumber(results.risk.inherent)} · ${results.inherentTierName}`;
    byId("residualRisk").textContent =
      `${formatNumber(results.risk.residual)} · ${results.residualTierName}`;
    byId("riskTier").textContent =
      `Provisional · ${tierText(results)} · UC-ID ${profile.ucId || "pending"} use-specific`;
    byId("tierStat").className =
      `stat tier-${results.effectiveTierName.toLowerCase()}`;

    const escalationBanner = byId("escalationBanner");
    const tierIsHighOrCritical =
      results.effectiveTierName === "High" ||
      results.effectiveTierName === "Critical";
    if (results.triggerIds.length || tierIsHighOrCritical || results.impactFloorApplied || results.agencyPending) {
      escalationBanner.classList.add("visible");
      const parts = [];
      if (results.triggerIds.length) {
        parts.push(
          `${results.triggerIds.length} mandatory trigger${results.triggerIds.length === 1 ? "" : "s"} selected.`,
        );
      }
      parts.push(
        `Provisional governing tier: ${tierText(results)}` +
          (results.tierFloored && results.floorReason
            ? ` (raised by ${results.floorReason}; residual was ${results.residualTierName}).`
            : "."),
      );
      if (results.agencyPending) {
        parts.push("This use can act and its agency tier is not yet assessed: Gate 2 is mandatory regardless, and the agency-tier minimum pathway may raise the governing tier.");
      }
      if (results.tierFloored) {
        parts.push(
          "This is a triage result, not current AIG-INV-04 assurance state. If an authorised forum decides on escalation, record that decision in AIG-DEC-03 or approved native minutes and link its dated Gate Event in AIG-DEC-04.",
        );
      }
      if (results.triggerIds.length) {
        parts.push(
          "Notify the AI Governance Lead and AI Assurance Board without delay.",
        );
      }
      byId("escalationText").textContent = parts.join(" ");
    } else {
      escalationBanner.classList.remove("visible");
      byId("escalationText").textContent = "";
    }

    byId("summaryPriority").textContent =
      `Provisional · ${results.effectiveGovernancePriority} · UC-ID ${profile.ucId || "pending"} use-specific`;
    byId("summaryTier").textContent =
      `Provisional · ${tierText(results)} · UC-ID ${profile.ucId || "pending"} use-specific` +
      (results.tierFloored && results.floorReason ? ` (governance floor: ${results.floorReason})` : "") +
      ` · inherent ${results.inherentTierName} · residual ${formatNumber(results.risk.residual)} (${results.residualTierName})` +
      (results.agencyTierLabel ? ` · agency ${results.agencyTierLabel.split(" ")[0]} → governing ${results.effectiveTierName}` : "");
    byId("summaryIntensity").textContent = `Provisional · ${results.assuranceIntensity} · decision route: ${results.decisionRoute}`;
    const nextGate = route.find((g) => g.gate && g.applicability === "Required") || route.find((g) => g.gate && g.applicability !== "Not applicable") || route[0];
    byId("summaryNextGate").textContent = `Proposed · ${nextGate.requirement}`;
    byId("summaryCommercial").textContent = `${results.gate4.label} (procurement route: ${results.gate4.route}); the commercial owner confirms`;
    byId("summaryMonitoring").textContent = results.agencyPending
      ? `${results.monitoringMinimum} The governing tier is at least ${results.effectiveTierName} until Assess agency is run.`
      : results.monitoringMinimum;
    byId("summarySituation").textContent = `${logic.situationOf(profile)}${logic.isFoundInUse(profile) ? " \u00b7 full retrospective intake" : logic.isReentry(profile) ? " \u00b7 re-entry" : ""}`;
    byId("summaryEscalation").textContent = results.triggerIds.length
      ? `${results.triggerIds.length} mandatory trigger${results.triggerIds.length === 1 ? "" : "s"}`
      : "No mandatory trigger selected";
    byId("summaryGovernanceStatus").textContent = results.governanceStatus;

    renderEvidence(evidence);
    renderRoute(route);
    renderHandoff(profile, results);
    updateProvisionalCue();
    return calculation;
  }

  // The governing tier, marked "at least" while an action-capable use's agency tier
  // is not yet assessed (its minimum pathway may raise it).
  function tierText(results) {
    return results.agencyPending ? `at least ${results.effectiveTierName}` : results.effectiveTierName;
  }

  function formatNumber(value) {
    return Number.isInteger(Number(value))
      ? String(Number(value))
      : Number(value).toFixed(1);
  }

  function formatInputDate(value) {
    if (!value) return "";
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
  }

  function safeSlug(value) {
    const slug = String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return slug || "ai-system";
  }

  function validateForExport() {
    const staleAgentic = latestAgentic && !logic.currentAgenticAssessment(
      latestAgentic,
      latestAgenticContextKey,
      getProfile(),
      readAgentic(),
    );
    if (staleAgentic) invalidateAgency();
    const required = [byId("systemName"), byId("purpose"), byId("usePurpose")];
    const invalid = required.find((field) => !field.value.trim());
    if (invalid) {
      byId("validationMessage").textContent =
        "Add the system or model name, system purpose and exact use-case purpose before exporting. AIR-ID and UC-ID are never created here; leave UC-ID pending if it is not already available.";
      invalid.reportValidity();
      invalid.focus();
      return false;
    }
    const ucId = byId("ucId").value.trim();
    const ucIdStatus = byId("ucIdStatus").value;
    const ucPending = ucIdStatus === "Pending — no UC-ID entered";
    if ((!ucId && !ucPending) || (ucId && ucPending)) {
      byId("validationMessage").textContent =
        "Enter a UC-ID and choose Existing or Provisional, or leave the ID blank with Pending selected. The tool never issues or verifies a UC-ID.";
      byId("ucId").focus();
      return false;
    }
    if (!byId("triageReviewed").checked) {
      byId("validationMessage").textContent =
        "Review the scores, action authority and mandatory triggers, then tick the confirmation box before exporting.";
      byId("triageReviewed").focus();
      return false;
    }
    byId("validationMessage").textContent = staleAgentic
      ? "The system profile or agency answers changed since the last assessment. That assessment was invalidated; run Assess agency again before exporting agentic records."
      : "";
    return true;
  }

  function download(filename, contents, type) {
    const blob = new Blob([contents], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  function triggerLabels(ids) {
    const selected = new Set(ids);
    return logic.TRIGGERS.filter((trigger) => selected.has(trigger.id)).map(
      (trigger) => trigger.text,
    );
  }

  function buildSummary(calculation) {
    const {
      profile,
      agpiScores,
      impactScores,
      results,
      evidence,
      route,
    } = calculation;
    const lines = [
      "AI MULTI-BOARD TRIAGE SUMMARY",
      "==========================================",
      "",
      `Generated: ${logic.formatDate(new Date())}`,
      `Aligned to: ${logic.SUITE.label} — proposed drafts, not approved`,
      `AIR-ID: ${profile.registerId || "Not assigned"}`,
      `UC-ID: ${profile.ucId || "Pending — not assigned"}`,
      `UC-ID status: ${profile.ucIdStatus || "Pending — no UC-ID entered"}`,
      `System / model: ${profile.systemName || "Not entered"}`,
      `Purpose: ${profile.purpose || "Not entered"}`,
      `Exact scoped use purpose / outcome: ${profile.usePurpose || "Not entered"}`,
      "Assessment scope: priority and risk apply only to the stated use/outcome; materially different uses require distinct use-scoped triage. This is not approval.",
      `Service area: ${profile.serviceArea || "Not entered"}`,
      `Service owner: ${profile.serviceOwner || "Not entered"}`,
      `Supplier / developer: ${profile.supplierDeveloper || "Not entered"}`,
      `Source: ${profile.source}`,
      `AI capability: ${profile.capability}`,
      `Automated action authority: ${profile.actionAuthority}`,
      `Systems / tools accessed: ${profile.systemsAccessed || "Not entered"}`,
      `Operational state: ${profile.lifecycle}`,
      `Data type: ${profile.dataType}`,
      `What's happening: ${logic.situationOf(profile)}${logic.isFoundInUse(profile) ? " (full retrospective intake; never light-touch)" : logic.isReentry(profile) ? " (re-entry to intake on the same AIR-ID)" : ""}`,
      `Fast-Track Screening (AIG-INV-02): ${logic.fastTrackOf(profile)}`,
      `Procurement route: ${results.gate4.route}; Gate 4: ${results.gate4.label}`,
      "",
      "AGPI PRIORITY",
      "-------------",
      ...logic.DIMENSIONS.map(
        (dimension) =>
          `${dimension.name} (${dimension.weight}%): ${agpiScores[dimension.id]} / 5`,
      ),
      `Weighted AGPI score: ${formatNumber(results.agpiScore)} / 100`,
      `AGPI band: ${results.priority.band ? results.priority.band.label : results.priority.label}`,
      `Priority floor: ${results.priority.floorNote || "No floor effect"}`,
      `Mandatory escalation trigger applies (AIG-ASS-01 row 23): ${results.triggerAnswer}`,
      `Trigger floor (AIG-ASS-01 row 24): ${results.priority.triggerFloorNote || "Not applicable"}`,
      `Governance Investigation Required? (AIG-ASS-01 B19): ${results.governanceInvestigation ? "Yes" : "No"}`,
      `Provisional governance priority: ${results.effectiveGovernancePriority}`,
      `Typical governance attention (urgency): ${results.priority.action}`,
      "The AGPI priority sets urgency and sequencing only; the route is set by the governing tier (Playbook §3.10.1).",
      "",
      "RISK AND ESCALATION",
      "-------------------",
      ...logic.IMPACT_DIMENSIONS.map(
        (impact) => `${impact.name}: ${impactScores[impact.id]} / 5`,
      ),
      `Highest impact: ${results.risk.impact}`,
      `Likelihood: ${results.risk.likelihood}`,
      `Inherent risk: ${results.risk.inherent}`,
      `Control effectiveness: ${results.risk.control}`,
      `Control evidence: ${results.controlEvidence}; evidence ref: ${results.controlEvidenceRef || "not entered"}; verification ref: ${results.verificationRef || "not entered"}`,
      `Residual risk: ${formatNumber(results.risk.residual)}`,
      `Provisional governing tier: ${tierText(results)}${results.tierFloored && results.floorReason ? ` (governance floor: ${results.floorReason})` : ""}`,
      `Risk tier with trigger floor: ${results.riskTierName}`,
      `Impact floor (any confirmed Impact 5 → at least Medium): ${results.impactFloorApplied ? "applied" : "no effect"}`,
      `Action-capable ("can it act?", Unsure = Yes): ${results.actionCapable ? "Yes" : "No"}; per-action human review: ${results.perActionReview}`,
      `Agency-tier minimum pathway: ${results.actionCapable ? (results.agencyPending ? "pending — run Assess agency" : (results.agencyMinTier || "none")) : "not applicable"}`,
      `Decision route for the governing tier: ${results.decisionRoute}`,
      ...(results.tierFloored
        ? [
            "  Note: this effective triage tier is a draft routing input, not a current assurance state. If a formal decision is reached, record it in AIG-DEC-03 or approved native minutes and link the separate dated Gate Event in AIG-DEC-04.",
          ]
        : []),
      `Provisional inherent risk tier: ${results.inherentTierName}`,
      `Provisional residual risk tier: ${results.residualTierName}`,
      `Provisional assurance intensity: ${results.assuranceIntensity}`,
      `Monitoring minimum: ${results.monitoringMinimum}`,
      `Governance status: ${results.governanceStatus}`,
      "Mandatory triggers:",
      ...(results.triggerIds.length
        ? triggerLabels(results.triggerIds).map((label) => `- ${label}`)
        : ["- None selected"]),
      "",
      "REQUIRED EVIDENCE PACKAGE",
      "-------------------------",
      ...evidence.map((item) => `- ${item}`),
      "",
      "PLANNED MULTI-BOARD ROUTE",
      "-------------------------",
    ];

    route.forEach((gate) => {
      lines.push(
        "",
        `${gate.requirement}${gate.gate ? ` (${gate.applicability})` : ""}`,
        `Forum / authority: ${gate.forum}`,
        `Status: ${gate.status}`,
        `Decision: ${gate.decision}`,
        "Evidence:",
        ...gate.evidence.map((item) => `- ${item}`),
        `Handoff: ${gate.handoff}`,
      );
    });

    if (latestAgentic) {
      const a = latestAgentic;
      lines.push(
        "",
        "AGENTIC TRIAGE",
        "--------------",
        `Agency tier: ${a.tierLabel}`,
        `Autonomy: ${a.autonomyLabel}`,
        ...logic.AGENCY_DIMENSIONS.map((d) => `${d.label} (0-5): ${a[d.id]} | Rationale: ${(a.dimensionNotes[d.id] || {}).rationale || "Not supplied"} | Evidence ref: ${(a.dimensionNotes[d.id] || {}).evidenceRef || "Not supplied"}`),
        `Tier set by: ${a.setBy && a.setBy.length ? a.setBy.join(", ") : "no floor above T0"} (AIG-AGT-02/AIG-AGT-03 Tables A and B)`,
        `Governance pathway: ${a.pathway}`,
        `Escalation reasons: ${a.escalations.length ? a.escalations.join("; ") : "None"}`,
        `Containment flags: ${a.flags.length ? a.flags.join("; ") : "None"}`,
        `Deployment control: ${a.deploymentControl}`,
        `Kill-switch demonstrated: ${yesNo(a.killSwitch)}`,
        `Rollback capability: ${yesNo(a.rollback)}`,
        `Boundary tests completed: ${yesNo(a.boundariesTested)}`,
        `Worst plausible chain: ${a.worstChain || "Not entered"}`,
        `Capabilities selected: ${a.capabilities.length ? a.capabilities.join("; ") : "None selected"}`,
        `Agent Record (ASBOM) reference: ${a.asbomRef || "Not entered"}`,
        "Draft handoff only: no agent authority is granted. AIG-AGT-04 owns permissions and delegations.",
      );
    }

    const handoffItems = logic.buildArtefactHandoff(profile, results);
    lines.push("", "ARTEFACT HANDOFF", "----------------");
    handoffItems.forEach((item) => {
      lines.push(
        "",
        item.artefact,
        `Section: ${item.section}`,
        ...item.fields.map((f) => `- ${f.label}: ${f.value}`),
        `Note: ${item.note}`,
      );
    });

    lines.push(
      "",
      "IMPORTANT",
      "---------",
      "This is a planned route, not evidence that any gate has been passed.",
      "AIG-INV-04 holds the permanent Council-issued AIR-ID and current assurance state. AIG-DEC-04 separates prospective Gate Plans, dated Gate Events and event-linked Gate Conditions.",
      "Formal decisions stay in AIG-DEC-03 or approved native minutes; evidence remains at source with versioned pointers in AIG-INV-04. Proposed controlled artefact AIG-INV-05 is a relationship catalogue, not a second Register, and is not approved/adopted.",
      "This draft does not create an AIR-ID, assurance state, legal scope, FRIA completion, approval, publication or ISO conformity.",
      "Decision support only: validate forum names, delegated authorities and assessment requirements locally.",
    );
    return `${lines.join("\n")}\n`;
  }


  function yesNo(value) {
    return value ? "Yes" : "No";
  }

  function fieldValueCsv(rows, sheet) {
    return logic.toCsv(
      [
        "Field label / prompt",
        "Field reference type",
        "Triage draft value",
        "Value status",
        "Review, evidence or authority still required",
      ],
      rows.map(([field, value, rowSheet]) => [
        field,
        logic.fieldReferenceType(rowSheet || sheet || "", field),
        value == null ? "" : value,
        "Triage proposal only — owner verification required",
        "Review the current artefact and its controlled field list; do not import as a completed assessment.",
      ]),
    );
  }

  function buildCanonicalRecord(calculation) {
    return logic.buildCanonicalRecord(calculation, latestAgentic ? readAgentic() : null, latestAgentic);
  }

  // Rows 1-18 are the AIG-ASS-01 v1.4 "AGPI Triage" column A labels, in sheet order
  // (rows 5-8, 10-19, 21-24). Formula-owned results are given as check values; notes
  // after them are context only.
  function agpiPrefillCsv(calculation) {
    const p = calculation.profile;
    const r = calculation.results;
    const s = calculation.agpiScores;
    const rows = [
      ["System / model name", p.systemName],
      ["AIR-ID", p.registerId],
      ["Assessed by / date", ""],
      ["UC-ID (required when scope is UC-ID specific)", p.ucId],
      ["Resident Impact", s.resident],
      ["Public Trust & Reputation", s.trust],
      ["Legal & Regulatory Exposure", s.legal],
      ["Governance Visibility & Accountability", s.visibility],
      ["Strategic Value & Organisational Dependency", s.strategic],
      ["Human Oversight & Decision Authority", s.oversight],
      ["AGPI score (0–100)", r.agpiScore],
      ["Governance priority", r.priority.ass01Label],
      ["Assessment scope (UC-ID specific / Shared system baseline)", "UC-ID specific"],
      ["Governance Investigation Required? (Yes / No)", r.governanceInvestigation ? "Yes" : "No"],
      ["Priority floor: Resident Impact or Legal & Regulatory Exposure = 5 (Proposed — for Council confirmation)", r.priority.floorNote],
      ["Typical governance attention for this priority (urgency)", r.governanceInvestigation ? "" : (logic.PRIORITIES.find((x) => x.label === r.priority.ass01Label) || r.priority).action],
      ["Mandatory escalation trigger applies (Playbook §4.4.6)? (Yes / No / Unsure)", r.triggerAnswer],
      ["Trigger floor: a §4.4.6 trigger use is at least Priority 4 (Proposed — for Council confirmation)", r.priority.triggerFloorNote],
      ["Note (not a field) — Rationale / evidence ref (required, column F) for each of the six dimensions", ""],
      ["Note (not a field) — Formula-owned values", "AGPI score (D16), Governance priority (B17), Priority floor (B21), Typical governance attention (B22) and Trigger floor (B24) are calculated by the workbook; use the values above only to check its result. Enter the inputs: scores (C10:C15), scope (B18), Governance Investigation Required? (B19) and the §4.4.6 trigger answer (B23)."],
      ["Note (not a field) — Paste targets", "Column B: rows 5-8, 18, 19 and 23. Column C: rows 10-15 (scores). Rows 16, 17, 21, 22 and 24 are formula-owned; do not paste over them."],
      ["Note (not a field) — Use-case scope / exact outcome assessed", p.usePurpose],
      ["Note (not a field) — UC-ID entry status (not verification)", p.ucIdStatus],
      ["Note (not a field) — UC-ID interpretation", p.ucId ? "UC-ID-specific use triage." : "UC-ID-specific provisional use triage; ID pending, not a selected shared system baseline."],
      ["Note (not a field) — Import limitation", p.ucId ? "Use-scoped proposal; verify this UC-ID before transfer." : "Use-scoped triage has no UC-ID yet; keep pending and do not treat blank as shared system baseline or transfer as a completed assessment."],
      ["Note (not a field) — Priority / score scope", `This AGPI triage applies only to UC-ID ${p.ucId || "(pending)"} and the stated use outcome; reassess materially different uses separately. The priority sets urgency only; the route follows the governing tier. Not approval.`],
      ["Note (not a field) — Service area / Service owner", [p.serviceArea, p.serviceOwner].filter(Boolean).join(" / ")],
    ];
    return fieldValueCsv(rows, "AGPI Triage");
  }

  function mandatoryFloorLabel(results) {
    // AIG-ASS-02 "Mandatory Risk Floor": the trigger floor itself, not the effective tier.
    return results.mandatoryFloorTier || "Low";
  }

  function riskPrefillCsv(calculation) {
    const p = calculation.profile;
    const r = calculation.results;
    const triggerSet = new Set(r.triggerIds);
    const a = latestAgentic || null;
    const isAgent = r.actionCapable;
    // Web-triage pre-control tier explanation for Triage Import B43.
    const preControlReason = [
      r.inherentTierName !== r.residualTierName ? "inherent risk tier (web triage applies no control-based reduction)" : "",
      r.preControlTierName !== r.inherentTierName && r.mandatoryFloorTier === r.preControlTierName ? `mandatory trigger floor (${r.mandatoryFloorTier})` : "",
    ].filter(Boolean).join(" + ");

    // Rows 1–59 match AIG-ASS-02 Triage Import B5:B63 exactly, in order, so the Value
    // column can be pasted as one block. Notes after row 59 are context only.
    const rows = [
      ["AIR-ID", p.registerId],
      ["System / Model Name", p.systemName],
      ["Purpose / Description", p.usePurpose || p.purpose],
      ["Service Area", p.serviceArea],
      ["Service Owner", p.serviceOwner],
      ["Supplier / Developer", p.supplierDeveloper],
      ["Source", p.source],
      ["AI Capability", p.capability],
      ["Automated Action Authority", p.actionAuthority],
      ["Systems / Tools Accessed", p.systemsAccessed],
      ["Lifecycle Stage", p.lifecycle],
      ["Personal / Special Category Data", p.dataType],
      ["Triage Date", ""],
      ["AGPI Score (0-100)", r.agpiScore],
      ["Raw AGPI Priority", r.rawAgpiPriority || r.priority.label],
      ["Authorised Governance Priority Uplift", ""],
      ["Effective Governance Priority", r.effectiveGovernancePriority || r.priority.label],
      ["Resident Impact", calculation.impactScores.residentImpact],
      ["Legal and Regulatory Impact", calculation.impactScores.legalImpact],
      ["Reputational Impact", calculation.impactScores.reputationImpact],
      ["Operational Impact", calculation.impactScores.operationalImpact],
      ["Financial Impact", calculation.impactScores.financialImpact],
      ["Likelihood", r.risk.likelihood],
      ["Control Effectiveness", r.risk.control],
      ["Impact Score", r.risk.impact],
      ["Inherent Risk Score", r.risk.inherent],
      ["Inherent Risk Tier", r.inherentTierName],
      ["Residual Risk Score", r.risk.residual],
      ["Residual Risk Tier", r.residualTierName],
      ["Trigger — Special Category Data", yesNo(triggerSet.has("specialData"))],
      ["Trigger — Vulnerable Residents", yesNo(triggerSet.has("vulnerable"))],
      ["Trigger — Housing/Care/Homelessness", yesNo(triggerSet.has("housingCare"))],
      ["Trigger — Novel Deployment", yesNo(triggerSet.has("novel"))],
      ["Trigger — Statutory Decisions", yesNo(triggerSet.has("statutory"))],
      ["Trigger — Material Change", yesNo(triggerSet.has("materialChange"))],
      ["Trigger — Agentic Autonomous Action", r.perActionReview === "Unsure" ? "Unsure" : yesNo(triggerSet.has("agentic"))],
      ["Mandatory Risk Floor", mandatoryFloorLabel(r)],
      ["Effective Governance Tier", r.preControlTierName],
      ["Tier Floor Reason", preControlReason],
      ["Assurance Intensity", r.assuranceIntensity],
      ["Governance Status", r.governanceStatus],
      ["Is Agent", yesNo(isAgent)],
      ["Agentic Consequence", a ? a.consequence : ""],
      ["Agentic Autonomy", a ? a.autonomy : ""],
      ["Agentic Authority", a ? a.authority : ""],
      ["Agentic Reach", a ? a.reach : ""],
      ["Agentic Controllability", a ? a.controllability : ""],
      ["Autonomy Level", a ? a.autonomyLabel : ""],
      ["Agency Tier", a ? a.tierLabel : ""],
      ["Agentic Pathway", a ? a.pathway : ""],
      ["Kill-switch Demonstrated", a ? yesNo(a.killSwitch) : ""],
      ["Rollback Capability", a ? yesNo(a.rollback) : ""],
      ["Boundaries Tested", a ? yesNo(a.boundariesTested) : ""],
      ["Agentic Flags", a ? (a.flags.length ? a.flags.join("; ") : "None") : ""],
      ["Agentic Escalations", a ? (a.escalations.length ? a.escalations.join("; ") : "None") : ""],
      ["Agentic Deployment Control", a ? a.deploymentControl : ""],
      ["Agent Record (ASBOM) Ref", a ? (a.asbomRef || "") : ""],
      ["UC-ID (blank only for explicit system baseline)", p.ucId],
      ["Triage / assessment scope", "UC-ID specific"],
      // v3.9.2 (T-04): the control-evidence state, in the exact AIG-ASS-02 Risk
      // Assessment E37:E40 fields that C41/C43 read, so the pasted pre-fill recomputes
      // the governing tier this triage shows.
      ...logic.controlEvidenceFields(r).map(([field, value]) => [field, value, "Risk Assessment"]),
      ["Note (not imported) — Governing tier from this triage (AIG-ASS-02 C43 recalculates it: evidenced-control reduction, trigger, impact and agentic floors)", (r.agencyPending ? "at least " : "") + r.effectiveTierName + (r.floorReason ? ` (${r.floorReason})` : "")],
      ["Note (not imported) — Paste targets", "Paste the Value column of the first 59 rows into Triage Import B5:B63. Paste the next four rows (Controls evidenced?, Control evidence ref, Independent check?, Verification ref) into Risk Assessment E37:E40; C43 then applies the same evidenced-control reduction as this triage."],
      ["Note (not imported) — UC-ID entry status (not verification)", p.ucIdStatus],
      ["Note (not imported) — UC-ID interpretation", p.ucId ? "UC-ID-specific use triage." : "UC-ID-specific provisional use triage; ID pending, not a selected shared system baseline."],
      ["Note (not imported) — Use-case outcome / scope key", p.usePurpose || p.purpose],
      ["Note (not imported) — Risk assessment scope", `This risk triage applies only to UC-ID ${p.ucId || "(pending)"} and the stated use outcome; reassess materially different uses separately. Not approval.`]
    ];
    return fieldValueCsv(rows, "Triage Import");
  }

  // One row per AIG-AGT-04 "Agent Record" column (row 4, A to BK), in sheet order,
  // excluding the formula-owned Record QA column. Notes after them are context only.
  function agentRecordPrefillCsv(calculation) {
    if (!latestAgentic) return "";
    const p = calculation.profile;
    const r = calculation.results;
    const a = latestAgentic;
    const exact = "Exact AIG-AGT-04 Agent Record column (row 4) — owner verification required";
    const rows = [
      ["AIR-ID", p.registerId],
      ["Agent Name", p.systemName],
      ["Approved Purpose (mandate)", ""],
      ["Prohibited Purposes", ""],
      ["Decisions never delegated", ""],
      ["Max acceptable consequence", ""],
      ["Accountable Executive", ""],
      ["Business Owner", ""],
      ["Operator / Platform", ""],
      ["Environment (stage)", ""],
      ["Jurisdiction", ""],
      ["Assessed autonomy level (triage; not permission)", a.autonomyLabel],
      ["Agency Tier", a.tierLabel],
      ["AGPI Priority (from AIG-INV-04)", ""],
      ["Persistence?", ""],
      ["Memory Type", ""],
      ["Can delegate?", ""],
      ["Financial Authority (limit)", ""],
      ["Permission Scope (summary)", ""],
      ["Identity / credential provenance", ""],
      ["Suspension mechanism", ""],
      ["Termination mechanism", ""],
      ["Kill-switch tested?", ""],
      ["Rollback capability?", ""],
      ["Evaluation / red-team status", ""],
      ["Date authorised", ""],
      ["Authority expiry / next reauthorisation", ""],
      ["Governance Approval Status", ""],
      ["Operational Status", ""],
      ["Notes", "Proposed purpose from intake: " + (p.purpose || "") +
        "; Triage autonomy/tier require formal confirmation. Containment claims and multipliers require evidence."],
      ["Memory Read Scope", ""],
      ["Memory Write Scope", ""],
      ["Memory Retention / Deletion", ""],
      ["Memory Provenance", ""],
      ["Memory Isolation / Poisoning Control", ""],
      ["Model Routing / Fallback", ""],
      ["Frontier Model?", ""],
      ["Max Delegation Depth", ""],
      ["Recursion Allowed?", ""],
      ["Max Concurrent Sub-agents", ""],
      ["Runtime Control State", ""],
      ["Containment Test Date", ""],
      ["Time to Containment", ""],
      ["Action Record Available?", ""],
      ["Human Oversight Mode", ""],
      ["Reversibility Class", ""],
      ["Compensating Action", ""],
      ["Budget / Transaction Ceiling", ""],
      ["Agent Creation Authority", ""],
      ["Self-Modification Authority", ""],
      ["AG-ID", ""],
      ["UC-ID(s) within this authority envelope (reference only)", p.ucId],
      ["Use-specific delegated decision / gate reference(s)", ""],
      ["ASBOM record version", ""],
      ["ASBOM version effective date", ""],
      ["Exposure", ""],
      ["Agency profile ref (Agency Profile sheet — the record)", ""],
      ["Mandatory tier floor applied (trigger)", r.triggerIds.length ? `${r.mandatoryFloorTier} (${logic.triggerTextFor(r.triggerIds).join("; ")})` : "None triggered"],
      ["Governing pathway (higher of risk-tier pathway and agency-tier minimum)", `${r.effectiveTierName} (risk-tier pathway ${r.riskTierName}${r.impactFloorApplied ? ", impact floor Medium" : ""}; ${a.tierLabel.split(" ")[0]} agency-tier minimum ${r.agencyMinTier || "none"})`],
      ["Oversight mode rationale", ""],
      ["Permitted autonomy level (granted at Gate 6)", ""],
      ["Permitted autonomy decision ref (AIG-DEC-03)", ""],
      ["Note (not a column) — Exact use purpose / outcome", p.usePurpose || p.purpose],
      ["Note (not a column) — Use-specific triage AGPI priority (not the AIG-INV-04 system value)", r.priority.label],
      ["Note (not a column) — Agency tier set by (AIG-AGT-02/AIG-AGT-03 Tables A and B)", (a.setBy || []).join(", ")],
    ];
    return logic.toCsv(
      ["Target artefact", "Field label / prompt", "Field reference type", "Triage draft value", "Value status", "Review, evidence or authority still required"],
      rows.map(([field, value]) => [
        "AIG-AGT-04 Agent Record / ASBOM",
        field,
        field.startsWith("Note (not a column)") ? "Context note — not an Agent Record column" : exact,
        value == null ? "" : value,
        "Proposal only — not a mandate, approval or operational state",
        field === "AGPI Priority (from AIG-INV-04)"
          ? "Leave blank here: copy the current AIG-INV-04 value; this UC-specific triage priority is not the system summary."
          : field.startsWith("Permitted autonomy")
            ? "Granted only at Gate 6 by the go-live decision-maker and recorded in AIG-DEC-03; never inferred from the assessed level."
            : "Review the current ASBOM contract and evidence; authorised owners determine mandate, permissions, delegations and status.",
      ]),
    );
  }

  function agenticGovernanceHandoffCsv(calculation) {
    if (!latestAgentic) return "";
    const p = calculation.profile;
    const r = calculation.results;
    const a = latestAgentic;
    const rows = [];
    const add = (artefact, field, value, treatment) => {
      rows.push([artefact, field, value == null ? "" : value, treatment]);
    };
    add("Triage scope — applies to following proposed prompts only", "UC-ID", p.ucId || "", p.ucIdStatus || "Pending — no UC-ID entered; no identifier is generated");
    add("Triage scope — applies to following proposed prompts only", "Exact use purpose / outcome", p.usePurpose || p.purpose, "Operator-entered scope; proposal only, not a mandate or approval");
    const risk = "AIG-ASS-02 / Triage Import";
    add(risk, "AIR-ID", p.registerId, "Triage value; assessor confirms");
    add(risk, "UC-ID (blank only for explicit system baseline)", p.ucId || "", `Scope only; ${p.ucIdStatus || "pending"}; verify independently. Exact outcome: ${p.usePurpose || p.purpose}. Never authority.`);
    add(risk, "Effective Governance Tier", r.preControlTierName, `Web-triage pre-control tier as defined in Triage Import B42; governing tier from this triage: ${(r.agencyPending ? "at least " : "") + r.effectiveTierName}. The assessor confirms in AIG-ASS-02 C43.`);
    add(risk, "Is Agent", yesNo(r.actionCapable), "\u201cCan it act?\u201d screen; Unsure is treated as Yes until confirmed");
    add(risk, "Trigger — Agentic Autonomous Action", r.perActionReview === "Unsure" ? "Unsure" : yesNo(r.triggerIds.includes("agentic")), "No per-action human review (Unsure = No) sets the §4.4.6 Critical floor");
    add(risk, "Agency Tier", a.tierLabel, "Triage value; assessor confirms (AIG-ASS-02 Step 5)");
    add(risk, "Agentic Pathway", a.pathway, "Triage value; AIG-ASS-02 row 82 reads the agentic floor from it");
    add(risk, "Assurance Intensity", r.assuranceIntensity, "Triage value; assessor confirms");
    add(risk, "Kill-switch Demonstrated", yesNo(a.killSwitch), "Self-reported at triage; verify evidence");
    add(risk, "Rollback Capability", yesNo(a.rollback), "Self-reported at triage; verify evidence");
    add(risk, "Boundaries Tested", yesNo(a.boundariesTested), "Self-reported at triage; verify evidence");

    const triage = "AIG-AGT-03 / Agentic Triage assessment";
    add(triage, "AIR-ID", p.registerId, "Assessment identity");
    add(triage, "UC-ID / use scope", p.ucId || "", `Scope only; ${p.ucIdStatus || "pending"}; verify independently. Exact outcome: ${p.usePurpose || p.purpose}. Never authority.`);
    logic.AGENCY_DIMENSIONS.forEach((d) => {
      const note = a.dimensionNotes[d.id] || {};
      add(triage, d.label + " score (0-5)", a[d.id], "Provisional; confirm against AIG-AGT-02");
      add(triage, d.label + " rationale", note.rationale || "", "Blank means assessment explanation is outstanding");
      add(triage, d.label + " evidence ref", note.evidenceRef || "", "Blank means evidence reference is outstanding");
    });
    add(triage, "Agency multipliers", a.multipliers.join("; "), "Separate flags; not additional scored dimensions");
    add(triage, "Worst plausible action chain", a.worstChain, "Assessor to validate");
    add(triage, "Assessed or requested autonomy level", a.autonomyLabel, "The permitted autonomy level is granted at Gate 6 (go-live) and recorded in AIG-DEC-03 and AIG-AGT-04");
    add(triage, "Agency tier", a.tierLabel, "Highest floor in Tables A and B; confirm");
    add(triage, "Floors triggered (Tables A and B)", (a.floors || []).join("; "), "Every floor triggered; the highest wins");
    add(triage, "Rule(s) that set the tier", (a.setBy || []).join("; "), "Record on the Agent Record and in the governance case");
    add(triage, "Tier escalation reasons", a.escalations.join("; "), "Review mandatory floors and uncertainty");
    add(triage, "Agency-tier pathway", a.pathway, "Not an approval or runtime control");
    add(triage, "Agency-tier minimum pathway", r.agencyMinTier || "None", "AIG-DEC-01 Agentic pathway; the higher of this and the risk-tier pathway governs");
    add(triage, "Governing tier", r.effectiveTierName, "Highest of risk tier, trigger floors, impact floor and agency-tier minimum");
    add(triage, "Production readiness (checked at Gate 6)", "Required runtime controls Implemented and Evidenced or effective, time-bounded compensating control accepted under Council delegation; agentic control checkpoints evidenced at Gate 2 and re-confirmed at Gate 6", "No production approval from triage");

    const security = "AIG-ASS-11 / AI Security Review Checklist";
    add(security, "AIR-ID", p.registerId, "Action-capable systems: applies at every base risk tier; review depth is proportionate");
    ["ASI01 Agent Goal Hijack","ASI02 Tool Misuse","ASI03 Identity and Privilege Abuse","ASI04 Agentic Supply Chain Vulnerabilities","ASI05 Unexpected Code Execution","ASI06 Memory and Context Poisoning","ASI07 Insecure Inter-Agent Communication","ASI08 Cascading Failures","ASI09 Human-Agent Trust Exploitation","ASI10 Rogue Agents"].forEach(risk => add(security, risk, "", "Record applicability/rationale, owner, required and actual state, test result and evidence; blank is outstanding"));

    const record = "AIG-AGT-04 / Agent Record";
    add(record, "AIR-ID", p.registerId, "Carry forward");
    add(record, "Agent Name", p.systemName, "Proposed; confirm");
    add(record, "Approved Purpose (mandate)", "", "Only fill after formal authorisation");
    add(record, "Assessed autonomy level (triage; not permission)", a.autonomyLabel, "Triage proposal; the permitted level is granted at Gate 6");
    add(record, "Agency Tier", a.tierLabel, "Triage proposal; confirm");
    add(record, "AGPI Priority (from AIG-INV-04)", "", "Leave blank; copy the current AIG-INV-04 value. This UC-specific triage is not the one-row-per-AIR-ID system summary.");
    add(record, "Kill-switch tested?", "", "Test evidence required");
    add(record, "Rollback capability?", "", "Test evidence required");
    add(record, "Notes", "Proposed purpose from intake: " + p.purpose, "Context only; no approved mandate");
    add(record, "AG-ID", "", "Stable per-agent key assigned under the AIG-AGT-04 rules; this tool never issues one");
    add(record, "UC-ID(s) within this authority envelope (reference only)", p.ucId || "", "Reference only; not an authority grant");
    add(record, "Governing pathway (higher of risk-tier pathway and agency-tier minimum)", r.effectiveTierName, "Triage value; confirm");
    add(record, "Permitted autonomy level (granted at Gate 6)", "", "Granted only at Gate 6 by the go-live decision-maker; never inferred from the assessed level");
    add(record, "Note (not a column) — Use-specific triage AGPI priority (not system summary)", r.priority.label, "Use-specific triage prompt only; do not write into the AIG-INV-04 system summary.");
    add("AIG-AGT-04 / Runtime Controls", "Control ID", "ASI01–ASI10 where applicable", "One row per applicable control; set required/actual state, test, owner and evidence; no state is presumed");

    const vector = "AIG-AGT-04 / Capability Vector";
    add(vector, "AIR-ID", p.registerId, "Carry forward");
    add(vector, "AG-ID", "", "Stable per-agent key; this tool never issues one");
    logic.CAPABILITY_VECTOR.forEach((capability) => add(
      vector, capability, a.capabilities.includes(capability) ? "Yes" : "",
      "Confirm No / Yes / Scoped; blank is unknown"
    ));
    [
      ["Credential access", "Multiplier: Credential access"],
      ["Self-modification", "Multiplier: Self-modification"],
      ["Tool discovery", "Multiplier: Tool discovery"],
      ["Goal adaptation", "Multiplier: Goal adaptation"],
      ["External communication", "Multiplier: External comms"],
    ].forEach(([name, field]) => add(
      vector, field, a.multipliers.includes(name) ? "Yes" : "",
      "Confirm scope; blank is unknown"
    ));
    add(vector, "Notes", "Triage seed; verify all capabilities and multipliers.", "Context");

    const authority = "AIG-AGT-04 / Authority & Delegations (AIG-AGT-05 Authority Graph derives from it)";
    add(authority, "AIR-ID (agent)", p.registerId, "Identity pointer only; no authority edge created");
    add(authority, "AG-ID (agent)", "", "Stable per-agent key; this tool never issues one");
    add(authority, "Authority delegated", "", "Map only an existing authorised edge from AIG-AGT-04; no authority granted here");
    add(authority, "Constraints / ceiling", "", "Verify against ASBOM and formal delegation; do not infer from triage multipliers");
    add(authority, "Revocable how", "", "Prompt only; evidence revocation before any authority is granted");

    const monitoring = "AIG-OPS-02 / Monitoring Log";
    add(monitoring, "AIR-ID", p.registerId, "Identity seed only; no monitoring result created");
    add(monitoring, "AI System / Service", p.systemName, "Identity seed only");
    add(monitoring, "Monitoring Owner", "", "Assign and confirm at deployment");
    add(monitoring, "Metric Category", "Security", "Controlled value; assessor confirms the category for each applicable metric (for example Human Oversight or Error / Failure)");
    add(monitoring, "Approved Threshold / Tolerance", "", "Set and approve per metric before live use; blank is outstanding");
    add(monitoring, "Evidence Location", "", "Cite AIG-AGT-06 action IDs and verified logs when operated; no test is presumed");
    ["Denied tool calls","Authority changes","Memory writes","Loops and delegation","External destinations","Human overrides","Time to containment"].forEach(metric => add(monitoring, "Metric / Indicator", metric, "Set Approved Threshold / Tolerance, Monitoring Owner, review window and evidence before live use where applicable"));
    add(monitoring, "UC-ID (blank only for an explicitly shared system measure)", p.ucId || "", "Scope key; verify");
    add(monitoring, "Measure scope (UC-ID specific / Shared system baseline)", "UC-ID specific", "Controlled value");
    add(monitoring, "Risk tier (UC-ID, AIG-ASS-02)", r.effectiveTierName, "Triage governing tier; replace with the assessor-confirmed AIG-ASS-02 tier");
    add(monitoring, "Review type (§6.4.4: operational / performance / formal)", "Operational monitoring", `Controlled value for these runtime metrics; performance and formal reviews are separate rows. ${r.monitoringMinimum}`);
    add(monitoring, "Agentic cadence raise applied? (action-capable uses)", r.actionCapable ? "Action-capable: raise not yet set" : "Not action-capable", "Controlled value; the Monitoring and Review Plan sets the raise (its size is a Council decision) and the row then records \u201cRaised per Monitoring and Review Plan\u201d.");

    const actions = "AIG-AGT-06 / Agentic Action / Decision Record (controlled fields)";
    add(actions, "AIR-ID", p.registerId, "Identity pointer only; no action record or decision created");
    add(actions, "AG-ID", "", "Stable per-agent key; generated records carry it");
    add(actions, "UC-ID", p.ucId || "", "Required for each consequential action; scope only");
    add(actions, "Action ID", "", "Generated for each consequential action when operated; no action authority is granted");
    add(actions, "Approval/override", "", "Recorded at runtime; verify human review and override state");
    add(actions, "Outcome", "", "Recorded at runtime");
    add(actions, "Evidence reference", "", "Recorded at runtime; verify source evidence");

    return logic.toCsv(
      ["Target Artefact", "Field", "Value", "Treatment / Authority Boundary"],
      rows,
    );
  }

  function agenticGovernanceExport() {
    if (!validateForExport()) return;
    const calculation = update();
    if (!latestAgentic) {
      byId("validationMessage").textContent =
        "Run Assess agency before downloading the Agentic governance handoff.";
      byId("agenticStep").scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    download(
      `${safeSlug(calculation.profile.systemName)}-agentic-governance-handoff.csv`,
      agenticGovernanceHandoffCsv(calculation),
      "text/csv;charset=utf-8",
    );
  }

  function gateReadyPrefillCsv(calculation) {
    return logic.buildDecisionReadyHandoff(calculation);
  }

  function gateReadyExport() {
    if (!validateForExport()) return;
    const calculation = update();
    download(
      safeSlug(calculation.profile.systemName) + "-decision-ready-paper-review-handoff.csv",
      gateReadyPrefillCsv(calculation),
      "text/csv;charset=utf-8"
    );
  }

  function capabilityVectorPrefillCsv(calculation) {
    if (!latestAgentic) return "";
    const a = latestAgentic;
    const selected = new Set(a.capabilities || []);
    const mult = new Set(a.multipliers || []);
    const headers = [
      "AIR-ID","AG-ID","Read","Write","Execute","Communicate","Purchase","Delegate",
      "Persuade","Code","Discover","Persist","Replicate","Learn","Escalate",
      "Multiplier: Credential access","Multiplier: Self-modification",
      "Multiplier: Tool discovery","Multiplier: Goal adaptation",
      "Multiplier: External comms","Notes"
    ];
    const yesOrBlank = (name) => selected.has(name) ? "Yes" : "";
    const row = [
      calculation.profile.registerId,
      "",
      yesOrBlank("Read"),
      yesOrBlank("Write"),
      yesOrBlank("Execute"),
      yesOrBlank("Communicate"),
      yesOrBlank("Purchase"),
      yesOrBlank("Delegate"),
      yesOrBlank("Persuade"),
      yesOrBlank("Code"),
      yesOrBlank("Discover"),
      yesOrBlank("Persist"),
      yesOrBlank("Replicate"),
      yesOrBlank("Learn"),
      yesOrBlank("Escalate"),
      mult.has("Credential access") ? "Yes" : "",
      mult.has("Self-modification") ? "Yes" : "",
      mult.has("Tool discovery") ? "Yes" : "",
      mult.has("Goal adaptation") ? "Yes" : "",
      mult.has("External communication") ? "Yes" : "",
      "Triage seed only. Verify selected capabilities and multipliers; unselected fields remain blank pending No / Yes / Scoped confirmation."
    ];
    // Columns match AIG-AGT-04 "Capability Vector" row 4 (A to U) exactly, so the row
    // can be pasted; the guidance column after the blank spacer is not pasted.
    return logic.toCsv(
      [...headers, "", "Guidance only, do not paste: field/value status"],
      [[
        ...row,
        "",
        "AIG-AGT-04 Capability Vector triage handoff only — AG-ID is left for the Agent Record owner; unselected capabilities remain unknown, not No (confirm No / Yes / Scoped); verify against the current controlled ASBOM.",
      ]],
    );
  }

  function capabilityVectorExport() {
    if (!validateForExport()) return;
    const calculation = update();
    if (!latestAgentic) {
      byId("validationMessage").textContent =
        "Run Assess agency before downloading the Capability Vector review handoff.";
      byId("agenticStep").scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    download(
      safeSlug(calculation.profile.systemName) + "-capability-vector-review-handoff.csv",
      capabilityVectorPrefillCsv(calculation),
      "text/csv;charset=utf-8"
    );
  }

  function canonicalExport() {
    if (!validateForExport()) return;
    const calculation = update();
    download(
      `${safeSlug(calculation.profile.systemName)}-canonical-triage-record.json`,
      JSON.stringify(buildCanonicalRecord(calculation), null, 2) + "\n",
      "application/json;charset=utf-8",
    );
  }

  function agpiExport() {
    if (!validateForExport()) return;
    const calculation = update();
    download(
      `${safeSlug(calculation.profile.systemName)}-agpi-prefill.csv`,
      agpiPrefillCsv(calculation),
      "text/csv;charset=utf-8",
    );
  }

  function riskExport() {
    if (!validateForExport()) return;
    const calculation = update();
    download(
      `${safeSlug(calculation.profile.systemName)}-risk-assessment-prefill.csv`,
      riskPrefillCsv(calculation),
      "text/csv;charset=utf-8",
    );
  }

  function agentExport() {
    if (!validateForExport()) return;
    const calculation = update();
    if (!latestAgentic) {
      byId("validationMessage").textContent =
        "Run Assess agency before downloading the Agent Record review handoff.";
      byId("agenticStep").scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    download(
      `${safeSlug(calculation.profile.systemName)}-agent-record-review-handoff.csv`,
      agentRecordPrefillCsv(calculation),
      "text/csv;charset=utf-8",
    );
  }

  function registerExport() {
    if (!validateForExport()) return;
    const calculation = update();
    const profile = {
      ...calculation.profile,
      dateFirstUsed: formatInputDate(calculation.profile.dateFirstUsed),
    };
    const handoff = logic.buildRegisterDraftHandoff(profile, calculation.results, latestAgentic);
    download(
      `${safeSlug(profile.systemName)}-AIG-INV-04-register-review-handoff.csv`,
      logic.toCsv(handoff.headers, handoff.rows),
      "text/csv;charset=utf-8",
    );
  }

  function capabilitiesMapExport() {
    if (!validateForExport()) return;
    const calculation = update();
    const handoff = logic.buildCapabilitiesMapHandoff(calculation.profile, calculation.results);
    download(
      `${safeSlug(calculation.profile.systemName)}-AIG-INV-05-capabilities-system-map-draft-handoff.csv`,
      logic.toCsv(handoff.headers, handoff.rows),
      "text/csv;charset=utf-8",
    );
  }

  function gateExport() {
    if (!validateForExport()) return;
    const calculation = update();
    download(
      `${safeSlug(calculation.profile.systemName)}-gate-log-plan-rows.csv`,
      logic.buildGatePlanCsv(calculation.profile, calculation.route, calculation.results),
      "text/csv;charset=utf-8",
    );
  }

  function handoffExport() {
    if (!validateForExport()) return;
    const calculation = update();
    const profile = {
      ...calculation.profile,
      dateFirstUsed: formatInputDate(calculation.profile.dateFirstUsed),
    };
    download(
      `${safeSlug(profile.systemName)}-artefact-handoff.csv`,
      logic.buildHandoffCsv(profile, calculation.results),
      "text/csv;charset=utf-8",
    );
  }

  function summaryExport() {
    if (!validateForExport()) return;
    const calculation = update();
    download(
      `${safeSlug(calculation.profile.systemName)}-triage-summary.txt`,
      buildSummary(calculation),
      "text/plain;charset=utf-8",
    );
  }

  async function copySummary() {
    if (!validateForExport()) return;
    const summary = buildSummary(update());
    const status = byId("copyStatus");
    try {
      await navigator.clipboard.writeText(summary);
      status.textContent = "Summary copied to the clipboard.";
    } catch (_error) {
      status.textContent =
        "The browser blocked clipboard access. Use Download full summary instead.";
    }
  }

  buildForumFields();
  buildDimensions();
  buildTriggers();
  buildImpacts();
  update();

  function updateProvisionalCue() {
    const completeInputs =
      enteredAgpiDimensions.size === logic.DIMENSIONS.length &&
      enteredImpactDimensions.size === logic.IMPACT_DIMENSIONS.length &&
      likelihoodEntered &&
      controlEntered;
    const reviewed = byId("triageReviewed").checked;
    const message = !completeInputs
      ? "Synthetic / incomplete example: untouched score fields still use built-in defaults. Complete and review every score and trigger. This is not current AIG-INV-04 assurance."
      : !reviewed
        ? "All score inputs have been entered, but this triage is not yet confirmed. Review the scores, action authority and triggers. This is not current AIG-INV-04 assurance."
        : "User-confirmed triage inputs. The calculated priority, risk tier and route remain provisional decision support, not current AIG-INV-04 assurance.";
    ["priorityProvisionalCue", "riskProvisionalCue", "provisionalCue"].forEach((id) => {
      const cue = byId(id);
      if (cue) {
        cue.textContent = message;
        cue.hidden = false;
      }
    });
  }
  function handleFormInput(event) {
    const target = event.target;
    if (latestAgentic && target && (
      profileFieldIds.includes(target.id) ||
      (byId("agenticStep").contains && byId("agenticStep").contains(target))
    )) invalidateAgency();
    if (target.matches && target.matches("[data-dimension]")) {
      enteredAgpiDimensions.add(target.dataset.dimension);
    }
    if (target.matches && target.matches("[data-impact]")) {
      enteredImpactDimensions.add(target.dataset.impact);
    }
    if (target.matches && target.matches("#likelihood")) likelihoodEntered = true;
    if (target.matches && target.matches("#control")) controlEntered = true;
    if (target.matches && target.matches(
      '[data-dimension], [data-impact], [data-trigger], #likelihood, #control, #controlEvidence, #controlEvidenceRef, #verificationRef, #governanceInvestigation, #situation, #fastTrack, #procurementRoute, #newInvestment, #systemApproval, #actionAuthority, #ucId, #ucIdStatus, #usePurpose'
    )) byId("triageReviewed").checked = false;
    update();
  }
  form.addEventListener("input", handleFormInput);
  form.addEventListener("change", handleFormInput);
  updateProvisionalCue();
  byId("downloadRegister").addEventListener("click", registerExport);
  byId("downloadCapabilitiesMap").addEventListener("click", capabilitiesMapExport);
  byId("downloadCanonical").addEventListener("click", canonicalExport);
  byId("downloadAgpi").addEventListener("click", agpiExport);
  byId("downloadRisk").addEventListener("click", riskExport);
  byId("downloadGateReady").addEventListener("click", gateReadyExport);
  byId("downloadGates").addEventListener("click", gateExport);
  byId("downloadHandoff").addEventListener("click", handoffExport);
  byId("downloadAgent").addEventListener("click", agentExport);
  byId("downloadCapabilities").addEventListener("click", capabilityVectorExport);
  byId("downloadAgenticGovernance").addEventListener("click", agenticGovernanceExport);
  byId("downloadSummary").addEventListener("click", summaryExport);
  byId("copySummary").addEventListener("click", copySummary);
  byId("printResult").addEventListener("click", () => window.print());

  // ---- Agentic triage UI ----
  function buildAgenticInputs() {
    const dimsHost = byId("agencyDims");
    if (dimsHost && !dimsHost.dataset.built) {
      logic.AGENCY_DIMENSIONS.forEach((d) => {
        const wrap = document.createElement("div"); wrap.className = "agency-dim";
        const lab = document.createElement("label"); lab.setAttribute("for", "ag_" + d.id); lab.textContent = d.label + " \u2014 " + d.hint;
        const sel = document.createElement("select"); sel.id = "ag_" + d.id;
        ["", "0", "1", "2", "3", "4", "5"].forEach((v) => { const o = document.createElement("option"); o.value = v; o.textContent = v === "" ? "\u2014" : v; sel.appendChild(o); });
        wrap.appendChild(lab); wrap.appendChild(sel);
        const support = document.createElement("div"); support.className = "agency-support";
        [["reason", "Rationale for " + d.label.toLowerCase() + " score"], ["evidence", "Evidence reference for " + d.label.toLowerCase()]].forEach(([type, title]) => {
          const field = document.createElement("label"); field.textContent = title;
          const input = document.createElement("input"); input.type = "text";
          input.id = "ag_" + type + "_" + d.id;
          input.placeholder = type === "reason" ? "Why this score applies" : "Evidence ID or source (if available)";
          field.setAttribute("for", input.id); field.appendChild(input); support.appendChild(field);
        });
        wrap.appendChild(support); dimsHost.appendChild(wrap);
      });
      dimsHost.dataset.built = "1";
    }
    const mk = (host, list, cls) => {
      if (host && !host.dataset.built) {
        list.forEach((m) => { const l = document.createElement("label"); l.className = "agency-chk"; const c = document.createElement("input"); c.type = "checkbox"; c.value = m; c.className = cls; l.appendChild(c); l.appendChild(document.createTextNode(" " + m)); host.appendChild(l); });
        host.dataset.built = "1";
      }
    };
    mk(byId("agencyMult"), logic.AGENCY_MULTIPLIERS, "ag-mult");
    mk(byId("agencyCap"), logic.CAPABILITY_VECTOR, "ag-cap");
  }
  function readAgentic() {
    const dims = {}, dimensionNotes = {};
    logic.AGENCY_DIMENSIONS.forEach((d) => {
      const el = byId("ag_" + d.id);
      dims[d.id] = el && el.value !== "" ? Number(el.value) : 0;
      dimensionNotes[d.id] = {
        rationale: byId("ag_reason_" + d.id).value.trim(),
        evidenceRef: byId("ag_evidence_" + d.id).value.trim(),
      };
    });
    return {
      dimensions: dims,
      dimensionNotes,
      multipliers: Array.from(document.querySelectorAll(".ag-mult:checked")).map((c) => c.value),
      capabilities: Array.from(document.querySelectorAll(".ag-cap:checked")).map((c) => c.value),
      killSwitch: byId("agKill").checked, rollback: byId("agRollback").checked, boundariesTested: byId("agBoundaries").checked,
      otherD1: !!(byId("agD1") && byId("agD1").checked),
      worstChain: byId("agWorstChain").value, asbomRef: byId("agAsbom").value.trim(),
    };
  }
  function esc(t) { const d = document.createElement("div"); d.textContent = t; return d.innerHTML; }
  function renderAgentic() {
    const missing = logic.AGENCY_DIMENSIONS.map((d) => byId("ag_" + d.id))
      .find((el) => !el || el.value === "");
    if (missing) {
      latestAgentic = null;
      latestAgenticContextKey = null;
      syncAgencyExportAvailability();
      byId("agencyResult").hidden = true;
      byId("validationMessage").textContent =
        "Score all five agency dimensions before assessing agency.";
      missing.focus();
      return;
    }
    const actionAuthority = byId("actionAuthority").value;
    const autonomy = Number(byId("ag_autonomy").value);
    // v3.9.2 (T-03): autonomy 0 with every action human-approved is valid (T0);
    // autonomy 2 or more conflicts with per-action human review (AIG-ASS-02 row 82).
    const range = logic.autonomyRangeFor(actionAuthority);
    if (autonomy < range.min || autonomy > range.max) {
      latestAgentic = null;
      latestAgenticContextKey = null;
      syncAgencyExportAvailability();
      byId("agencyResult").hidden = true;
      byId("validationMessage").textContent =
        "The autonomy score conflicts with the automated action authority selected above. Review both answers before assessing agency.";
      byId("ag_autonomy").focus();
      return;
    }
    byId("validationMessage").textContent = "";
    latestAgentic = logic.computeAgentic(readAgentic());
    latestAgenticContextKey = logic.agenticContextKey(getProfile(), readAgentic());
    syncAgencyExportAvailability();
    const r = latestAgentic; const host = byId("agencyResult");
    let html = '<p class="ag-tier">' + esc(r.tierLabel) + "</p>";
    html += "<p><strong>Assessed autonomy level:</strong> " + esc(r.autonomyLabel) + " (the permitted level is granted at Gate 6)</p>";
    html += "<p><strong>Tier set by:</strong> " + esc(r.setBy.length ? r.setBy.join(", ") : "no floor above T0") + " (AIG-AGT-02/AIG-AGT-03 Tables A and B)</p>";
    html += "<p><strong>Agency-tier pathway:</strong> " + esc(r.pathway) + "</p>";
    const governing = calculateAll().results;
    html += "<p><strong>Governing tier:</strong> " + esc((governing.agencyMinTier ? "agency minimum " + governing.agencyMinTier + " · " : "no agency minimum · ") + "risk tier " + governing.riskTierName + " → governing " + governing.effectiveTierName) + "</p>";
    if (r.escalations.length) html += "<p><strong>Escalation:</strong> " + esc(r.escalations.join("; ")) + "</p>";
    if (r.flags.length) html += '<p class="ag-flag"><strong>Flags:</strong> ' + esc(r.flags.join("; ")) + "</p>";
    html += "<p><strong>Deployment control:</strong> " + esc(r.deploymentControl) + "</p>";
    html += '<p class="muted">Draft handoff only: the triage suggests an agent classification and agency tier. AIG-AGT-04 owns permissions and delegations; verify the current authorised Agent Record and never infer authority from this result.</p>';
    host.innerHTML = html; host.hidden = false;
    update();
  }
  buildAgenticInputs();
  syncAgencyExportAvailability();
  const invalidateAgency = () => {
    if (!latestAgentic) return;
    latestAgentic = null;
    latestAgenticContextKey = null;
    syncAgencyExportAvailability();
    byId("agencyResult").hidden = true;
    byId("validationMessage").textContent =
      "System profile or agency inputs changed. Run Assess agency again before exporting agentic records.";
  };
  byId("agenticStep").addEventListener("change", invalidateAgency);
  byId("actionAuthority").addEventListener("change", invalidateAgency);
  const assessBtn = byId("assessAgency");
  if (assessBtn) assessBtn.addEventListener("click", renderAgentic);
})();
