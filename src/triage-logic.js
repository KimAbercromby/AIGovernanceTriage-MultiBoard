(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.TriageLogic = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const DIMENSIONS = [
    {
      id: "resident",
      name: "Resident Impact",
      weight: 25,
      question:
        "Could the AI influence services, decisions or outcomes affecting residents or service users?",
    },
    {
      id: "trust",
      name: "Public Trust and Reputation",
      weight: 20,
      question:
        "Could failures reduce confidence in council or attract significant public scrutiny?",
    },
    {
      id: "legal",
      name: "Legal and Regulatory Exposure",
      weight: 20,
      question:
        "Does the AI engage statutory duties, regulatory requirements or legal obligations?",
    },
    {
      id: "visibility",
      name: "Governance Visibility and Accountability",
      weight: 15,
      question:
        "Is ownership clear? Is the AI registered, documented and appropriately governed?",
    },
    {
      id: "strategic",
      name: "Strategic Value and Organisational Dependency",
      weight: 10,
      question:
        "How important is the AI to delivering strategic objectives and operational performance?",
    },
    {
      id: "oversight",
      name: "Human Oversight and Decision Authority",
      weight: 10,
      question:
        "Does meaningful human oversight exist, and can AI-assisted decisions be reviewed or challenged?",
    },
  ];

  const SCALE_LABELS = [
    "Very low concern",
    "Low concern",
    "Moderate concern",
    "Significant concern",
    "Critical concern",
  ];

  const PRIORITIES = [
    {
      min: 80,
      label: "Priority 1 – Critical",
      action:
        "Immediate governance review, executive oversight and comprehensive assurance before deployment or continued operation.",
    },
    {
      min: 60,
      label: "Priority 2 – High",
      action:
        "Enhanced governance assessment, formal risk review and active assurance oversight.",
    },
    {
      min: 40,
      label: "Priority 3 – Standard",
      action:
        "Standard governance assessment, evidence review and ongoing monitoring.",
    },
    {
      min: 20,
      label: "Priority 4 – Routine",
      action:
        "Registration, proportionate evidence and periodic review.",
    },
    {
      min: 0,
      label: "Priority 5 – Observe",
      action:
        "Local management oversight with reassessment before operational deployment or material change.",
    },
  ];

  const TRIGGERS = [
    {
      id: "specialData",
      text: "Processing of special category personal data as defined by the UK GDPR",
    },
    {
      id: "vulnerable",
      text: "AI used in relation to vulnerable residents, including children, adults with care and support needs, and individuals experiencing homelessness",
    },
    {
      id: "housingCare",
      text: "AI that directly influences housing allocation, social care assessments or homelessness prevention decisions",
    },
    {
      id: "novel",
      text: "Novel or first-of-type AI deployment for which the organisation has no prior operational experience",
    },
    {
      id: "statutory",
      text: "AI that produces or directly informs statutory decisions",
    },
    {
      id: "materialChange",
      text: "Significant supplier, model, data or scope change that materially alters an existing deployment",
    },
    {
      id: "agentic",
      text: "AI systems capable of executing actions autonomously — including initiating transactions, modifying records, sending communications or invoking other systems — without human review of each individual action",
    },
  ];

  const IMPACT_DIMENSIONS = [
    {
      id: "residentImpact",
      name: "Resident impact",
      hint: "Physical, psychological, financial or social harm to individuals or communities",
    },
    {
      id: "legalImpact",
      name: "Legal and regulatory impact",
      hint: "Regulatory sanctions, enforcement, legal proceedings or breach of statutory obligations",
    },
    {
      id: "reputationImpact",
      name: "Reputational impact",
      hint: "Damage to public trust, media coverage or political scrutiny",
    },
    {
      id: "operationalImpact",
      name: "Operational impact",
      hint: "Disruption to service delivery, operational failures or remediation costs",
    },
    {
      id: "financialImpact",
      name: "Financial impact",
      hint: "Direct financial costs including compensation, fines and lost efficiency",
    },
  ];

  const TIERS = [
    { max: 5, name: "Low" },
    { max: 10, name: "Medium" },
    { max: 15, name: "High" },
    { max: 25, name: "Critical" },
  ];

  const DEFAULT_FORUMS = {
    strategic: "Strategic planning / prioritisation forum",
    technical: "Technical Design Review",
    assurance: "AI Assurance Board",
    digital: "Digital Governance Board",
    commercial: "Procurement Board / delegated commercial authority",
    release: "Delivery / release authority (including ethics gate)",
  };

  // Exports deliberately use a handoff schema, never an import-ready row.
  const DRAFT_HANDOFF_HEADERS = [
    "Target artefact / sheet",
    "Field label or prompt",
    "Field reference type",
    "Triage draft value",
    "Value status",
    "Review, evidence or authority still required",
  ];
  const REGISTER_FIELDS = new Set([
    "AIR-ID", "System name", "Purpose and boundary", "Service area",
    "Service Owner", "Supplier / source", "Lifecycle stage", "Approval status",
    "Operational status", "Can it act?", "Decision record ref",
    "Latest gate Event ID", "Assessment / evidence ref", "Next review",
  ]);
  const ASSESSMENT_FIELDS = new Set([
    "AIR-ID", "Priority (AIG-ASS-01)", "AIG-ASS-01 ref / date", "Risk tier (AIG-ASS-02)",
    "AIG-ASS-02 ref / date", "Agency tier (AIG-AGT-02/AIG-AGT-03)", "AIG-AGT-02/AIG-AGT-03 ref / date",
    "Privacy / DPIA position", "Equality / EIA position",
    "Other specialist finding refs", "AIG-AGT-04 Agent Record ref",
    "AIG-AGT-05 Authority Graph ref", "AIG-OPS-02 Monitoring ref", "As-at date",
  ]);
  const GATE_PLAN_FIELDS = new Set([
    "Plan ID", "AIR-ID", "Gate/forum", "Trigger/lifecycle", "Requirement",
    "Basis/triage ref", "Target date", "Responsible role", "Plan state",
    "waiver rationale+authority", "Source version", "Plan QA",
  ]);
  const GATE_EVENT_FIELDS = new Set([
    "Event ID", "AIR-ID", "Gate/forum", "Lifecycle stage at event",
    "Decision date", "Decision", "Assurance opinion ref",
    "Decision-maker/role", "Next gate", "Event notes",
    "Decision record/minutes ref", "Technical snapshot/as-at ref",
    "Event record state", "Recorded by/role", "Evidence source/URI",
    "Event QA", "Plan ID", "priority override fields",
  ]);
  const GATE_CONDITION_FIELDS = new Set([
    "Condition ID", "Event ID", "AIR-ID derived", "Condition/action",
    "Action owner/role", "Due date", "Condition state", "Resolved/waived on",
    "Resolution evidence/waiver authority ref", "Overdue derived", "Condition QA",
  ]);
  function fieldReferenceType(sheet, field) {
    const value = String(field || "").trim();
    const exactRegister =
      (sheet === "AI Register" && REGISTER_FIELDS.has(value)) ||
      (sheet === "Assessment summary" && ASSESSMENT_FIELDS.has(value));
    const exactGateLog =
      (sheet.includes("Gate Plan") && GATE_PLAN_FIELDS.has(value)) ||
      (sheet.includes("Gate Events") && GATE_EVENT_FIELDS.has(value)) ||
      (sheet.includes("Gate Conditions") && GATE_CONDITION_FIELDS.has(value));
    return exactRegister
      ? "Proposed AIG-INV-04 sheet/field label — owner verification required"
      : exactGateLog
        ? "AIG-DEC-04 contract header — handoff only, not import-ready"
        : "Prompt / candidate label — exact controlled field not verified";
  }

  function clampScore(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return 1;
    return Math.min(5, Math.max(1, number));
  }

  function calculateAgpi(scores) {
    const total = DIMENSIONS.reduce((sum, dimension) => {
      const score = clampScore(scores[dimension.id]);
      return sum + ((score - 1) / 4) * dimension.weight;
    }, 0);
    return Math.round(total * 100) / 100;
  }

  function priorityFor(score) {
    const safeScore = Math.min(100, Math.max(0, Number(score) || 0));
    return PRIORITIES.find((priority) => safeScore >= priority.min);
  }

  function calculateRisk(impactScores, likelihood, controlEffectiveness) {
    const impacts = IMPACT_DIMENSIONS.map((dimension) =>
      clampScore(impactScores[dimension.id]),
    );
    const impact = Math.max(...impacts);
    const likelihoodScore = clampScore(likelihood);
    const controlScore = clampScore(controlEffectiveness);
    const inherent = likelihoodScore * impact;
    const residual = Math.round(inherent * (controlScore / 5) * 10) / 10;
    const tier = TIERS.find((item) => residual <= item.max) || TIERS[3];
    return {
      impact,
      likelihood: likelihoodScore,
      control: controlScore,
      inherent,
      residual,
      tier,
    };
  }

  function commercialRequired(profile) {
    return (
      profile.procurementRequired === "Yes" ||
      profile.source === "Procured" ||
      profile.source === "Embedded in platform / supplier feature"
    );
  }

  function assuranceIntensity(score, tierName, triggerIds) {
    if (
      triggerIds.length ||
      tierName === "Critical" ||
      Number(score) >= 80
    ) {
      return "Comprehensive / immediate";
    }
    if (tierName === "High" || Number(score) >= 60) return "Enhanced";
    if (tierName === "Medium" || Number(score) >= 40) return "Standard";
    return "Proportionate";
  }

  function assessmentRequirements(profile, results) {
    const triggerSet = new Set(results.triggerIds);
    const personalData = profile.dataType === "Personal data";
    const specialData =
      profile.dataType === "Special category data" ||
      triggerSet.has("specialData");
    // The effective governance tier is the authoritative tier for downstream
    // routing. Residual risk remains visible as the calculated post-control score.
    const highImpact =
      results.effectiveTierName === "High" ||
      results.effectiveTierName === "Critical" ||
      results.risk.impact >= 4;
    const affectsPeople = profile.affectsIndividuals === "Yes";

    let dpia = "Screening required — DPO/privacy owner confirmation";
    if (specialData || triggerSet.has("housingCare") || triggerSet.has("statutory")) {
      dpia = "Potential DPIA indication — DPO confirmation";
    } else if (profile.dataType === "None") {
      dpia = "Screening required — no personal data stated; verify";
    } else if (personalData) {
      dpia = "Screening required — DPO confirmation";
    }

    const eia = highImpact || affectsPeople
      ? "Potential full assessment — specialist confirmation"
      : "Screening required for every tier";
    const humanRightsPotential =
      results.effectiveTierName === "Critical" ||
      triggerSet.has("vulnerable") ||
      triggerSet.has("housingCare") ||
      triggerSet.has("statutory");
    const humanRights = humanRightsPotential
      ? "Potential engagement — legal owner applicability confirmation pending"
      : "Screening required — legal owner applicability confirmation pending";
    const atrs =
      profile.publicFacing === "Yes" ||
      affectsPeople ||
      triggerSet.has("statutory")
        ? "Potential applicability — owner confirmation pending"
        : "Not indicated by intake — owner applicability confirmation pending";
    const supplierDueDiligence = commercialRequired(profile);

    return {
      dpia,
      eia,
      humanRights,
      humanRightsPotential,
      equalityScreening: true,
      humanRightsScreening: true,
      privacyScreening: true,
      atrs,
      supplierDueDiligence,
      dpiaScreening: true,
    };
  }

  function buildEvidenceList(profile, results) {
    const requirements = assessmentRequirements(profile, results);
    const evidence = [
      "AI Intake Form and AI Register entry",
      "AGPI triage result",
      "AI Risk Assessment Worksheet",
      "Responsible AI Assessment",
      "Security Review Checklist",
      "Model Card",
      "Evidence Index",
      "Equality Act 2010 section 149 screening (all tiers; equality-owner confirmation)",
      "Human Rights Act 1998 section 6 screening (all tiers; legal-owner confirmation)",
      "Data protection and privacy screening (all tiers; DPO confirmation where relevant)",
    ];
    evidence.push("Data protection / DPIA applicability screening outcome (all tiers; DPO owner, evidence ref and status pending)");
    evidence.push("ATRS applicability / publication screening (all tiers; owner confirmation, evidence ref and status pending)");
    if (requirements.dpia.startsWith("Potential DPIA")) {
      evidence.push("Potential DPIA — DPO confirms legal threshold and completion");
    }
    if (requirements.eia.startsWith("Potential full assessment")) {
      evidence.push("Equality impact assessment — indication for specialist confirmation");
    }
    if (requirements.humanRightsPotential) {
      evidence.push("Human rights assessment — potential engagement to confirm");
    }
    if (requirements.supplierDueDiligence) {
      evidence.push("Supplier AI Due Diligence Questionnaire");
    }
    if (
      results.effectiveTierName === "High" ||
      results.effectiveTierName === "Critical" ||
      results.triggerIds.length
    ) {
      evidence.push("Independent or enhanced assurance evidence");
    }
    return [...new Set(evidence)];
  }

  function buildRoute(profile, results, forums) {
    const configured = { ...DEFAULT_FORUMS, ...(forums || {}) };
    const commercial = commercialRequired(profile);
    const retrospective = profile.lifecycle === "Live";
    const assuranceEvidence = buildEvidenceList(profile, results);

    return [
      {
        sequence: 1,
        key: "strategic",
        requirement: "Strategic prioritisation",
        forum: configured.strategic,
        decision: retrospective
          ? "Does the purpose, ownership, priority and continued strategic fit support retaining this live system?"
          : "Is the proposal aligned, sufficiently defined and worth progressing to the next gate?",
        evidence: [
          "AI Intake Form",
          "AIR-ID",
          "Named service owner",
          "Purpose and expected benefits",
          "AGPI triage result",
          "Indicative cost and dependencies",
        ],
        status: retrospective ? "Draft plan — retrospective intake" : "Draft plan — proposed",
        handoff:
          "Draft scope, priority, owner and decision questions in the plan; formal decisions and any conditions belong to the authorised record and linked gate event.",
      },
      {
        sequence: 2,
        key: "technical",
        requirement: "Technical endorsement",
        forum: configured.technical,
        decision:
          "Is the design feasible, secure, supportable and aligned to architecture and data standards?",
        evidence: [
          "Solution design and data flows",
          "Integrations and permissions",
          "Model or supplier information",
          "Security checklist",
          "Test approach and acceptance criteria",
        ],
        status: retrospective ? "Draft plan — retrospective baseline" : "Draft plan — proposed",
        handoff:
          "Propose any prospective gate requirements in the AIG-DEC-04 Gate Plan. Record a dated decision as a separate Gate Event and create each condition as an event-linked Gate Condition only after the authorised decision.",
      },
      {
        sequence: 3,
        key: "assurance",
        requirement: "AI assurance opinion",
        forum: configured.assurance,
        decision:
          "Is AI-specific risk sufficiently understood and controlled to issue a versioned assurance opinion?",
        evidence: assuranceEvidence,
        status: `Draft plan — ${results.assuranceIntensity.toLowerCase()} assurance route`,
        handoff:
          "The assurance owner may issue a versioned assurance opinion and carry forward conditions; triage itself is not an assurance opinion.",
      },
      {
        sequence: 4,
        key: "digital",
        requirement: "Digital portfolio decision",
        forum: configured.digital,
        decision:
          "Should the digital investment progress within portfolio, funding, dependency and delivery constraints?",
        evidence: [
          "Business case or proportionate benefits statement",
          "Technical endorsement",
          "Versioned AI assurance opinion",
          "Dependencies and resourcing",
          "Material open conditions",
        ],
        status: "Draft plan — proposed",
        handoff:
          "Prepare the portfolio decision question and evidence; the authorised forum records any decision in its formal record.",
      },
      {
        sequence: 5,
        key: "commercial",
        requirement: "Procurement / commercial approval",
        forum: configured.commercial,
        decision:
          "Is the procurement route, supplier and contract acceptable under the relevant delegated authority?",
        evidence: [
          "Supplier AI due diligence",
          "Evaluation and funding approval",
          "Data, security and AI contract terms",
          "Audit and change-notification rights",
          "Versioned AI assurance opinion",
        ],
        status: commercial ? "Draft candidate — confirm with commercial owner" : "Not indicated by intake — confirm with commercial owner",
        handoff: commercial
          ? "If procurement applies, confirm the relevant commercial authority and record its decision and conditions."
          : "Confirm case-specific procurement applicability with the commercial owner before recording N/A.",
      },
      {
        sequence: 6,
        key: "release",
        requirement: retrospective
          ? "Deployment continuation / release decision"
          : "Deployment / release decision",
        forum: configured.release,
        decision: retrospective
          ? "Should the live service continue, continue with conditions, be suspended or return for remediation?"
          : "Is the service operationally, ethically and evidentially ready to deploy?",
        evidence: [
          "Test results and acceptance evidence",
          "Closure or formal acceptance of conditions",
          "Monitoring plan and review schedule",
          "Incident, rollback and suspension arrangements",
          "Training and operational support",
          "Final Model Card and Evidence Index",
          "ATRS applicability / publication owner confirmation and evidence reference (pending; case-specific)",
        ],
        status: retrospective ? "Draft plan — continuation decision proposed" : "Draft plan — proposed",
        handoff:
          "If authorised, record the release decision in AIG-DEC-03 or approved native minutes, link the dated AIG-DEC-04 Gate Event, and record each condition separately. Triage does not approve deployment.",
      },
    ];
  }

  function formatDate(date) {
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date || new Date());
  }

  function isAgentSystem(profile, results) {
    const canAct = profile.actionAuthority && profile.actionAuthority !== "None — outputs only";
    return profile.capability === "Agentic AI" || canAct || (results.triggerIds && results.triggerIds.includes("agentic"));
  }
  function buildRegisterDraftHandoff(profile, results, agentic) {
    const rows = [];
    const add = (sheet, field, value, review) =>
      rows.push([
        sheet,
        field,
        fieldReferenceType(sheet, field),
        value || "",
        value == null || String(value).trim() === ""
          ? "No value asserted — owner verification required"
          : "Proposal / intake value — owner verification required",
        review,
      ]);
    const identityReview = profile.registerId
      ? "Verify this is the existing permanent Council-issued AIR-ID in AIG-INV-04; never replace or mint it."
      : "Obtain the permanent Council-issued AIR-ID through AIG-INV-04; this tool does not create one.";
    const supplierSource = [
      profile.supplierDeveloper && `Supplier / developer: ${profile.supplierDeveloper}`,
      profile.source && `Source: ${profile.source}`,
    ].filter(Boolean).join("; ");

    // Target only the real sheet and field names in the proposed
    // AIG-INV-04 Register. Blank status/reference fields are deliberate: triage cannot
    // establish current state, formal decisions, assessment records or IDs.
    add("AI Register", "AIR-ID", profile.registerId, identityReview);
    add("AI Register", "System name", profile.systemName, "Verify against the current authoritative record.");
    add("AI Register", "Purpose and boundary", profile.purpose, "Intake proposal only; not approved purpose. The authorised owner confirms purpose and boundary.");
    add("AI Register", "Service area", profile.serviceArea, "Verify locally against the current record.");
    add("AI Register", "Service Owner", profile.serviceOwner, "Verify the current accountable owner.");
    add("AI Register", "Supplier / source", supplierSource, "Combined from separate intake prompts for review; verify the supplier/source value against the actual workbook field and source.");
    add("AI Register", "Lifecycle stage", profile.lifecycle, "Proposed stage; map to the workbook's controlled list.");
    add("AI Register", "Approval status", "", "Do not infer or change current approval status. Formal decisions remain in AIG-DEC-03 or authorised native minutes.");
    add("AI Register", "Operational status", "", "Do not infer or change current operational status; verify the current AIG-INV-04 record.");
    add("AI Register", "Can it act?", "", "Do not set Yes/No from this triage. Verify actual capability and permissions against AIG-AGT-04 and complete the applicable agent assessment.");
    add("AI Register", "Decision record ref", "", "Only the authorised owner supplies a reference to an actual AIG-DEC-03 or approved native decision record.");
    add("AI Register", "Latest gate Event ID", "", "Only the AIG-DEC-04 owner supplies the ID of an actual dated Gate Event; triage creates none.");
    add("AI Register", "Assessment / evidence ref", "", "Add only an existing, verified reference; evidence remains at source.");
    add("AI Register", "Next review", "", "Set by the accountable owner from the approved review schedule.");
    add("Assessment summary", "AIR-ID", profile.registerId, identityReview);
    add("Assessment summary", "Priority (AIG-ASS-01)", `${results.priority.label}; triage score ${results.agpiScore}`, "Draft triage prompt only; verify the current priority and reference against the actual AIG-ASS-01 record.");
    add("Assessment summary", "AIG-ASS-01 ref / date", "", "Only enter an existing, verified AIG-ASS-01 record reference and date.");
    add("Assessment summary", "Risk tier (AIG-ASS-02)", "", `Triage effective tier is ${results.effectiveTierName}; it is not the current assessor-confirmed AIG-ASS-02 tier or evidence reference.`);
    add("Assessment summary", "AIG-ASS-02 ref / date", "", "Only enter an existing, verified AIG-ASS-02 assessment reference and date.");
    add("Assessment summary", "Agency tier (AIG-AGT-02/AIG-AGT-03)", agentic && agentic.tierLabel, "Draft agentic triage only; verify the authorised assessment and applicable AIG-AGT-02/AIG-AGT-03 record.");
    add("Assessment summary", "AIG-AGT-02/AIG-AGT-03 ref / date", "", "Only enter an existing, verified AIG-AGT-02/AIG-AGT-03 assessment reference and date.");
    add("Assessment summary", "Privacy / DPIA position", `Privacy screening required; ${results.requirements.dpia || "DPIA position requires screening"}`, "Screening/indication only; DPO or privacy owner determines applicability and completion.");
    add("Assessment summary", "Equality / EIA position", `Equality screening required; ${results.requirements.eia || "EIA position requires screening"}`, "Screening/indication only; equality owner determines applicability and completion.");
    add("Assessment summary", "Other specialist finding refs", "", "Only enter existing, verified specialist record references.");
    add("Assessment summary", "AIG-AGT-04 Agent Record ref", agentic && agentic.asbomRef, "User-entered pointer only; confirm the existing authorised AIG-AGT-04 Agent Record.");
    add("Assessment summary", "AIG-AGT-05 Authority Graph ref", "", "Only enter an existing verified AIG-AGT-05 reference; the map or triage does not grant authority.");
    add("Assessment summary", "AIG-OPS-02 Monitoring ref", "", "Only enter an existing, verified AIG-OPS-02 record reference.");
    add("Assessment summary", "As-at date", "", "Set only when the authorised owner verifies and updates the assessment summary.");
    return { headers: DRAFT_HANDOFF_HEADERS.slice(), rows };
  }

  function buildCapabilitiesMapHandoff(profile) {
    const headers = [
      "Target workbook / sheet",
      "Suggested field",
      "Draft proposal",
      "Review, evidence or authority still required",
    ];
    const rows = [
      ["AIG-INV-05 Capabilities and System Map / Use cases", "UC-ID", "", "Propose only after the catalogue and ID rules are approved; this tool never issues identifiers."],
      ["AIG-INV-05 Capabilities and System Map / Use cases", "Outcome-led use case", profile.purpose || "", "Intake purpose is a proposal, not an approved purpose; confirm one outcome/workflow and reconcile against the canonical AIG-INV-03 source."],
      ["AIG-INV-05 Capabilities and System Map / Use cases", "Service / workflow", profile.serviceArea || "", "Confirm the service/workflow with its owner."],
      ["AIG-INV-05 Capabilities and System Map / Use cases", "Service Owner", profile.serviceOwner || "", "Confirm accountable owner and their authority to validate this map entry."],
      ["AIG-INV-05 Capabilities and System Map / Use cases", "Canonical AIG-INV-03 / source ref", "", "Add an exact source artefact and row/URI; do not copy source records."],
      ["AIG-INV-05 Capabilities and System Map / Use cases", "AIR-ID (only if issued)", profile.registerId || "", profile.registerId ? "Verify the existing permanent AIR-ID against current AIG-INV-04; do not replace or mint it." : "Blank is valid at this proposal stage; only add an official AIR-ID after one is issued and verified in AIG-INV-04."],
      ["AIG-INV-05 Capabilities and System Map / Use cases", "Confidence / verified on / state", "Unknown / blank / Proposed", "Do not mark Confirmed without source-reconciled endpoints, named owner, source, High/Medium confidence and verification date."],
      ["AIG-INV-05 Capabilities and System Map / Capabilities", "CAP-ID", "", "Propose only under approved catalogue and ID rules; this tool never issues identifiers."],
      ["AIG-INV-05 Capabilities and System Map / Capabilities", "Function (verb + noun)", profile.capability || "", "Triage classification is only a starting point; rewrite as an atomic reusable function and confirm inputs, outputs, boundary, owner and source."],
      ["AIG-INV-05 Capabilities and System Map / Capabilities", "Inputs / outputs / boundary", "", "Capability owner and service specialist define and verify these; do not infer them from the intake category."],
      ["AIG-INV-05 Capabilities and System Map / Relationships", "Edge ID", "", "Map owner assigns an ID under the approved map rules; this tool never issues one."],
      ["AIG-INV-05 Capabilities and System Map / Relationships", "From type / ID → relationship → To type / ID", "UC / blank → requires → CAP / blank", "Proposed UC → CAP relationship only. UC/CAP IDs remain proposals; no official AIR-ID is needed for this edge."],
      ["AIG-INV-05 Capabilities and System Map / Relationships", "AIR context", "", "Leave blank for UC → CAP. Other relationships require an existing official AIR-ID reconciled to the current AIG-INV-04 record."],
      ["AIG-INV-05 Capabilities and System Map / Relationships", "Meaning / Link owner / source / confidence / verified on / state", "Use case may require the proposed capability / owner and source to confirm / Unknown / blank / Proposed", "Do not mark Confirmed until both endpoints are source-reconciled with owner, evidence, High/Medium confidence and verification date."],
      ["AIG-INV-05 Capabilities and System Map / System map", "System entry", "", "Do not create a system-map row without an existing official AIR-ID. AIG-INV-04 remains authoritative for AIR-ID, purpose, Service Owner and current status."],
      ["AIG-INV-05 Capabilities and System Map / All sheets", "Authority and record boundaries", "Proposed controlled AIG-INV-05; draft only", "If adopted, the map is controlled/versioned; it remains a relationship catalogue, not a second Register. Map links grant no access, permission, approval or decision right. AIG-DEC-04 remains separate for plans, dated events and event-linked conditions; AIG-AGT-04 is authoritative for agent scope and AIG-AGT-05 is a derived delegation view."],
    ];
    return { headers, rows };
  }

  function triggerTextFor(ids) {
    const selected = new Set(ids || []);
    return TRIGGERS.filter((trigger) => selected.has(trigger.id)).map(
      (trigger) => trigger.text,
    );
  }

  function csvEscape(value) {
    const text = value == null ? "" : String(value);
    const safeText = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
    return `"${safeText.replace(/"/g, '""')}"`;
  }

  function toCsv(headers, rows) {
    const lines = [
      headers.map(csvEscape).join(","),
      ...rows.map((row) => row.map(csvEscape).join(",")),
    ];
    return `\uFEFF${lines.join("\r\n")}\r\n`;
  }

  function buildGatePlanCsv(profile, route) {
    const headers = [
      "Handoff target: AIG-DEC-04 Gate Plan / AIG-DEC-01 Gate Map context",
      "Draft plan: AIR-ID reference (verify in AIG-INV-04)",
      "System / Model Name (verify)",
      "Suggested gate order",
      "Prospective requirement",
      "Decision question for the authorised forum (not a decision)",
      "Proposed forum (confirm authority)",
      "Evidence / screening prompts",
      "Plan status (proposal only; not an event, condition or approval)",
      "Handoff note",
    ];
    const rows = route.map((gate) => [
      "AIG-DEC-04 Gate Plan; AIG-DEC-01 Gate Map is routing context only",
      profile.registerId || "",
      profile.systemName || "",
      gate.sequence,
      gate.requirement,
      gate.decision,
      gate.forum,
      gate.evidence.join("; "),
      `Draft only — ${gate.status}`,
      gate.handoff,
    ]);
    return toCsv(headers, rows);
  }

  function buildDecisionReadyHandoff(calculation) {
    const { profile, results, route } = calculation;
    const escalation = results.triggerIds.length
      ? triggerTextFor(results.triggerIds).join("; ")
      : "none selected";
    const headers = [
      "Export status",
      "AIG-DEC-02 field reference",
      "AIR-ID (verify existing Council-issued system identity in AIG-INV-04; do not create)",
      "System",
      "Forum",
      "Gate",
      "Prepared by (owner to complete)",
      "Preparation / assessment date (actual date; do not use export date)",
      "Decision question for this forum (not an attained decision)",
      "AGPI Priority",
      "Risk tier",
      "Escalation",
      "Assurance route",
      "Recommendation",
      "Bearing on your decision",
      "Conditions proposed",
      "Full evidence references (owner to complete)",
    ];
    const rows = route.map((gate) => [
      "Draft triage prompt — review and complete in AIG-DEC-02; not an import-ready record",
      "Template field prompt — exact controlled field contract not verified",
      profile.registerId || "",
      profile.systemName || "",
      gate.forum,
      `${gate.sequence} of ${route.length}`,
      "",
      "",
      gate.decision,
      results.effectiveGovernancePriority || results.priority.label,
      results.effectiveTierName,
      escalation,
      results.assuranceIntensity,
      "",
      "",
      "",
      "",
    ]);
    return toCsv(headers, rows);
  }

  function buildCanonicalRecord(calculation, rawAgentic, assessment, exportedAt) {
    const profile = {
      ...calculation.profile,
      dateFirstUsed: (() => {
        const value = calculation.profile.dateFirstUsed || "";
        const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
        return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
      })(),
    };
    const raw = rawAgentic || {
      dimensions: {},
      multipliers: [],
      capabilities: [],
      killSwitch: false,
      rollback: false,
      boundariesTested: false,
      worstChain: "",
      dimensionNotes: {},
      asbomRef: "",
    };
    return {
      schemaVersion: "1.0",
      suiteVersion: "Proposed integrated AI governance suite draft — not approved",
      exportedAt: exportedAt || new Date().toISOString(),
      profile,
      agpi: {
        dimensionScores: { ...calculation.agpiScores },
        score: calculation.results.agpiScore,
        rawPriority: calculation.results.rawAgpiPriority || calculation.results.priority.label,
        effectiveGovernancePriority:
          calculation.results.effectiveGovernancePriority || calculation.results.priority.label,
        authorisedPriorityUplift: null,
      },
      risk: {
        impactScores: { ...calculation.impactScores },
        likelihood: calculation.results.risk.likelihood,
        controlEffectiveness: calculation.results.risk.control,
        impact: calculation.results.risk.impact,
        inherentRisk: calculation.results.risk.inherent,
        inherentRiskTier: calculation.results.inherentTierName,
        residualRisk: calculation.results.risk.residual,
        residualRiskTier: calculation.results.residualTierName,
        effectiveGovernanceTier: calculation.results.effectiveTierName,
        tierFloored: calculation.results.tierFloored,
        floorReason: calculation.results.floorReason || "",
        assuranceIntensity: calculation.results.assuranceIntensity,
      },
      mandatoryTriggers: TRIGGERS.map((trigger) => ({
        id: trigger.id,
        text: trigger.text,
        selected: calculation.results.triggerIds.includes(trigger.id),
      })),
      governance: {
        status: calculation.results.governanceStatus,
        forums: { ...calculation.forums },
        plannedRoute: calculation.route.map((gate) => ({ ...gate })),
        requiredEvidence: calculation.evidence.slice(),
      },
      specialistRouting: assessmentRequirements(profile, calculation.results),
      agentic: {
        rawInput: {
          dimensions: { ...raw.dimensions },
          multipliers: raw.multipliers.slice(),
          capabilities: raw.capabilities.slice(),
          killSwitch: raw.killSwitch,
          rollback: raw.rollback,
          boundariesTested: raw.boundariesTested,
          worstChain: raw.worstChain,
          dimensionNotes: { ...raw.dimensionNotes },
          asbomRef: raw.asbomRef,
        },
        assessment: assessment ? { ...assessment } : null,
      },
      authorityBoundary: {
        note: "This triage record is decision support. It does not evidence gate approval, specialist sign-off, monitoring results or an approved agent mandate.",
      },
    };
  }

  // Fields the proposed AIG-INV-04 AI Register does not hold are routed to the
  // artefact whose form owns them. Returns prompts, not import-ready records;
  // approval and any event-linked conditions remain with their formal owners.
  function buildArtefactHandoff(profile, results) {
    const requirements = assessmentRequirements(profile, results);
    const yn = (v) => (v === "Yes" ? "Yes" : v === "No" ? "No" : "Not stated");
    const items = [];

    const triggered = results.triggerIds.length > 0;
    items.push({
      artefact: "AIG-ASS-02 AI Risk Assessment Worksheet",
      section: "Step 4 \u2014 Mandatory escalation triggers",
      fields: [
        { label: "Escalation triggered?", value: triggered ? "Yes" : "No" },
        {
          label: "Triggers present",
          value: triggered
            ? triggerTextFor(results.triggerIds).join("; ")
            : "None",
        },
      ],
      note: "Answer each trigger in Step 4; a Yes sets the minimum High or Critical pathway.",
    });

    if (isAgentSystem(profile, results)) {
      items.push({
        artefact: "AIG-AGT-03 Agentic Triage + AIG-AGT-04 Agent Record (ASBOM)",
        section: "Can-it-act gate, agency profile and authority envelope",
        fields: [
          { label: "Can it act (is an agent)?", value: "Yes" },
          { label: "Agentic triage required?", value: "Yes — complete before routing" },
        ],
        note: "Run AIG-AGT-03 Agentic Triage: score the five agency dimensions, set the autonomy level and agency tier, test the authority boundary and kill-switch, and open the AIG-AGT-04 Agent Record / ASBOM. The Register carries Is Agent, autonomy and agency tier; the ASBOM holds the full composition and AIG-AGT-05 Authority Graph derives from it. Consequential actions in service are recorded in AIG-AGT-06.",
      });
      items.push({
        artefact: "AIG-AGT-05 Agent Authority Graph",
        section: "Authority graph derived from AIG-AGT-04 ASBOM",
        fields: [
          { label: "Agent / AIR-ID reference", value: profile.registerId || "Pending current AIG-INV-04 AIR-ID and AIG-AGT-04 ASBOM reference" },
          { label: "Authority edge / delegation", value: "Not supplied — authorised owner to verify in ASBOM and delegation record" },
          { label: "Authority granted by this triage", value: "No" },
        ],
        note: "AIG-AGT-05 is a derived view, not a grant of authority. Verify every edge, constraint and revocation path against the current AIG-AGT-04 ASBOM and formal delegated authority.",
      });
      items.push({
        artefact: "AIG-OPS-02 AI Post-Deployment Monitoring and Review Log",
        section: "Agentic runtime monitoring prompts",
        fields: [
          { label: "AIR-ID / system reference", value: profile.registerId || "Pending current AIG-INV-04 AIR-ID" },
          { label: "Monitoring status / evidence", value: "Not supplied — owner, approved thresholds and evidence reference pending" },
        ],
        note: "Monitoring proposals only; do not create an AIG-OPS-02 result, owner, threshold or evidence claim from triage.",
      });
      items.push({
        artefact: "AIG-AGT-06 Agentic Action / Decision Record",
        section: "Consequential action record prompt",
        fields: [
          { label: "Action / decision evidence reference", value: "Not supplied — record consequential actions in AIG-AGT-06 when operated" },
          { label: "Authority granted by this triage", value: "No" },
        ],
        note: "No action record, decision or authority is created by this handoff. Link actual action records to verified agent / ASBOM identity and authorised boundaries.",
      });
    }

    items.push({
      artefact: "AIG-ASS-05 Data Protection Impact Assessment",
      section: "Section 2 \u2014 Screening (is a DPIA required?)",
      fields: [
        { label: "Materially affects individuals?", value: yn(profile.affectsIndividuals) },
        { label: "Public / resident facing?", value: yn(profile.publicFacing) },
      ],
      note: `${requirements.dpia}. A DPO/privacy owner determines case-specific legal requirements and records any assessment outcome; this tool does not establish applicability or completion.`,
    });

    items.push({
        artefact: "AIG-ASS-06 Equality Impact Assessment",
        section: "Section 2 \u2014 Equality Act 2010 section 149 screening (all tiers)",
        fields: [
          { label: "Public / resident facing?", value: yn(profile.publicFacing) },
          { label: "Materially affects individuals?", value: yn(profile.affectsIndividuals) },
        ],
        note: `${requirements.eia}. Screen every system; an equality owner determines whether a fuller assessment is needed. AGPI does not waive the public sector equality duty.`,
      });

    items.push({
        artefact: "AIG-ASS-07 Human Rights Assessment",
        section: "Section 3 \u2014 Human Rights Act 1998 section 6 screening (all tiers)",
        fields: [
          { label: "Materially affects individuals?", value: yn(profile.affectsIndividuals) },
        ],
        note: "Screen every system; the legal owner confirms whether Convention rights are engaged, the lawful basis and any full assessment. Triage is not a legal conclusion and AGPI does not waive section 6 duties.",
      });

    if (
      profile.publicFacing === "Yes" ||
      profile.affectsIndividuals === "Yes" ||
      results.triggerIds.includes("statutory")
    ) {
      items.push({
        artefact: "AIG-OPS-04 AI Contestability and Redress Control",
        section: "Resident challenge route",
        fields: [
          { label: "Public / resident facing?", value: yn(profile.publicFacing) },
          { label: "Materially affects individuals?", value: yn(profile.affectsIndividuals) },
          { label: "Informs a statutory decision?", value: results.triggerIds.includes("statutory") ? "Yes" : "No" },
        ],
        note: "Resident-facing or decision-influencing AI: ensure the AIG-OPS-04 challenge route \u2014 plain-language \u2018ask us to look again\u2019, a fresh independent human review with authority to change the decision, and redress \u2014 is in place, with the LGSCO as the external escalation.",
      });
    }

    const atrsAgentic = results.triggerIds.includes("agentic");
    const atrsAssessments = [
      requirements.dpia.startsWith("Potential DPIA") ? "Potential DPIA — DPO confirmation" : null,
      requirements.eia.startsWith("Potential full assessment") ? "Potential equality impact assessment — specialist confirmation" : null,
      requirements.humanRightsPotential ? "Human Rights Assessment" : null,
    ].filter(Boolean);
    items.push({
      artefact: "AIG-ASS-10 ATRS Record",
      section: "Tier 1 Summary + Section 6 \u2014 Risks, Mitigations and Impact Assessments",
      fields: [
        { label: "ATRS intake indication (not applicability decision)", value: requirements.atrs },
        { label: "Public / resident facing?", value: yn(profile.publicFacing) },
        {
          label: "Potential impact assessment prompts (Section 6; confirm)",
          value: atrsAssessments.length ? atrsAssessments.join(", ") : "Owner screening pending — no applicability conclusion",
        },
        {
          label: "Human oversight to describe (Section 4)",
          value: atrsAgentic ? "Yes \u2014 agentic trigger fired" : "Standard",
        },
        { label: "Applicability owner", value: "Case-specific/legal owner — pending" },
        { label: "Evidence reference", value: "Pending — no evidence reference supplied" },
        { label: "Screening status", value: "Not completed — owner applicability confirmation pending" },
      ],
      note: `${requirements.atrs}. Applicability owner: pending. Evidence reference: pending. Status: screening not completed. The case-specific/legal owner confirms whether ATRS applies, any publication duty and timing; do not record legal N/A from an unselected intake response.`,
    });

    const procurement = commercialRequired(profile);
    items.push({
      artefact: "AIG-ASS-08 Supplier AI Due Diligence Questionnaire",
      section: "Procurement / contracting",
      fields: [
        { label: "Procurement route indicated by intake?", value: procurement ? "Potential route — confirm" : "Not indicated — confirm" },
      ],
      note: procurement
        ? "Potential route only; commercial owner confirms whether procurement and a delegated commercial decision are required."
        : "No route indicated by intake; commercial owner confirms case-specific need before N/A is recorded.",
    });

    const screeningPrompts = [
      ["AIG-ASS-05 Data Protection Impact Assessment", requirements.dpia, "DPO / privacy owner"],
      ["AIG-ASS-06 Equality Impact Assessment", requirements.eia, "Equality owner"],
      ["AIG-ASS-07 Human Rights Assessment", requirements.humanRights, "Legal owner"],
    ];
    screeningPrompts.forEach(([artefact, indication, owner]) => {
      const existing = items.find((item) => item.artefact === artefact);
      if (!existing) return;
      existing.fields.push(
        { label: "Applicability owner", value: `${owner} — pending` },
        { label: "Evidence reference", value: "Pending — no evidence reference supplied" },
        { label: "Screening status", value: `Not completed — ${indication}` },
      );
      existing.note += " Owner applicability and evidence reference remain pending; an unselected or unanswered intake response is not legal N/A.";
    });

    items.push({
      artefact: "AIG-DEC-02 Decision-Ready Paper",
      section: "Triage headline",
      fields: [
        { label: "Governance priority", value: results.priority.label },
        { label: "Effective risk tier", value: results.effectiveTierName },
        { label: "Assurance route", value: results.assuranceIntensity },
        { label: "Escalation triggers", value: results.triggerIds.length ? (results.triggerIds.length + " fired") : "None" },
      ],
      note: "The triage result populates the paper's headline. The assurance function compiles the one-page paper the forum reads to decide.",
    });

    items.push({
      artefact: "AIG-DEC-03 Governance Decision Record + separate AIG-INV-04 and AIG-DEC-04 workbook drafts",
      section: "Formal decision and linked gate records",
      fields: [
        { label: "Decision-maker / date", value: "Not supplied — authorised forum records in AIG-DEC-03 or approved native minutes" },
        { label: "AIG-INV-04 / AIG-DEC-04 relationship", value: "AIG-INV-04 keeps the permanent AIR-ID and current assurance; AIG-DEC-04 separates prospective Gate Plans, dated Gate Events and event-linked Gate Conditions." },
      ],
      note: "Handoff only: this export does not create an AIR-ID, plan/event/condition row, approval, decision record, event ID or evidence. Verify against the applicable current Council-controlled workbook and authorised process; the proposed suite remains a draft.",
    });

    return items;
  }

  function buildHandoffCsv(profile, results) {
    const items = buildArtefactHandoff(profile, results);
    const headers = [
      "AIR-ID",
      "System / Model Name",
      "Artefact",
      "Suggested destination",
      "Triage prompt (not a controlled field)",
      "Triage value / indication",
      "Note",
    ];
    const rows = [];
    items.forEach((item) => {
      item.fields.forEach((f) => {
        rows.push([
          profile.registerId || "",
          profile.systemName || "",
          item.artefact,
          item.section,
          f.label,
          f.value,
          item.note,
        ]);
      });
    });
    return toCsv(headers, rows);
  }

  // ---- Retirement / decommission gate ---------------------------------
  // Retirement is a post-deployment gate EVENT, not a triage. It does not use
  // AGPI or the forward deployment route. The question set is scaled by the
  // system's CURRENT governance priority (read from the Register), so a routine
  // tool is a short formality and a critical resident-facing system gets the
  // full decommission gate. showAtOrAbove is the least-critical priority NUMBER
  // at which a field first appears: a field shows when priorityLevel <= it.
  const RETIREMENT_PRIORITIES = [
    { level: 1, label: "Priority 1 - Critical" },
    { level: 2, label: "Priority 2 - High" },
    { level: 3, label: "Priority 3 - Standard" },
    { level: 4, label: "Priority 4 - Routine" },
    { level: 5, label: "Priority 5 - Observe" },
  ];

  const RETIREMENT_REASONS = [
    "Replaced by a successor system",
    "No longer needed",
    "No longer fit for purpose",
    "Retired on risk or harm grounds",
    "Supplier withdrawal or end of support",
    "End of contract",
    "Other (state in rationale)",
  ];

  const RETIREMENT_FIELDS = [
    { id: "reason", group: "Decision", showAtOrAbove: 5, type: "select", label: "Reason for retirement", options: RETIREMENT_REASONS },
    { id: "rationale", group: "Decision", showAtOrAbove: 5, type: "textarea", label: "Rationale (why retire, options considered)" },
    { id: "monitoringRef", group: "Decision", showAtOrAbove: 5, type: "text", label: "Prompted by a monitoring finding? Ref in the Post-Deployment Monitoring Log (AIG-OPS-02), if any", placeholder: "AIG-OPS-02 row / review ref" },
    { id: "hasSuccessor", group: "Decision", showAtOrAbove: 5, type: "select", label: "Replacement or successor system?", options: ["No", "Yes"] },
    { id: "successorId", group: "Decision", showAtOrAbove: 5, type: "text", label: "Successor AIR-ID (if any)", placeholder: "AIR-XXXX" },
    { id: "decommissionDate", group: "Decision", showAtOrAbove: 5, type: "date", label: "Planned decommission date" },

    { id: "dataDisposition", group: "Data and access", showAtOrAbove: 5, type: "select", label: "Data and logs disposition", options: ["Retain in place", "Archive", "Dispose / delete", "Return to supplier or data subject"] },
    { id: "dataBasis", group: "Data and access", showAtOrAbove: 5, type: "text", label: "Retention or disposal basis", placeholder: "Statute, policy or contract reference" },
    { id: "accessTeardown", group: "Data and access", showAtOrAbove: 5, type: "select", label: "Accounts, API keys and agentic action scopes revoked?", options: ["Not yet", "Scheduled", "Confirmed revoked"] },

    { id: "dependencies", group: "Continuity", showAtOrAbove: 3, type: "textarea", label: "Downstream dependencies (what consumes its outputs)" },
    { id: "fallback", group: "Continuity", showAtOrAbove: 3, type: "select", label: "Fallback or transition arrangement before switch-off?", options: ["Not needed", "Planned", "Confirmed in place"] },
    { id: "affectedStaff", group: "Continuity", showAtOrAbove: 3, type: "textarea", label: "Affected staff: process change or retraining" },
    { id: "monitoringClosure", group: "Continuity", showAtOrAbove: 3, type: "select", label: "Post-Deployment Monitoring Log (AIG-OPS-02) closure", options: ["Not applicable - no active monitoring", "To be closed", "Closed"] },

    { id: "atrsAction", group: "Records and accountability", showAtOrAbove: 2, type: "select", label: "ATRS record action", options: ["No ATRS record exists", "Withdraw", "Update / mark retired"] },
    { id: "residualOwner", group: "Records and accountability", showAtOrAbove: 2, type: "text", label: "Residual accountability owner (complaints, appeals, subject access, audit)" },
    { id: "residualDuration", group: "Records and accountability", showAtOrAbove: 2, type: "text", label: "For how long is that owner accountable?", placeholder: "e.g. 6 years" },
    { id: "recordsRetention", group: "Records and accountability", showAtOrAbove: 2, type: "text", label: "Records retention period for outputs it produced", placeholder: "Statutory / FOI / audit retention" },
    { id: "supplierExit", group: "Records and accountability", showAtOrAbove: 2, type: "select", label: "Supplier exit (contract closure, data return or destruction)", options: ["Not applicable", "In progress", "Completed"] },
    { id: "residentNotify", group: "Records and accountability", showAtOrAbove: 2, type: "select", label: "Resident or service-user notification required?", options: ["Not required", "Required: planned", "Required: completed"] },
    { id: "riskOfRetiring", group: "Records and accountability", showAtOrAbove: 2, type: "textarea", label: "Risk of retiring (gap, fallback)" },
    { id: "riskOfNotRetiring", group: "Records and accountability", showAtOrAbove: 2, type: "textarea", label: "Risk of not retiring" },

    { id: "boardDecision", group: "Decision authority", showAtOrAbove: 1, type: "select", label: "Decommission authorised by the relevant Council authority under confirmed delegation?", options: ["No", "Yes"] },
    { id: "conditionsClosed", group: "Critical assurance", showAtOrAbove: 1, type: "select", label: "All open conditions and incidents closed or formally transferred?", options: ["No", "Yes"] },
    { id: "postReview", group: "Critical assurance", showAtOrAbove: 1, type: "select", label: "Post-retirement / lessons-learned review scheduled?", options: ["No", "Yes: date recorded"] },
    { id: "notifyLive", group: "Critical assurance", showAtOrAbove: 1, type: "select", label: "Resident notification and appeal handling live before switch-off?", options: ["No", "Yes"] },

    { id: "planId", group: "Gate event record", showAtOrAbove: 5, type: "text", label: "Existing Gate Plan ID (verify in AIG-DEC-04; do not invent)", placeholder: "Existing plan ID only" },
    { id: "eventId", group: "Gate event record", showAtOrAbove: 5, type: "text", label: "Existing Event ID (verify in AIG-DEC-04; do not invent)", placeholder: "Existing event ID only" },
    { id: "forum", group: "Gate event record", showAtOrAbove: 5, type: "text", label: "Gate / forum" },
    { id: "decision", group: "Gate event record", showAtOrAbove: 5, type: "select", label: "Gate decision (Stop = decommission; Progress with condition = approve with conditions)", options: ["Pending: not yet decided", "Progress", "Progress with condition", "Return for evidence", "Pause", "Stop", "Noted", "Priority override", "Escalation raised"] },
    { id: "eventDate", group: "Gate event record", showAtOrAbove: 5, type: "date", label: "Date of decision (leave blank until decided)" },
    { id: "decisionMaker", group: "Gate event record", showAtOrAbove: 5, type: "text", label: "Decision-maker and role" },
    { id: "conditionDue", group: "Gate event record", showAtOrAbove: 3, type: "date", label: "Condition due date (if any)" },
    { id: "assuranceRef", group: "Gate event record", showAtOrAbove: 2, type: "text", label: "Assurance opinion reference" },
    { id: "evidenceRefs", group: "Gate event record", showAtOrAbove: 3, type: "text", label: "Evidence references (recorded in Notes)", placeholder: "Disposal record, ATRS update log, notification plan" },
    { id: "decisionRecordRef", group: "Gate event record", showAtOrAbove: 5, type: "text", label: "Existing AIG-DEC-03 / approved minutes reference (verify)", placeholder: "Existing authorised decision reference" },
    { id: "recordedBy", group: "Gate event record", showAtOrAbove: 5, type: "text", label: "Recorded by (recorded in Notes)" },
    { id: "airIdEvidenceRef", group: "Gate event record", showAtOrAbove: 5, type: "text", label: "AIR-ID evidence reference in AIG-INV-04", placeholder: "AIG-INV-04 record / source URI" },
    { id: "assuranceEvidenceRef", group: "Gate event record", showAtOrAbove: 5, type: "text", label: "Current 05 assurance-state evidence reference", placeholder: "Current 05 snapshot / source URI" },
    { id: "authorityEvidenceRef", group: "Gate event record", showAtOrAbove: 5, type: "text", label: "Decision authority / delegation evidence reference", placeholder: "Delegation record / source URI" },
  ];

  const RETIREMENT_GROUP_ORDER = [
    "Decision",
    "Data and access",
    "Continuity",
    "Records and accountability",
    "Critical assurance",
    "Gate event record",
  ];

  const RETIREMENT_HANDOFF_HEADERS = DRAFT_HANDOFF_HEADERS.slice();

  function retLevelFor(label) {
    const found = RETIREMENT_PRIORITIES.find((p) => p.label === label);
    return found ? found.level : 1;
  }

  function retirementFieldsFor(level) {
    const n = Number(level) || 5;
    return RETIREMENT_FIELDS.filter((f) => n <= f.showAtOrAbove);
  }

  function retFmtDate(value) {
    if (!value) return "";
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    return m ? `${m[3]}/${m[2]}/${m[1]}` : value;
  }

  function retirementConditions(ret) {
    const c = [];
    if (ret.decommissionDate) c.push(`Decommission on ${retFmtDate(ret.decommissionDate)}.`);
    if (ret.dataDisposition) {
      c.push(
        `Data and logs: ${ret.dataDisposition.toLowerCase()}` +
          (ret.dataBasis ? ` (basis: ${ret.dataBasis}).` : "."),
      );
    }
    if (ret.accessTeardown && ret.accessTeardown !== "Confirmed revoked") {
      c.push("Confirm accounts, API keys and agentic action scopes are revoked at switch-off.");
    }
    if (ret.fallback === "Planned") c.push("Confirm the fallback or transition arrangement is in place before switch-off.");
    if (ret.monitoringClosure === "To be closed") c.push("Close the Post-Deployment Monitoring Log (AIG-OPS-02): set Review Status to closed and cancel any scheduled reviews.");
    if (ret.supplierExit === "In progress") c.push("Complete supplier contract closure and data return or destruction.");
    if (ret.atrsAction === "Withdraw") c.push("Withdraw the ATRS record.");
    if (ret.atrsAction === "Update / mark retired") c.push("Update the ATRS record to retired.");
    if (ret.residentNotify === "Required: planned") c.push("Complete resident or service-user notification before switch-off.");
    if (ret.residualOwner) {
      c.push(
        `Residual accountability (complaints, appeals, subject access, audit): ${ret.residualOwner}` +
          (ret.residualDuration ? ` for ${ret.residualDuration}.` : "."),
      );
    }
    if (ret.recordsRetention) c.push(`Retain records the system produced: ${ret.recordsRetention}.`);
    if (ret.postReview === "Yes: date recorded") c.push("Hold the scheduled post-retirement / lessons-learned review.");
    return c;
  }

  function retirementDecided(ret) {
    return !!ret.decision && ret.decision !== "Pending: not yet decided";
  }

  function retirementReadiness(ret) {
    const level = Number(ret.priorityLevel) || 1;
    const decided = retirementDecided(ret);
    const outstanding = [];
    if (!ret.priorityLabel) outstanding.push("Current AIG-INV-04 governance priority not verified; full-depth prompts are shown until it is.");
    if (!ret.tier) outstanding.push("Current AIG-INV-04 assurance/risk tier not verified.");
    if (!ret.registerId) outstanding.push("Existing Council-issued AIR-ID not recorded.");
    if (!ret.airIdEvidenceRef) outstanding.push("AIR-ID evidence from the current AIG-INV-04 record is missing.");
    if (!ret.assuranceEvidenceRef) outstanding.push("Current AIG-INV-04 assurance-state evidence is missing.");
    if (!ret.authorityEvidenceRef) outstanding.push("Decision authority / delegation evidence is missing; self-report is not evidence of authority.");
    if (!ret.planId) outstanding.push("Existing Gate Plan ID not recorded or verified.");
    if (!ret.eventId) outstanding.push("Existing Gate Event ID not recorded or verified.");
    if (!ret.forum) outstanding.push("Deciding forum not recorded.");
    if (!ret.decisionMaker) outstanding.push("Decision-maker / role not recorded.");
    if (!ret.decisionRecordRef) outstanding.push("AIG-DEC-03 / approved native minutes reference not recorded.");
    if (!decided) outstanding.push("Gate decision not yet recorded.");
    if (decided && !ret.eventDate) outstanding.push("Date of decision not set.");
    if (!ret.decommissionDate) outstanding.push("Planned decommission date not set.");
    if (ret.accessTeardown !== "Confirmed revoked") outstanding.push("Access, keys and action scopes not yet confirmed revoked.");
    if (ret.dataDisposition && !ret.dataBasis) outstanding.push("Data retention or disposal basis not stated.");
    if (level <= 3 && ret.fallback === "Planned") outstanding.push("Fallback arrangement planned but not confirmed in place.");
    if (level <= 3 && ret.monitoringClosure === "To be closed") outstanding.push("Post-Deployment Monitoring Log (AIG-OPS-02) not yet closed.");
    if (level <= 2) {
      if (!ret.residualOwner) outstanding.push("Residual accountability owner not named.");
      if (ret.residentNotify === "Required: planned") outstanding.push("Required resident notification not yet completed.");
      if (ret.supplierExit === "In progress") outstanding.push("Supplier exit (data return or destruction) not yet completed.");
    }
    if (level <= 1) {
      if (ret.boardDecision !== "Yes") outstanding.push("Delegated Council decommission decision not confirmed.");
      if (ret.conditionsClosed !== "Yes") outstanding.push("Open conditions or incidents not closed or transferred.");
      if (ret.notifyLive !== "Yes") outstanding.push("Resident notification and appeal handling not confirmed live before switch-off.");
    }
    // Checklist answers and references are self-reported prompts, not verified
    // evidence or authorised decisions; the application cannot assert readiness.
    const complete = false;
    return {
      complete,
      outstanding,
      status: "Review outstanding — unverified self-report; authority/evidence review required",
    };
  }

  function retirementNextGate(ret) {
    if (ret.hasSuccessor === "Yes") {
      const id = ret.successorId ? ret.successorId : "successor (ID not recorded)";
      return `None for this system - lifecycle end. ${id} requires its own intake triage.`;
    }
    return "None - lifecycle end.";
  }

  function buildRetirementGateLogRow(ret) {
    const readiness = retirementReadiness(ret);
    const decided = retirementDecided(ret);
    const conditions = retirementConditions(ret);
    const rows = [];
    const add = (sheet, field, value, review) => {
      const target = sheet === "AI Register" || sheet === "Assessment summary"
        ? sheet
        : `AIG-DEC-04 / ${sheet}`;
      rows.push([
        target,
        field,
        fieldReferenceType(target, field),
        value || "",
        value == null || String(value).trim() === ""
          ? "No value asserted — evidence/owner review pending"
          : "User-entered proposal — pending verification; never an attained status",
        review,
      ]);
    };
    const identityReview = ret.registerId
      ? "Verify this is the existing Council-issued AIR-ID in AIG-INV-04; do not create or replace it."
      : "Look up the existing Council-issued AIR-ID in AIG-INV-04; this tool does not create one.";

    const plan = "Gate Plan (prospective)";
    add(plan, "AIR-ID", ret.registerId, identityReview);
    add(plan, "Plan ID", ret.planId, "Never generated here; verify against the existing AIG-DEC-04 Gate Plan.");
    add(plan, "Gate/forum", ret.forum, "Proposed route only; confirm the authorised forum and delegation.");
    add(plan, "Trigger/lifecycle", "Retirement / decommission review", "Prospective plan prompt; not an event.");
    add(plan, "Requirement", "Review whether retirement should be authorised", "A question for the authorised forum; not an attained decision.");
    add(plan, "Basis/triage ref", ret.monitoringRef, "Provide verified AIG-OPS-02 / triage source reference; user-entered pointer only.");
    add(plan, "Target date", ret.decommissionDate, "Proposed target only; not an actual decision or decommission date.");
    add(plan, "Responsible role", "", "Accountable role to be supplied and verified; no assignment or delegation is made.");
    add(plan, "Plan state", "Draft proposal — owner review pending", "Never treated as an actual Gate Event or completed status.");
    add(plan, "waiver rationale+authority", "", "No waiver proposed or authorised by this handoff.");
    add(plan, "Source version", "Review against current AIG-INV-04/AIG-DEC-04 version", "Record actual controlled source version before transfer.");
    add(plan, "Plan QA", "Pending", "Complete QA in the proposed AIG-DEC-04 workbook.");

    const event = "Gate Events (dated; proposed handoff, not an actual event)";
    add(event, "Event ID", ret.eventId, "Never generated here; verify against the current Gate Events sheet before linking.");
    add(event, "AIR-ID", ret.registerId, identityReview);
    add(event, "Gate/forum", ret.forum, "Verify actual forum and delegated authority.");
    add(event, "Lifecycle stage at event", "Retirement / decommission (proposed)", "Verify actual lifecycle stage when an authorised event occurs.");
    add(event, "Decision date", decided ? retFmtDate(ret.eventDate) : "", "User-entered proposal only; actual date belongs to the authoritative event.");
    add(event, "Decision", decided ? ret.decision : "", "User-entered proposal, not an approved decision or live event.");
    add(event, "Assurance opinion ref", ret.assuranceRef, "Verify actual versioned assurance opinion; blank means evidence pending.");
    add(event, "Decision-maker/role", ret.decisionMaker, "Verify current authority and record actual decision in AIG-DEC-03 / approved native minutes.");
    add(event, "Next gate", "Pending authorised forum", "Forum to set; not inferred from triage.");
    add(event, "Event notes", ret.rationale, "Proposal context only; not a record of an event that occurred.");
    add(event, "Decision record/minutes ref", ret.decisionRecordRef, "Reference only; verify against authoritative decision record.");
    add(event, "Technical snapshot/as-at ref", "", "Capture actual system state and as-at evidence at the event.");
    add(event, "Event record state", "Not recorded — actual event not verified", "Do not mark as actual/complete based on this draft.");
    add(event, "Recorded by/role", ret.recordedBy, "User-entered prompt only; verify actual recorder/role.");
    add(event, "Evidence source/URI", ret.evidenceRefs, "Verify each source and URI; blank means event evidence is pending.");
    add(event, "Event QA", "Pending", "Complete QA in proposed AIG-DEC-04 after authoritative record entry.");
    add(event, "Plan ID", ret.planId, "Optional join; verify this existing plan belongs to this AIR-ID and gate.");
    add(event, "priority override fields", "", "No override proposed; use controlled override process and authority if applicable.");
    add("AI Register", "AIR-ID", ret.registerId, identityReview);
    add("AI Register", "Operational status", "", `Current status is not changed by this checklist (${readiness.status}). Verify and update through the controlled process.`);
    add("Assessment summary", "As-at date", "", "Update only when the authorised owner verifies the actual AIG-INV-04 assessment summary.");
    add("AI Register", "Assessment / evidence ref", ret.airIdEvidenceRef, "Source pointer only; verify the permanent AIR-ID against AIG-INV-04.");
    add("Assessment summary", "AIG-ASS-02 ref / date", ret.assuranceEvidenceRef, "Source pointer only; verify current AIG-ASS-02 assessment and its actual date against AIG-INV-04; not an approval.");
    add("Assessment summary", "AIG-OPS-02 Monitoring ref", "", "Only enter an existing verified AIG-OPS-02 monitoring record reference.");
    add("AI Register", "Decision record ref", "", "Only enter a reference to the actual authorised AIG-DEC-03 / approved native decision record.");
    add("Assessment summary", "Other specialist finding refs", ret.authorityEvidenceRef, "Authority evidence pointer only; verify the actual delegation record and current decision-maker authority.");
    if (conditions.length) {
      conditions.forEach((condition) => {
        const target = "AIG-DEC-04 / Gate Conditions (event-linked; proposed action only)";
        add(target, "Condition ID", "", "Never generated here; controlled owner assigns only after an actual event.");
        add(target, "Event ID", ret.eventId, "Verify actual event exists before linking a condition.");
        add(target, "AIR-ID derived", ret.registerId, "Verify derived relationship in the controlled workbook.");
        add(target, "Condition/action", condition, "Suggested action only; authorised forum determines whether it is a condition.");
        add(target, "Action owner/role", "", "Accountable role to be supplied and confirmed by authorised forum.");
        add(target, "Due date", ret.conditionDue, "Proposed date only; confirm and record after formal decision.");
        add(target, "Condition state", "Not recorded — pending decision", "Do not infer an open or completed condition.");
        add(target, "Resolved/waived on", "", "No resolution or waiver asserted.");
        add(target, "Resolution evidence/waiver authority ref", "", "Evidence/authority pending; no resolution or waiver asserted.");
        add(target, "Overdue derived", "Derived by controlled workbook", "Do not calculate or manually assert overdue state.");
        add(target, "Condition QA", "Pending", "Complete QA in proposed AIG-DEC-04 after actual event-linked record.");
      });
    } else {
      const target = "AIG-DEC-04 / Gate Conditions (event-linked; proposed action only)";
      add(target, "Condition ID", "", "Never generated here; controlled owner assigns only after an actual event.");
      add(target, "Event ID", ret.eventId, "Verify actual event exists before linking a condition.");
      add(target, "AIR-ID derived", ret.registerId, "Verify derived relationship in the controlled workbook.");
      add(target, "Condition/action", "", "No condition supplied; authorised forum decides whether any are needed.");
      add(target, "Action owner/role", "", "No owner is assigned; authorised forum confirms if needed.");
      add(target, "Due date", "", "No date proposed; authorised forum confirms if needed.");
      add(target, "Condition state", "Not recorded — pending decision", "Do not infer an open or completed condition.");
      add(target, "Resolved/waived on", "", "No resolution or waiver asserted.");
      add(target, "Resolution evidence/waiver authority ref", "", "Evidence/authority pending; no resolution or waiver asserted.");
      add(target, "Overdue derived", "Derived by controlled workbook", "Do not calculate or manually assert overdue state.");
      add(target, "Condition QA", "Pending", "Complete QA in proposed AIG-DEC-04 after actual event-linked record.");
    }
    return { headers: RETIREMENT_HANDOFF_HEADERS.slice(), rows, readiness };
  }

  function retFormDecisionValue(ret) {
    // Map the gate decision onto AIG-DEC-03's controlled set:
    // Approved / Approved with conditions / Deferred / Rejected.
    if (!retirementDecided(ret)) return "Not entered — decision reserved to authorised forum";
    return `User-entered draft: ${ret.decision} (not verified or approved)`;
  }

  function buildRetirementDecisionRecord(ret) {
    const readiness = retirementReadiness(ret);
    const decided = retirementDecided(ret);
    const na = "(to complete at the meeting)";
    const line = (label, value) => `${(label + ":").padEnd(34)}${value}`;
    const tick = "[ ]";
    const decisionDate = decided ? (retFmtDate(ret.eventDate) || "(not set)") : "(pending)";
    const conditions = retirementConditions(ret);

    const rows = [];
    const push = (...xs) => xs.forEach((x) => rows.push(x));
    const heading = (t) => { rows.push(""); rows.push(t); rows.push("-".repeat(t.length)); };

    push(
      "DECISION-PAPER HANDOFF — NOT A FORMAL AIG-DEC-03 RECORD",
      "AIG-INV-04 Register and AIG-DEC-04 Gate Log workbook designs are proposed and unapproved; the authorised owner must verify the current process.",
      "Retirement / decommission — draft prompts only",
      "=====================================================================",
    );

    heading("1. Decision reference");
    push(
      line("Decision record ID", ret.decisionRecordRef || "(not supplied; use existing authorised record ref)"),
      line("System / model name", ret.systemName || "(not entered)"),
      line("AIR-ID", ret.registerId || "(no ID)"),
      line("AIR-ID evidence in AIG-INV-04", ret.airIdEvidenceRef || "(missing — verify against AIG-INV-04)"),
      line("Current AIG-INV-04 assurance-state evidence", ret.assuranceEvidenceRef || "(missing — verify current AIG-INV-04)"),
      line("Decision date", decisionDate),
      line("Decision-making body", ret.forum || "(not recorded)"),
      line("Risk classification", ret.tier || "(not set)"),
      line("Decision authority / delegation", ret.authorityEvidenceRef || "(missing — verify current delegated authority; self-report is insufficient)"),
      line("Meeting / written-decision ref", ret.decisionRecordRef || na),
    );

    heading("2. Decision");
    push(
      line("Decision", retFormDecisionValue(ret)),
      line("Gate decision (AIG-DEC-04)", decided ? ret.decision : "Pending: not yet decided"),
      "",
      "Summary of the decision and reasoning:",
    );
    const summary = [
      `Retire and decommission ${ret.systemName || "the system"}${ret.registerId ? " (" + ret.registerId + ")" : ""}.`,
      ret.reason ? `Reason: ${ret.reason}.` : "",
      ret.rationale ? `Rationale: ${ret.rationale}` : "",
      ret.monitoringRef ? `Prompted by monitoring finding ${ret.monitoringRef} (AIG-OPS-02).` : "",
      ret.hasSuccessor === "Yes"
        ? `Successor: ${ret.successorId || "named, ID not recorded"} — enters intake as its own system.`
        : "No successor system.",
    ].filter(Boolean);
    push("  " + summary.join(" "));

    heading("3. Assessment findings considered");
    push(
      "Assessments reviewed (confirm at the meeting):",
      `  ${tick} DPIA   ${tick} EIA   ${tick} Human Rights   ${tick} Responsible AI`,
      `  ${tick} Security review   ${tick} Legal review   ${tick} Model Card   ${tick} Other`,
      "",
      "Key findings that informed the decision:",
    );
    const findings = [
      ret.riskOfRetiring ? `Risk of retiring: ${ret.riskOfRetiring}` : "",
      ret.riskOfNotRetiring ? `Risk of not retiring: ${ret.riskOfNotRetiring}` : "",
      ret.dependencies ? `Downstream dependencies (what consumes its outputs): ${ret.dependencies}` : "",
      ret.affectedStaff ? `Affected staff (process change / retraining): ${ret.affectedStaff}` : "",
    ].filter(Boolean);
    if (findings.length) findings.forEach((f) => push("  - " + f));
    else push("  " + na);

    heading("4. Conditions, actions and review");
    push("Conditions of approval:");
    if (conditions.length) conditions.forEach((c, i) => push(`  ${i + 1}. ${c}`));
    else push("  None recorded.");
    push(
      "",
      line("Data and records", `${ret.dataDisposition || "(not stated)"}` +
        (ret.dataBasis ? ` (basis: ${ret.dataBasis})` : "") +
        (ret.recordsRetention ? `; retain outputs: ${ret.recordsRetention}` : "")),
      line("Residual accountability", ret.residualOwner
        ? `${ret.residualOwner}${ret.residualDuration ? " for " + ret.residualDuration : ""}`
        : na),
      line("Effective date / expiry", `Planned decommission ${retFmtDate(ret.decommissionDate) || "(not set)"}`),
      line("Review requirements", ret.postReview === "Yes: date recorded"
        ? "Post-retirement / lessons-learned review scheduled"
        : (ret.postReview || na)),
      line("Escalation requirements", na),
      line("Action closure status", "Not independently verified — no readiness or completion conclusion"),
      line("Conditions verified by / date", na),
    );

    heading("5. Authorisation");
    push(
      line("Recorded by", ret.recordedBy || "(not recorded; owner to complete with actual record date)"),
      line("Chair / approver", ret.decisionMaker || na),
      line("Signature", "____________________"),
      line("Date", decisionDate),
      line("Authority vs delegated limits", ret.authorityEvidenceRef
        ? `User-supplied reference ${ret.authorityEvidenceRef} — verify against current delegation`
        : "(missing — authorised owner to verify; no authority inferred)"),
      line("Quorum met", na),
      line("Attendees / voting members", na),
      line("Conflicts of interest", na),
      line("Evidence pack", ret.evidenceRefs || na),
      line("Dissent / challenge / abstention", na),
    );

    push(
      "",
      "---------------------------------------------------------------------",
      line("Register Status (not changed)", readiness.status),
      "This self-reported checklist provides no readiness or completion conclusion and does not establish switch-off authority.",
    );
    if (!readiness.complete && readiness.outstanding.length) {
      push("Outstanding before decommission:");
      readiness.outstanding.forEach((o) => push("  - " + o));
    }
    return `${rows.join("\n")}\n`;
  }

  const AGENCY_DIMENSIONS = [
    { id: "consequence", label: "Consequence", hint: "0 trivial to 5 catastrophic / irreversible" },
    { id: "autonomy", label: "Autonomy", hint: "0 no action to 5 open-ended / persistent" },
    { id: "authority", label: "Authority", hint: "0 information only to 5 highly consequential" },
    { id: "reach", label: "Reach", hint: "0 isolated to 5 broad / public / physical" },
    { id: "controllability", label: "Controllability (reversed)", hint: "0 instant stop + rollback to 5 effectively irreversible" },
  ];
  const AGENCY_MULTIPLIERS = ["Persistence","Memory","Delegation","Tool discovery","Credential access","Self-modification","Replication","Goal adaptation","External communication","Financial authority"];
  const CAPABILITY_VECTOR = ["Read","Write","Execute","Communicate","Purchase","Delegate","Persuade","Code","Discover","Persist","Replicate","Learn","Escalate"];
  const AGENCY_TIERS = ["T0 informational","T1 assisted","T2 bounded agent","T3 consequential agent","T4 high-agency","T5 exceptional / high-consequence"];
  const AGENCY_PATHWAYS = ["No further agentic review","Standard AI review","Agentic controls review","Agentic controls review (higher gate)","High-agency review","Executive and safety escalation"];
  const HIGH_IMPACT_MULTIPLIERS = ["Delegation","Tool discovery","Credential access","Self-modification","Replication"];
  function autonomyLabel(n) {
    const A = ["A0 advisory","A1 assisted","A2 bounded execution","A3 conditional autonomy","A4 delegated autonomy","A5 open-ended autonomy"];
    return A[Math.max(0, Math.min(5, n | 0))];
  }
  function agenticContextKey(profile, inputs) {
    return JSON.stringify({ profile: profile || {}, inputs: inputs || {} });
  }
  function currentAgenticAssessment(assessment, reviewedContextKey, profile, inputs) {
    if (!assessment || !reviewedContextKey) return null;
    return reviewedContextKey === agenticContextKey(profile, inputs) ? assessment : null;
  }
  function computeAgentic(input) {
    const d = (input && input.dimensions) || {};
    const g = (k) => Math.max(0, Math.min(5, Number(d[k] || 0)));
    const consequence = g("consequence"), autonomy = g("autonomy"), authority = g("authority"), reach = g("reach"), controllability = g("controllability");
    const mult = (input && input.multipliers) || [];
    const killSwitch = !!(input && input.killSwitch), rollback = !!(input && input.rollback), boundariesTested = !!(input && input.boundariesTested);
    let tier = Math.max(autonomy, authority);
    const esc = [];
    const floor = (n, why) => { if (n > tier) tier = n; if (n >= 3 && why) esc.push(why); };
    if (consequence >= 4 || controllability >= 4) floor(3, "High consequence or hard-to-contain action (high controllability score)");
    if (consequence === 5) floor(4, "Potentially catastrophic consequence");
    if (controllability === 5) floor(4, "Effectively irreversible");
    if (consequence >= 4 && controllability >= 4) floor(5, "Severe and hard to contain");
    if (reach === 5) floor(4, "Broad, public or physical reach");
    if (autonomy === 5) floor(4, "Open-ended autonomy");
    const bigMult = mult.filter((m) => HIGH_IMPACT_MULTIPLIERS.includes(m));
    if (bigMult.length) floor(4, "Agency multiplier(s): " + bigMult.join(", "));
    tier = Math.max(0, Math.min(5, tier));
    let deploymentControl;
    if (!killSwitch) deploymentControl = "Do not deploy \u2014 demonstrate stop and containment first; document rollback or a compensating action where relevant.";
    else if (tier >= 5) deploymentControl = "Do not deploy without executive and safety escalation.";
    else if (tier >= 4) deploymentControl = "Do not deploy without high-agency review.";
    else if (tier >= 2) deploymentControl = "Proceed to agentic controls review; production requires implemented and evidenced required runtime controls or expressly accepted effective, time-bounded compensation.";
    else deploymentControl = "Proceed to the delegated approval route; this triage does not authorise use.";
    const flags = [];
    if (!killSwitch) flags.push("Kill-switch not demonstrated");
    if (!rollback) flags.push("Rollback not confirmed; assess reversibility and compensating action where relevant");
    if (!boundariesTested) flags.push("Boundaries not tested");
    return {
      tierNum: tier, tierLabel: AGENCY_TIERS[tier], pathway: AGENCY_PATHWAYS[tier],
      autonomyLabel: autonomyLabel(autonomy), autonomy, consequence, authority, reach, controllability,
      escalations: esc, flags, deploymentControl,
      asbomRef: (input && input.asbomRef) || "",
      multipliers: mult,
      capabilities: (input && input.capabilities) || [],
      killSwitch,
      rollback,
      boundariesTested,
      worstChain: (input && input.worstChain) || "",
      dimensionNotes: (input && input.dimensionNotes) || {},
    };
  }

  return {
    DIMENSIONS,
    SCALE_LABELS,
    PRIORITIES,
    TRIGGERS,
    IMPACT_DIMENSIONS,
    TIERS,
    DEFAULT_FORUMS,
    DRAFT_HANDOFF_HEADERS,
    calculateAgpi,
    priorityFor,
    calculateRisk,
    commercialRequired,
    assuranceIntensity,
    assessmentRequirements,
    buildEvidenceList,
    buildRoute,
    buildRegisterDraftHandoff,
    buildCapabilitiesMapHandoff,
    fieldReferenceType,
    AGENCY_DIMENSIONS,
    AGENCY_MULTIPLIERS,
    CAPABILITY_VECTOR,
    AGENCY_TIERS,
    AGENCY_PATHWAYS,
    computeAgentic,
    autonomyLabel,
    agenticContextKey,
    currentAgenticAssessment,
    buildGatePlanCsv,
    buildDecisionReadyHandoff,
    buildCanonicalRecord,
    buildArtefactHandoff,
    buildHandoffCsv,
    triggerTextFor,
    toCsv,
    formatDate,
    RETIREMENT_PRIORITIES,
    RETIREMENT_FIELDS,
    RETIREMENT_GROUP_ORDER,
    RETIREMENT_HANDOFF_HEADERS,
    retLevelFor,
    retirementFieldsFor,
    retirementConditions,
    retirementReadiness,
    retirementNextGate,
    buildRetirementGateLogRow,
    buildRetirementDecisionRecord,
  };
});
