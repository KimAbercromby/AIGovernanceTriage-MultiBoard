(function () {
  "use strict";

  const logic = window.TriageLogic;
  const byId = (id) => document.getElementById(id);
  const form = byId("triageForm");
  let latestAgentic = null;
  const enteredAgpiDimensions = new Set();
  const enteredImpactDimensions = new Set();
  let likelihoodEntered = false;
  let controlEntered = false;

  if (!logic || !form) {
    throw new Error("The calculator could not initialise.");
  }

  const profileFieldIds = [
    "registerId",
    "systemName",
    "purpose",
    "serviceArea",
    "serviceOwner",
    "supplierDeveloper",
    "source",
    "capability",
    "actionAuthority",
    "systemsAccessed",
    "lifecycle",
    "dataType",
    "procurementRequired",
    "affectsIndividuals",
    "publicFacing",
    "dateFirstUsed",
  ];

  const forumLabels = {
    strategic: "Strategic prioritisation forum",
    technical: "Technical design authority",
    assurance: "AI assurance authority",
    digital: "Digital portfolio authority",
    commercial: "Commercial authority",
    release: "Deployment / release authority",
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

  function getTriggerIds() {
    const agenticTrigger = form.querySelector('[data-trigger="agentic"]');
    const authorityEl = byId("actionAuthority");
    const actionAuthority = authorityEl ? authorityEl.value : "";
    const autonomousWithoutPerActionReview =
      actionAuthority === "Acts within defined bounds — monitored" ||
      actionAuthority === "Fully autonomous";

    if (agenticTrigger) {
      if (autonomousWithoutPerActionReview) {
        if (!agenticTrigger.checked) agenticTrigger.dataset.autoChecked = "true";
        agenticTrigger.checked = true;
        agenticTrigger.disabled = true;
        agenticTrigger.title =
          "Automatically selected because the system can execute actions without human review of each individual action.";
      } else {
        agenticTrigger.disabled = false;
        agenticTrigger.removeAttribute("title");
        if (agenticTrigger.dataset.autoChecked === "true") {
          agenticTrigger.checked = false;
          delete agenticTrigger.dataset.autoChecked;
        }
      }
    }

    return Array.from(form.querySelectorAll("[data-trigger]:checked")).map(
      (input) => input.dataset.trigger,
    );
  }

  function calculateAll() {
    const profile = getProfile();
    const forums = getForums();
    const agpiScores = getAgpiScores();
    const impactScores = getImpactScores();
    const triggerIds = getTriggerIds();
    const agpiScore = logic.calculateAgpi(agpiScores);
    const priority = logic.priorityFor(agpiScore);
    const risk = logic.calculateRisk(
      impactScores,
      byId("likelihood").value,
      byId("control").value,
    );
    // --- Governance-tier safeguards (QA priorities 1–3) --------------------
    // Residual math is unchanged. The governance tier is now explicit:
    // effective tier = highest of inherent tier, residual tier, and any
    // mandatory governance floor. This prevents strong controls from making
    // a severe inherent risk appear Low/Medium for governance routing.
    const TIER_ORDER = ["Low", "Medium", "High", "Critical"];
    const tierNameForScore = (s) =>
      s <= 5 ? "Low" : s <= 10 ? "Medium" : s <= 15 ? "High" : "Critical";
    const residualTierName = risk.tier.name;
    const inherentTierName = tierNameForScore(risk.inherent);
    const specialCategoryData =
      profile.dataType === "Special category data";
    const mandatoryFloorApplies = triggerIds.length > 0 || specialCategoryData;
    // §4.4.6 minimum uplift: any trigger floors to at least High; statutory
    // decisions or unreviewed agentic action floor to Critical.
    const criticalTrigger =
      triggerIds.includes("statutory") || triggerIds.includes("agentic");
    const mandatoryFloorTier = criticalTrigger
      ? "Critical"
      : mandatoryFloorApplies
        ? "High"
        : "Low";
    const effectiveTierName = [
      inherentTierName,
      residualTierName,
      mandatoryFloorTier,
    ].sort((a, b) => TIER_ORDER.indexOf(b) - TIER_ORDER.indexOf(a))[0];
    const inherentFloorApplied =
      TIER_ORDER.indexOf(inherentTierName) > TIER_ORDER.indexOf(residualTierName);
    const mandatoryFloorApplied =
      mandatoryFloorApplies &&
      TIER_ORDER.indexOf(effectiveTierName) === TIER_ORDER.indexOf(mandatoryFloorTier) &&
      TIER_ORDER.indexOf(residualTierName) < TIER_ORDER.indexOf(mandatoryFloorTier);
    const tierFloored = effectiveTierName !== residualTierName;
    const floorReasons = [];
    if (inherentFloorApplied) floorReasons.push("inherent risk tier");
    if (mandatoryFloorApplied) {
      floorReasons.push(
        triggerIds.length ? "mandatory trigger" : "special category data",
      );
    }
    const floorReason = floorReasons.join(" + ");
    // ---------------------------------------------------------------------
    const assuranceIntensity = logic.assuranceIntensity(
      agpiScore,
      effectiveTierName,
      triggerIds,
    );
    const results = {
      agpiScore,
      priority,
      rawAgpiPriority: priority.label,
      effectiveGovernancePriority: priority.label,
      risk,
      triggerIds,
      assuranceIntensity,
      residualTierName,
      inherentTierName,
      effectiveTierName,
      tierFloored,
      floorReason,
      governanceStatus: "Triage complete — formal governance approvals pending",
    };
    results.requirements = logic.assessmentRequirements(profile, results);
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
      appendTextElement(numberCell, "span", "gate-number", String(gate.sequence));
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
      if (gate.status.startsWith("Not required")) {
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

  function governanceRoute(profile, results) {
    const req = logic.assessmentRequirements(profile, results);
    const canAct =
      profile.capability === "Agentic AI" ||
      (profile.actionAuthority && profile.actionAuthority !== "None — outputs only") ||
      (results.triggerIds && results.triggerIds.includes("agentic"));

    const autonomousWithoutPerActionReview =
      profile.actionAuthority === "Acts within defined bounds — monitored" ||
      profile.actionAuthority === "Fully autonomous" ||
      (results.triggerIds && results.triggerIds.includes("agentic"));

    const anyAssessment =
      req.dpia.startsWith("Potential DPIA") ||
      req.eia.startsWith("Potential full assessment") ||
      req.humanRightsPotential ||
      req.atrs === "Yes" ||
      req.supplierDueDiligence;
    const label = results.priority.label || "";
    const lowPriority =
      label.indexOf("Priority 4") === 0 || label.indexOf("Priority 5") === 0;
    const lowTier = results.effectiveTierName === "Low";
    const noTriggers = results.triggerIds.length === 0;

    if (canAct) {
      return {
        key: "agentic",
        name: "Agentic governance pathway",
        why: autonomousWithoutPerActionReview
          ? "This system can execute actions without human review of each individual action. The mandatory agentic trigger therefore applies and the minimum effective risk tier is Critical. Complete the Agentic Triage, Agent Record (ASBOM), authority controls and the required assurance route."
          : "This system can act, but each individual action remains human-approved or no unreviewed autonomous action has been identified. Agentic governance controls and the Agent Record (ASBOM) still apply; a Critical risk floor is not imposed solely because the system is agentic."
      };
    }

    if (lowPriority && lowTier && noTriggers && !anyAssessment) {
      return {
        key: "light",
        name: "Light-touch governance pathway",
        why: "Low risk and low governance priority do not waive duties. Complete Equality Act s149, HRA s6 and data-protection/privacy screening, verify the Council-issued AIR-ID and current 05 state, and retain proportionate baseline documentation, named ownership, controls and review."
      };
    }

    return {
      key: "standard",
      name: "Non-agentic governance pathway",
      why: "This system does not exercise autonomous action authority. Its risk remains classified separately as Low, Medium, High or Critical, and the governance depth follows its effective risk tier, AGPI priority and any mandatory or specialist triggers."
    };
  }

  function update() {
    const calculation = calculateAll();
    const { profile, results, route, evidence } = calculation;

    const gRoute = governanceRoute(profile, results);
    const routeBanner = byId("routeBanner");
    if (routeBanner) {
      routeBanner.className = "route-banner route-" + gRoute.key;
      byId("routeBannerName").textContent = `Provisional · ${gRoute.name}`;
      byId("routeBannerWhy").textContent = gRoute.why;
    }

    byId("agpiScore").textContent = formatNumber(results.agpiScore);
    byId("agpiPriority").textContent = `Provisional · ${results.priority.label}`;
    byId("agpiAction").textContent = results.priority.action;
    byId("needle").style.left = `${results.agpiScore}%`;

    byId("impactScore").textContent = formatNumber(results.risk.impact);
    byId("inherentRisk").textContent =
      `${formatNumber(results.risk.inherent)} · ${results.inherentTierName}`;
    byId("residualRisk").textContent =
      `${formatNumber(results.risk.residual)} · ${results.residualTierName}`;
    byId("riskTier").textContent = `Provisional · ${results.effectiveTierName}`;
    byId("tierStat").className =
      `stat tier-${results.effectiveTierName.toLowerCase()}`;

    const escalationBanner = byId("escalationBanner");
    const tierIsHighOrCritical =
      results.effectiveTierName === "High" ||
      results.effectiveTierName === "Critical";
    if (results.triggerIds.length || tierIsHighOrCritical) {
      escalationBanner.classList.add("visible");
      const parts = [];
      if (results.triggerIds.length) {
        parts.push(
          `${results.triggerIds.length} mandatory trigger${results.triggerIds.length === 1 ? "" : "s"} selected.`,
        );
      }
      parts.push(
        `Provisional effective triage tier: ${results.effectiveTierName}` +
          (results.tierFloored
            ? ` (raised by ${results.floorReason}; residual was ${results.residualTierName}).`
            : "."),
      );
      if (results.tierFloored) {
        parts.push(
          "This is a triage result, not current 05 assurance state. If an authorised forum decides on escalation, record that decision in WCC-AIG-16 or approved native minutes and link its dated Gate Event in 36.",
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

    byId("summaryPriority").textContent = `Provisional · ${results.priority.label}`;
    byId("summaryTier").textContent =
      `Provisional · ${results.effectiveTierName}` +
      (results.tierFloored ? ` (governance floor: ${results.floorReason})` : "") +
      ` · inherent ${results.inherentTierName} · residual ${formatNumber(results.risk.residual)} (${results.residualTierName})`;
    byId("summaryIntensity").textContent = `Provisional · ${results.assuranceIntensity}`;
    byId("summaryNextGate").textContent = `Proposed · ${route[0].requirement}`;
    byId("summaryCommercial").textContent = logic.commercialRequired(profile)
      ? "Potential route — commercial owner confirms"
      : "Not indicated by intake — confirm case-specific need";
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
    const required = [byId("systemName"), byId("purpose")];
    const invalid = required.find((field) => !field.value.trim());
    if (invalid) {
      byId("validationMessage").textContent =
        "Add the system or model name and purpose before exporting. AIR-ID is Council-issued: use the existing identifier or leave it blank; this tool never creates one.";
      invalid.reportValidity();
      invalid.focus();
      return false;
    }
    if (!byId("triageReviewed").checked) {
      byId("validationMessage").textContent =
        "Review the scores, action authority and mandatory triggers, then tick the confirmation box before exporting.";
      byId("triageReviewed").focus();
      return false;
    }
    byId("validationMessage").textContent = "";
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
      `AIR-ID: ${profile.registerId || "Not assigned"}`,
      `System / model: ${profile.systemName || "Not entered"}`,
      `Purpose: ${profile.purpose || "Not entered"}`,
      `Service area: ${profile.serviceArea || "Not entered"}`,
      `Service owner: ${profile.serviceOwner || "Not entered"}`,
      `Supplier / developer: ${profile.supplierDeveloper || "Not entered"}`,
      `Source: ${profile.source}`,
      `AI capability: ${profile.capability}`,
      `Automated action authority: ${profile.actionAuthority}`,
      `Systems / tools accessed: ${profile.systemsAccessed || "Not entered"}`,
      `Lifecycle: ${profile.lifecycle}`,
      `Data type: ${profile.dataType}`,
      `Commercial route indicated by intake: ${logic.commercialRequired(profile) ? "Potential route — confirm with commercial owner" : "Not indicated — case-specific confirmation required"}`,
      "",
      "AGPI PRIORITY",
      "-------------",
      ...logic.DIMENSIONS.map(
        (dimension) =>
          `${dimension.name} (${dimension.weight}%): ${agpiScores[dimension.id]} / 5`,
      ),
      `Weighted AGPI score: ${formatNumber(results.agpiScore)} / 100`,
      `Provisional governance priority: ${results.priority.label}`,
      `Action: ${results.priority.action}`,
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
      `Residual risk: ${formatNumber(results.risk.residual)}`,
      `Provisional effective triage tier: ${results.effectiveTierName}${results.tierFloored ? ` (governance floor: ${results.floorReason})` : ""}`,
      ...(results.tierFloored
        ? [
            "  Note: this effective triage tier is a draft routing input, not a current assurance state. If a formal decision is reached, record it in WCC-AIG-16 or approved native minutes and link the separate dated Gate Event in 36.",
          ]
        : []),
      `Provisional inherent risk tier: ${results.inherentTierName}`,
      `Provisional residual risk tier: ${results.residualTierName}`,
      `Provisional assurance intensity: ${results.assuranceIntensity}`,
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
        `${gate.sequence}. ${gate.requirement}`,
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
        "Draft handoff only: no agent authority is granted. WCC-AIG-45 owns permissions and delegations.",
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
      "05 holds permanent Council-issued AIR-ID and current assurance state. 36 separates prospective Gate Plan, dated Gate Events and event-linked Gate Conditions.",
      "Formal decisions stay in WCC-AIG-16 or approved native minutes; evidence remains at source with versioned pointers in 05. The separate proposed Capabilities and System Map is a relationship catalogue, not a second register.",
      "This draft does not create an AIR-ID, assurance state, legal scope, FRIA completion, approval, publication or ISO conformity.",
      "Decision support only: validate forum names, delegated authorities and assessment requirements locally.",
    );
    return `${lines.join("\n")}\n`;
  }


  function yesNo(value) {
    return value ? "Yes" : "No";
  }

  function fieldValueCsv(rows) {
    return logic.toCsv(
      [
        "Field label / prompt",
        "Field reference type",
        "Triage draft value",
        "Value status",
        "Review, evidence or authority still required",
      ],
      rows.map(([field, value]) => [
        field,
        "Prompt / candidate label — exact controlled field not verified",
        value == null ? "" : value,
        "Triage proposal only — owner verification required",
        "Review the current artefact and its controlled field list; do not import as a completed assessment.",
      ]),
    );
  }

  function buildCanonicalRecord(calculation) {
    return logic.buildCanonicalRecord(calculation, readAgentic(), latestAgentic);
  }

  function agpiPrefillCsv(calculation) {
    const p = calculation.profile;
    const r = calculation.results;
    const s = calculation.agpiScores;
    const rows = [
      ["System / model name", p.systemName],
      ["AIR-ID", p.registerId],
      ["Service area", p.serviceArea],
      ["Service owner", p.serviceOwner],
      ["Assessed by (owner to complete)", ""],
      ["Assessment date (actual assessment date; owner to complete)", ""],
      ["Resident Impact", s.resident],
      ["Public Trust & Reputation", s.trust],
      ["Legal & Regulatory Exposure", s.legal],
      ["Governance Visibility & Accountability", s.visibility],
      ["Strategic Value & Organisational Dependency", s.strategic],
      ["Human Oversight & Decision Authority", s.oversight],
      ["AGPI score (0–100)", r.agpiScore],
      ["Raw AGPI priority", r.rawAgpiPriority || r.priority.label],
      ["Authorised governance-priority uplift (optional)", ""],
      ["Effective governance priority", r.effectiveGovernancePriority || r.priority.label],
      ["Priority uplift / routing rationale", ""],
      ["Source / completion status", ""] // Formula-owned in WCC-AIG-06; do not paste a status.
    ];
    return fieldValueCsv(rows);
  }

  function mandatoryFloorLabel(results) {
    if (!results.tierFloored) return "None";
    if (results.effectiveTierName === "Critical") return "Critical";
    if (results.effectiveTierName === "High") return "High";
    return results.effectiveTierName || "None";
  }

  function riskPrefillCsv(calculation) {
    const p = calculation.profile;
    const r = calculation.results;
    const triggerSet = new Set(r.triggerIds);
    const a = latestAgentic || null;
    const isAgent =
      p.capability === "Agentic AI" ||
      (p.actionAuthority && p.actionAuthority !== "None — outputs only") ||
      triggerSet.has("agentic");

    const rows = [
      ["AIR-ID", p.registerId],
      ["System / Model Name", p.systemName],
      ["Purpose / Description", p.purpose],
      ["Service Area", p.serviceArea],
      ["Service Owner", p.serviceOwner],
      ["Supplier / Developer", p.supplierDeveloper],
      ["Source", p.source],
      ["AI Capability", p.capability],
      ["Automated Action Authority", p.actionAuthority],
      ["Systems / Tools Accessed", p.systemsAccessed],
      ["Lifecycle Stage", p.lifecycle],
      ["Personal / Special Category Data", p.dataType],
      ["Triage export date (not an assessment date)", ""],
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
      ["Trigger — Agentic Autonomous Action", yesNo(triggerSet.has("agentic"))],
      ["Mandatory Risk Floor", mandatoryFloorLabel(r)],
      ["Effective Governance Tier", r.effectiveTierName],
      ["Tier Floor Reason", r.floorReason || ""],
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
      ["Agent Record (ASBOM) Ref", a ? (a.asbomRef || "") : ""]
    ];
    return fieldValueCsv(rows);
  }

  function agentRecordPrefillCsv(calculation) {
    if (!latestAgentic) return "";
    const p = calculation.profile;
    const r = calculation.results;
    const a = latestAgentic;
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
      ["Environment", ""],
      ["Jurisdiction", ""],
      ["Autonomy Level", a.autonomyLabel],
      ["Agency Tier", a.tierLabel],
      ["AGPI Priority (from 05)", r.effectiveGovernancePriority || r.priority.label],
      ["Persistence?", ""],
      ["Memory Type", ""],
      ["Can delegate / create agents?", ""],
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
      ["Self-Modification Authority", ""]
    ];
    return logic.toCsv(
      ["Target artefact", "Field label / prompt", "Field reference type", "Triage draft value", "Value status", "Review, evidence or authority still required"],
      rows.map(([field, value]) => [
        "WCC-AIG-45 Agent Record / ASBOM",
        field,
        "Prompt / candidate label — exact controlled field not verified",
        value == null ? "" : value,
        "Proposal only — not a mandate, approval or operational state",
        "Review the current ASBOM contract and evidence; authorised owners determine mandate, permissions, delegations and status.",
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
    const risk = "WCC-AIG-07 / Triage Import";
    add(risk, "AIR-ID", p.registerId, "Triage value; assessor confirms");
    add(risk, "Effective Governance Tier", r.effectiveTierName, "Triage value; assessor confirms");
    add(risk, "Assurance Intensity", r.assuranceIntensity, "Triage value; assessor confirms");
    add(risk, "Kill-switch Demonstrated", yesNo(a.killSwitch), "Self-reported at triage; verify evidence");
    add(risk, "Rollback Capability", yesNo(a.rollback), "Self-reported at triage; verify evidence");
    add(risk, "Boundaries Tested", yesNo(a.boundariesTested), "Self-reported at triage; verify evidence");

    const triage = "WCC-AIG-48 / Agentic Triage assessment";
    add(triage, "AIR-ID", p.registerId, "Assessment identity");
    logic.AGENCY_DIMENSIONS.forEach((d) => {
      const note = a.dimensionNotes[d.id] || {};
      add(triage, d.label + " score (0-5)", a[d.id], "Provisional; confirm against WCC-AIG-47");
      add(triage, d.label + " rationale", note.rationale || "", "Blank means assessment explanation is outstanding");
      add(triage, d.label + " evidence ref", note.evidenceRef || "", "Blank means evidence reference is outstanding");
    });
    add(triage, "Agency multipliers", a.multipliers.join("; "), "Separate flags; not additional scored dimensions");
    add(triage, "Worst plausible action chain", a.worstChain, "Assessor to validate");
    add(triage, "Proposed autonomy level", a.autonomyLabel, "Confirm permitted autonomy at gate");
    add(triage, "Proposed agency tier", a.tierLabel, "Highest applicable tier floor; confirm");
    add(triage, "Tier escalation reasons", a.escalations.join("; "), "Review mandatory floors and uncertainty");
    add(triage, "Required control route", a.pathway, "Not an approval or runtime control");
    add(triage, "Production readiness gate", "Required runtime controls Implemented and Evidenced or effective, time-bounded compensating control accepted under Council delegation", "No production approval from triage");

    const security = "WCC-AIG-20 / AI Security Review Checklist";
    add(security, "AIR-ID", p.registerId, "Action-capable systems: applies at every base risk tier; review depth is proportionate");
    ["ASI01 Agent Goal Hijack","ASI02 Tool Misuse","ASI03 Identity and Privilege Abuse","ASI04 Agentic Supply Chain Vulnerabilities","ASI05 Unexpected Code Execution","ASI06 Memory and Context Poisoning","ASI07 Insecure Inter-Agent Communication","ASI08 Cascading Failures","ASI09 Human-Agent Trust Exploitation","ASI10 Rogue Agents"].forEach(risk => add(security, risk, "", "Record applicability/rationale, owner, required and actual state, test result and evidence; blank is outstanding"));

    const record = "WCC-AIG-45 / Agent Record";
    add(record, "AIR-ID", p.registerId, "Carry forward");
    add(record, "Agent Name", p.systemName, "Proposed; confirm");
    add(record, "Approved Purpose (mandate)", "", "Only fill after formal authorisation");
    add(record, "Autonomy Level", a.autonomyLabel, "Triage proposal; confirm authorised level");
    add(record, "Agency Tier", a.tierLabel, "Triage proposal; confirm");
    add(record, "AGPI Priority (from 05)", r.effectiveGovernancePriority || r.priority.label, "Confirm Register value");
    add(record, "Notes", "Proposed purpose from intake: " + p.purpose, "Context only; no approved mandate");
    add(record, "Kill-switch tested?", "", "Test evidence required");
    add(record, "Rollback capability?", "", "Test evidence required");
    add("WCC-AIG-45 / Runtime Controls", "Control ID", "ASI01–ASI10 where applicable", "One row per applicable control; set required/actual state, test, owner and evidence; no state is presumed");

    const vector = "WCC-AIG-45 / Capability Vector";
    add(vector, "AIR-ID", p.registerId, "Carry forward");
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

    const authority = "WCC-AIG-46 / Agent Authority Graph (derived from 45 ASBOM)";
    add(authority, "AIR-ID / agent reference", p.registerId, "Identity pointer only; no authority edge created");
    add(authority, "Authority delegated", "", "Map only an existing authorised edge from WCC-AIG-45; no authority granted here");
    add(authority, "Constraints / ceiling", "", "Verify against ASBOM and formal delegation; do not infer from triage multipliers");
    add(authority, "Revocable how", "", "Prompt only; evidence revocation before any authority is granted");

    const monitoring = "WCC-AIG-39 / Monitoring Log";
    add(monitoring, "AIR-ID", p.registerId, "Identity seed only; no monitoring result created");
    add(monitoring, "AI System / Service", p.systemName, "Identity seed only");
    add(monitoring, "Monitoring Owner", "", "Assign and confirm at deployment");
    add(monitoring, "Metric Category", "Agentic security / operations", "Assessor to confirm category for each applicable metric");
    add(monitoring, "Approved Threshold / Tolerance", "", "Set and approve per metric before live use; blank is outstanding");
    add(monitoring, "Evidence Location", "", "Cite WCC-AIG-50 action IDs and verified logs when operated; no test is presumed");
    ["Denied tool calls","Authority changes","Memory writes","Loops and delegation","External destinations","Human overrides","Time to containment"].forEach(metric => add(monitoring, "Metric / Indicator", metric, "Set Approved Threshold / Tolerance, Monitoring Owner, review window and evidence before live use where applicable"));

    const actions = "WCC-AIG-50 / Agentic Action / Decision Record";
    add(actions, "AIR-ID / agent reference", p.registerId, "Identity pointer only; no action record or decision created");
    add(actions, "Action / decision record reference", "", "Record each consequential action in the controlled 50 record when operated; no action authority is granted");
    add(actions, "Human review / outcome / evidence", "", "Prompt only; verify recorded human review, outcome and source evidence");

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
      "AIR-ID","Read","Write","Execute","Communicate","Purchase","Delegate",
      "Persuade","Code","Discover","Persist","Replicate","Learn","Escalate",
      "Multiplier: Credential access","Multiplier: Self-modification",
      "Multiplier: Tool discovery","Multiplier: Goal adaptation",
      "Multiplier: External comms","Notes"
    ];
    const yesOrBlank = (name) => selected.has(name) ? "Yes" : "";
    const row = [
      calculation.profile.registerId,
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
    return logic.toCsv(
      ["Target artefact", ...headers.map((field) => `${field} — prompt / proposed value`), "Field/value status"],
      [[
        "WCC-AIG-45 Agent Record / Capability Vector",
        ...row,
        "Triage handoff only — unselected capabilities remain unknown, not No; verify exact fields and scope against the current controlled ASBOM.",
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
    const handoff = logic.build05DraftHandoff(profile, calculation.results, latestAgentic);
    download(
      `${safeSlug(profile.systemName)}-05-register-review-handoff.csv`,
      logic.toCsv(handoff.headers, handoff.rows),
      "text/csv;charset=utf-8",
    );
  }

  function capabilitiesMapExport() {
    if (!validateForExport()) return;
    const calculation = update();
    const handoff = logic.buildCapabilitiesMapHandoff(calculation.profile);
    download(
      `${safeSlug(calculation.profile.systemName)}-capabilities-system-map-draft-handoff.csv`,
      logic.toCsv(handoff.headers, handoff.rows),
      "text/csv;charset=utf-8",
    );
  }

  function gateExport() {
    if (!validateForExport()) return;
    const calculation = update();
    download(
      `${safeSlug(calculation.profile.systemName)}-planned-governance-route.csv`,
      logic.buildGatePlanCsv(calculation.profile, calculation.route),
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
      ? "Synthetic / incomplete example: untouched score fields still use built-in defaults. Complete and review every score and trigger. This is not current 05 assurance."
      : !reviewed
        ? "All score inputs have been entered, but this triage is not yet confirmed. Review the scores, action authority and triggers. This is not current 05 assurance."
        : "User-confirmed triage inputs. The calculated priority, risk tier and route remain provisional decision support, not current 05 assurance.";
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
    if (target.matches && target.matches("[data-dimension]")) {
      enteredAgpiDimensions.add(target.dataset.dimension);
    }
    if (target.matches && target.matches("[data-impact]")) {
      enteredImpactDimensions.add(target.dataset.impact);
    }
    if (target.matches && target.matches("#likelihood")) likelihoodEntered = true;
    if (target.matches && target.matches("#control")) controlEntered = true;
    if (target.matches && target.matches(
      '[data-dimension], [data-impact], [data-trigger], #likelihood, #control, #actionAuthority'
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
      worstChain: byId("agWorstChain").value, asbomRef: byId("agAsbom").value.trim(),
    };
  }
  function esc(t) { const d = document.createElement("div"); d.textContent = t; return d.innerHTML; }
  function renderAgentic() {
    const missing = logic.AGENCY_DIMENSIONS.map((d) => byId("ag_" + d.id))
      .find((el) => !el || el.value === "");
    if (missing) {
      latestAgentic = null;
      byId("agencyResult").hidden = true;
      byId("validationMessage").textContent =
        "Score all five agency dimensions before assessing agency.";
      missing.focus();
      return;
    }
    const actionAuthority = byId("actionAuthority").value;
    const autonomy = Number(byId("ag_autonomy").value);
    const minimumAutonomy = actionAuthority === "Fully autonomous" ? 3 :
      actionAuthority === "Acts within defined bounds — monitored" ? 2 :
      actionAuthority === "Human approves each action" ? 1 : 0;
    if (autonomy < minimumAutonomy) {
      latestAgentic = null;
      byId("agencyResult").hidden = true;
      byId("validationMessage").textContent =
        "The autonomy score conflicts with the automated action authority selected above. Review both answers before assessing agency.";
      byId("ag_autonomy").focus();
      return;
    }
    byId("validationMessage").textContent = "";
    latestAgentic = logic.computeAgentic(readAgentic());
    const r = latestAgentic; const host = byId("agencyResult");
    let html = '<p class="ag-tier">' + esc(r.tierLabel) + "</p>";
    html += "<p><strong>Autonomy:</strong> " + esc(r.autonomyLabel) + "</p>";
    html += "<p><strong>Governance pathway:</strong> " + esc(r.pathway) + "</p>";
    if (r.escalations.length) html += "<p><strong>Escalation:</strong> " + esc(r.escalations.join("; ")) + "</p>";
    if (r.flags.length) html += '<p class="ag-flag"><strong>Flags:</strong> ' + esc(r.flags.join("; ")) + "</p>";
    html += "<p><strong>Deployment control:</strong> " + esc(r.deploymentControl) + "</p>";
    html += '<p class="muted">Draft handoff only: the triage suggests an agent classification and agency tier. WCC-AIG-45 owns permissions and delegations; verify the current authorised Agent Record and never infer authority from this result.</p>';
    host.innerHTML = html; host.hidden = false;
  }
  buildAgenticInputs();
  const invalidateAgency = () => {
    if (!latestAgentic) return;
    latestAgentic = null;
    byId("agencyResult").hidden = true;
    byId("validationMessage").textContent =
      "Agency inputs changed. Run Assess agency again before exporting agentic records.";
  };
  byId("agenticStep").addEventListener("change", invalidateAgency);
  byId("actionAuthority").addEventListener("change", invalidateAgency);
  const assessBtn = byId("assessAgency");
  if (assessBtn) assessBtn.addEventListener("click", renderAgentic);
})();
