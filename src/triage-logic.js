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

  // Exports deliberately use a handoff schema, never an import-ready 05/36 row.
  const DRAFT_HANDOFF_HEADERS = [
    "Target artefact / sheet",
    "Suggested field",
    "Triage draft value",
    "Review, evidence or authority still required",
  ];

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
    const humanRights =
      results.effectiveTierName === "Critical" ||
      triggerSet.has("vulnerable") ||
      triggerSet.has("housingCare") ||
      triggerSet.has("statutory");
    const atrs =
      profile.publicFacing === "Yes" ||
      affectsPeople ||
      triggerSet.has("statutory")
        ? "Yes"
        : "No";
    const supplierDueDiligence = commercialRequired(profile);

    return {
      dpia,
      eia,
      humanRights,
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
    evidence.push("Data protection / DPIA screening outcome (all tiers)");
    if (requirements.dpia.startsWith("Potential DPIA")) {
      evidence.push("Potential DPIA — DPO confirms legal threshold and completion");
    }
    if (requirements.eia.startsWith("Potential full assessment")) {
      evidence.push("Equality impact assessment — indication for specialist confirmation");
    }
    if (requirements.humanRights) {
      evidence.push("Human rights assessment — potential engagement to confirm");
    }
    if (requirements.supplierDueDiligence) {
      evidence.push("Supplier AI Due Diligence Questionnaire");
    }
    if (requirements.atrs === "Yes") evidence.push("ATRS Record");
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
          ? "Confirm the purpose, owner, priority and continued strategic fit through retrospective intake."
          : "Ask whether the proposal is aligned, sufficiently defined and worth progressing; the authorised forum records its formal decision.",
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
          "Confirm that the design is feasible, secure, supportable and aligned to architecture and data standards.",
        evidence: [
          "Solution design and data flows",
          "Integrations and permissions",
          "Model or supplier information",
          "Security checklist",
          "Test approach and acceptance criteria",
        ],
        status: retrospective ? "Draft plan — retrospective baseline" : "Draft plan — proposed",
        handoff:
          "Propose any prospective gate requirements in 36 Gate Plan. Record a dated decision as a separate Gate Event and create each condition as an event-linked Gate Condition only after the authorised decision.",
      },
      {
        sequence: 3,
        key: "assurance",
        requirement: "AI assurance opinion",
        forum: configured.assurance,
        decision:
          "Determine whether AI-specific risk is sufficiently understood and controlled to issue an assurance opinion.",
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
          "Decide whether the digital investment should progress within portfolio, funding, dependency and delivery constraints.",
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
          "Confirm that the procurement route, supplier and contract are acceptable under the relevant delegated authority.",
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
          ? "Decide whether the live service may continue, continue with conditions, be suspended or return for remediation."
          : "Confirm that the service is operationally, ethically and evidentially ready to deploy.",
        evidence: [
          "Test results and acceptance evidence",
          "Closure or formal acceptance of conditions",
          "Monitoring plan and review schedule",
          "Incident, rollback and suspension arrangements",
          "Training and operational support",
          "Final Model Card and Evidence Index",
          ...(assessmentRequirements(profile, results).atrs === "Yes"
            ? ["ATRS applicability / publication owner confirmation (conditional)"]
            : []),
        ],
        status: retrospective ? "Draft plan — continuation decision proposed" : "Draft plan — proposed",
        handoff:
          "If authorised, record the release decision in WCC-AIG-16 or approved native minutes, link the dated 36 Gate Event, and record each condition separately. Triage does not approve deployment.",
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
  function build05DraftHandoff(profile, results, agentic) {
    const rows = [];
    const add = (sheet, field, value, review) =>
      rows.push([sheet, field, value || "", review]);
    const identityReview = profile.registerId
      ? "Verify this is the existing permanent Council-issued AIR-ID in the current 05 workbook; never replace or mint it."
      : "Obtain the permanent Council-issued AIR-ID from the current 05 workbook; this tool does not create one.";

    add("05 / Register Core", "AIR-ID", profile.registerId, identityReview);
    add("05 / Register Core", "System / Model Name", profile.systemName, "Verify against the current Council record.");
    add("05 / Register Core", "Approved Purpose / Boundary", profile.purpose, "Intake proposal only; it is not approved purpose. The authorised owner confirms the approved purpose and boundary.");
    add("05 / Register Core", "Service Area", profile.serviceArea, "Verify locally.");
    add("05 / Register Core", "Service Owner", profile.serviceOwner, "Verify current accountable owner.");
    add("05 / Register Core", "Supplier / Developer", profile.supplierDeveloper, "Verify locally.");
    add("05 / Register Core", "Source", profile.source, "Verify against the controlled list in the current workbook.");
    add("05 / Register Core", "Primary AI Type (summary)", profile.capability, "Triage description only; confirm controlled value.");
    add("05 / Register Core", "Lifecycle Stage", profile.lifecycle, "Proposed stage; map to the current workbook's controlled list.");
    add("05 / Register Core", "Date First Used", profile.dateFirstUsed, "User-entered date; verify evidence.");
    add("05 / Register Core", "Action Authority (summary)", profile.actionAuthority, "Intake description only; does not grant authority. Verify actual permissions and delegations in WCC-AIG-45.");
    add("05 / Register Core", "Is Agent?", isAgentSystem(profile, results) ? "Triage indicates possible agent" : "Triage did not identify an agent", "Classification prompt only; reconcile with actual capability and WCC-AIG-45. Unknown must not be treated as No.");
    add("05 / Register Core", "Agent Record (45) Ref", agentic && agentic.asbomRef, "User-entered pointer only; confirm the existing authorised WCC-AIG-45 record.");
    add("05 / Register Core", "Governance Approval Status", "", "Do not infer approval. Verify current state in 05; formal decisions belong in WCC-AIG-16 or approved native minutes and link to the 36 event.");
    add("05 / Register Core", "Operational Status", "", "Do not infer current operational status; verify the current 05 record.");
    add("05 / Assurance Snapshot", "AGPI / assurance / risk result", `${results.agpiScore} AGPI; ${results.effectiveTierName} effective triage tier`, "Draft prioritisation and risk only; reconcile assurance state against the current 05 workbook. AGPI does not waive Equality Act, HRA, privacy or other case-specific duties.");
    add("05 / Assurance Snapshot", "Assessment screening", "Equality Act 2010 s149, Human Rights Act 1998 s6 and data protection/privacy screening required for every tier.", "Screening is not completion or a legal applicability decision. Specialist and legal owners confirm case-specific duties.");
    add("05 / Assurance Snapshot", "Assessment indications", `DPIA: ${results.requirements.dpia || "screening required"}; equality: ${results.requirements.eia}; human rights: ${results.requirements.humanRights ? "potential engagement to confirm" : "screening required"}`, "Indications only. DPO, equality and legal owners determine and document case-specific duties and completion.");
    return { headers: DRAFT_HANDOFF_HEADERS.slice(), rows };
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
      "Draft plan: AIR-ID reference (verify in 05)",
      "System / Model Name (verify)",
      "Suggested gate order",
      "Prospective requirement",
      "Decision question for the authorised forum",
      "Proposed forum (confirm authority)",
      "Evidence / screening prompts",
      "Plan status (not an event or approval)",
      "Handoff note",
    ];
    const rows = route.map((gate) => [
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

  // Fields the proposed 05 Register Core does not hold are routed to the
  // artefact whose form owns them. Returns prompts, not import-ready records;
  // approval and any event-linked conditions remain with their formal owners.
  function buildArtefactHandoff(profile, results) {
    const requirements = assessmentRequirements(profile, results);
    const yn = (v) => (v === "Yes" ? "Yes" : v === "No" ? "No" : "Not stated");
    const items = [];

    const triggered = results.triggerIds.length > 0;
    items.push({
      artefact: "WCC-AIG-07 AI Risk Assessment Worksheet",
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
        artefact: "WCC-AIG-48 Agentic Triage + WCC-AIG-45 Agent Record (ASBOM)",
        section: "Can-it-act gate, agency profile and authority envelope",
        fields: [
          { label: "Can it act (is an agent)?", value: "Yes" },
          { label: "Agentic triage required?", value: "Yes — complete before routing" },
        ],
        note: "Run the Agentic Triage (48): score the five agency dimensions, set the autonomy level and agency tier, test the authority boundary and kill-switch, and open the Agent Record / ASBOM (45). The register carries Is Agent, autonomy and agency tier; the ASBOM holds the full composition and the Authority Graph (46) derives from it. Consequential actions in service are recorded in the Agentic Action / Decision Record (50).",
      });
    }

    items.push({
      artefact: "WCC-AIG-10 Data Protection Impact Assessment",
      section: "Section 2 \u2014 Screening (is a DPIA required?)",
      fields: [
        { label: "Materially affects individuals?", value: yn(profile.affectsIndividuals) },
        { label: "Public / resident facing?", value: yn(profile.publicFacing) },
      ],
      note: `${requirements.dpia}. A DPO/privacy owner determines case-specific legal requirements and records any assessment outcome; this tool does not establish applicability or completion.`,
    });

    items.push({
        artefact: "WCC-AIG-11 Equality Impact Assessment",
        section: "Section 2 \u2014 Equality Act 2010 section 149 screening (all tiers)",
        fields: [
          { label: "Public / resident facing?", value: yn(profile.publicFacing) },
          { label: "Materially affects individuals?", value: yn(profile.affectsIndividuals) },
        ],
        note: `${requirements.eia}. Screen every system; an equality owner determines whether a fuller assessment is needed. AGPI does not waive the public sector equality duty.`,
      });

    items.push({
        artefact: "WCC-AIG-12 Human Rights Assessment",
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
        artefact: "WCC-AIG-41 AI Contestability and Redress Control",
        section: "Resident challenge route",
        fields: [
          { label: "Public / resident facing?", value: yn(profile.publicFacing) },
          { label: "Materially affects individuals?", value: yn(profile.affectsIndividuals) },
          { label: "Informs a statutory decision?", value: results.triggerIds.includes("statutory") ? "Yes" : "No" },
        ],
        note: "Resident-facing or decision-influencing AI: ensure the WCC-AIG-41 challenge route \u2014 plain-language \u2018ask us to look again\u2019, a fresh independent human review with authority to change the decision, and redress \u2014 is in place, with the LGSCO as the external escalation.",
      });
    }

    const atrsIndicated = requirements.atrs === "Yes";
    const atrsAgentic = results.triggerIds.includes("agentic");
    const atrsAssessments = [
      requirements.dpia.startsWith("Potential DPIA") ? "Potential DPIA — DPO confirmation" : null,
      requirements.eia.startsWith("Potential full assessment") ? "Potential equality impact assessment — specialist confirmation" : null,
      requirements.humanRights ? "Human Rights Assessment" : null,
    ].filter(Boolean);
    items.push({
      artefact: "WCC-AIG-15 ATRS Record",
      section: "Tier 1 Summary + Section 6 \u2014 Risks, Mitigations and Impact Assessments",
      fields: [
        { label: "Transparency record indicated?", value: atrsIndicated ? "Yes" : "No" },
        { label: "Public / resident facing?", value: yn(profile.publicFacing) },
        {
          label: "Impact assessments to tick (Section 6)",
          value: atrsAssessments.length ? atrsAssessments.join(", ") : "None indicated",
        },
        {
          label: "Human oversight to describe (Section 4)",
          value: atrsAgentic ? "Yes \u2014 agentic trigger fired" : "Standard",
        },
      ],
      note: atrsIndicated
        ? "Potential ATRS candidate only. The case-specific/legal owner confirms whether ATRS applies, any publication duty and publication timing. This draft is not a publication or applicability decision."
        : "ATRS was not indicated by this intake, which is not a legal applicability decision. The case-specific/legal owner confirms whether it applies before recording N/A or publishing.",
    });

    const procurement = commercialRequired(profile);
    items.push({
      artefact: "WCC-AIG-13 Supplier AI Due Diligence Questionnaire",
      section: "Procurement / contracting",
      fields: [
        { label: "Procurement route indicated by intake?", value: procurement ? "Potential route — confirm" : "Not indicated — confirm" },
      ],
      note: procurement
        ? "Potential route only; commercial owner confirms whether procurement and a delegated commercial decision are required."
        : "No route indicated by intake; commercial owner confirms case-specific need before N/A is recorded.",
    });

    items.push({
      artefact: "WCC-AIG-38 Decision-Ready Paper",
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
      artefact: "WCC-AIG-16 Governance Decision Record + 05/36 integrated workbook",
      section: "Formal decision and linked gate records",
      fields: [
        { label: "Decision-maker / date", value: "Not supplied — authorised forum records in WCC-AIG-16 or approved native minutes" },
        { label: "05 / 36 relationship", value: "05 keeps AIR-ID and current assurance; 36 separates prospective Gate Plan, dated Gate Events and event-linked Gate Conditions." },
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
    { id: "monitoringRef", group: "Decision", showAtOrAbove: 5, type: "text", label: "Prompted by a monitoring finding? Ref in the Post-Deployment Monitoring Log (WCC-AIG-39), if any", placeholder: "39 row / review ref" },
    { id: "hasSuccessor", group: "Decision", showAtOrAbove: 5, type: "select", label: "Replacement or successor system?", options: ["No", "Yes"] },
    { id: "successorId", group: "Decision", showAtOrAbove: 5, type: "text", label: "Successor AIR-ID (if any)", placeholder: "AIR-XXXX" },
    { id: "decommissionDate", group: "Decision", showAtOrAbove: 5, type: "date", label: "Planned decommission date" },

    { id: "dataDisposition", group: "Data and access", showAtOrAbove: 5, type: "select", label: "Data and logs disposition", options: ["Retain in place", "Archive", "Dispose / delete", "Return to supplier or data subject"] },
    { id: "dataBasis", group: "Data and access", showAtOrAbove: 5, type: "text", label: "Retention or disposal basis", placeholder: "Statute, policy or contract reference" },
    { id: "accessTeardown", group: "Data and access", showAtOrAbove: 5, type: "select", label: "Accounts, API keys and agentic action scopes revoked?", options: ["Not yet", "Scheduled", "Confirmed revoked"] },

    { id: "dependencies", group: "Continuity", showAtOrAbove: 3, type: "textarea", label: "Downstream dependencies (what consumes its outputs)" },
    { id: "fallback", group: "Continuity", showAtOrAbove: 3, type: "select", label: "Fallback or transition arrangement before switch-off?", options: ["Not needed", "Planned", "Confirmed in place"] },
    { id: "affectedStaff", group: "Continuity", showAtOrAbove: 3, type: "textarea", label: "Affected staff: process change or retraining" },
    { id: "monitoringClosure", group: "Continuity", showAtOrAbove: 3, type: "select", label: "Post-Deployment Monitoring Log (WCC-AIG-39) closure", options: ["Not applicable - no active monitoring", "To be closed", "Closed"] },

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

    { id: "planId", group: "Gate event record", showAtOrAbove: 5, type: "text", label: "Existing Gate Plan ID (verify in 36; do not invent)", placeholder: "Existing plan ID only" },
    { id: "eventId", group: "Gate event record", showAtOrAbove: 5, type: "text", label: "Existing Event ID (verify in 36; do not invent)", placeholder: "Existing event ID only" },
    { id: "forum", group: "Gate event record", showAtOrAbove: 5, type: "text", label: "Gate / forum" },
    { id: "decision", group: "Gate event record", showAtOrAbove: 5, type: "select", label: "Gate decision (Stop = decommission; Progress with condition = approve with conditions)", options: ["Pending: not yet decided", "Progress", "Progress with condition", "Return for evidence", "Pause", "Stop", "Noted", "Priority override", "Escalation raised"] },
    { id: "eventDate", group: "Gate event record", showAtOrAbove: 5, type: "date", label: "Date of decision (leave blank until decided)" },
    { id: "decisionMaker", group: "Gate event record", showAtOrAbove: 5, type: "text", label: "Decision-maker and role" },
    { id: "conditionDue", group: "Gate event record", showAtOrAbove: 3, type: "date", label: "Condition due date (if any)" },
    { id: "assuranceRef", group: "Gate event record", showAtOrAbove: 2, type: "text", label: "Assurance opinion reference" },
    { id: "evidenceRefs", group: "Gate event record", showAtOrAbove: 3, type: "text", label: "Evidence references (recorded in Notes)", placeholder: "Disposal record, ATRS update log, notification plan" },
    { id: "decisionRecordRef", group: "Gate event record", showAtOrAbove: 5, type: "text", label: "Existing WCC-AIG-16 / approved minutes reference (verify)", placeholder: "Existing authorised decision reference" },
    { id: "recordedBy", group: "Gate event record", showAtOrAbove: 5, type: "text", label: "Recorded by (recorded in Notes)" },
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
    if (ret.monitoringClosure === "To be closed") c.push("Close the Post-Deployment Monitoring Log (WCC-AIG-39): set Review Status to closed and cancel any scheduled reviews.");
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
    if (!ret.priorityLabel) outstanding.push("Current 05 governance priority not verified; full-depth prompts are shown until it is.");
    if (!ret.tier) outstanding.push("Current 05 assurance/risk tier not verified.");
    if (!ret.registerId) outstanding.push("Existing Council-issued AIR-ID not recorded.");
    if (!ret.planId) outstanding.push("Existing Gate Plan ID not recorded or verified.");
    if (!ret.eventId) outstanding.push("Existing Gate Event ID not recorded or verified.");
    if (!ret.forum) outstanding.push("Deciding forum not recorded.");
    if (!ret.decisionMaker) outstanding.push("Decision-maker / role not recorded.");
    if (!ret.decisionRecordRef) outstanding.push("WCC-AIG-16 / approved native minutes reference not recorded.");
    if (!decided) outstanding.push("Gate decision not yet recorded.");
    if (decided && !ret.eventDate) outstanding.push("Date of decision not set.");
    if (!ret.decommissionDate) outstanding.push("Planned decommission date not set.");
    if (ret.accessTeardown !== "Confirmed revoked") outstanding.push("Access, keys and action scopes not yet confirmed revoked.");
    if (ret.dataDisposition && !ret.dataBasis) outstanding.push("Data retention or disposal basis not stated.");
    if (level <= 3 && ret.fallback === "Planned") outstanding.push("Fallback arrangement planned but not confirmed in place.");
    if (level <= 3 && ret.monitoringClosure === "To be closed") outstanding.push("Post-Deployment Monitoring Log (WCC-AIG-39) not yet closed.");
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
    const complete = outstanding.length === 0;
    return {
      complete,
      outstanding,
      status: complete
        ? "Draft checklist complete — user-entered, unverified"
        : "Draft checklist outstanding — user-entered, unverified",
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
    const add = (sheet, field, value, review) =>
      rows.push([`36 / ${sheet}`, field, value || "", review]);
    const identityReview = ret.registerId
      ? "Verify this is the existing Council-issued AIR-ID in current 05; do not create or replace it."
      : "Look up the existing Council-issued AIR-ID in current 05; this tool does not create one.";

    add("Gate Plan (prospective)", "AIR-ID", ret.registerId, identityReview);
    add("Gate Plan (prospective)", "Plan ID", ret.planId, "Never generated here; verify against the existing 36 Gate Plan.");
    add("Gate Plan (prospective)", "Gate / forum", ret.forum, "Proposed route only; confirm the authorised forum and delegation.");
    add("Gate Plan (prospective)", "Requirement", "Retirement / decommission review", "Prospective plan prompt; not evidence of a gate event.");
    add("Gate Plan (prospective)", "Target date", ret.decommissionDate, "User-entered target only; not a decision date.");
    add("Gate Events (dated)", "Event ID", ret.eventId, "Never generated here; verify against the current Gate Events sheet before linking.");
    add("Gate Events (dated)", "Plan ID (optional join)", ret.planId, "Verify that this existing plan belongs to the same AIR-ID and gate.");
    add("Gate Events (dated)", "Decision date", decided ? retFmtDate(ret.eventDate) : "", "User-entered proposal only; formal decision belongs in WCC-AIG-16 or approved native minutes.");
    add("Gate Events (dated)", "Decision", decided ? ret.decision : "", "User-entered proposal, not an approved decision or live event.");
    add("Gate Events (dated)", "Decision-maker / role", ret.decisionMaker, "Verify authority and record the formal decision in WCC-AIG-16 / approved minutes.");
    add("Gate Events (dated)", "Decision record / minutes ref", ret.decisionRecordRef, "Reference only; verify against the authoritative decision record.");
    if (conditions.length) {
      conditions.forEach((condition) => add(
        "Gate Conditions (event-linked)",
        "Condition / required action",
        condition,
        `Separate condition handoff; verify event ID ${ret.eventId || "(not supplied)"}, owner, due date and evidence. No condition ID or completion state is generated.`,
      ));
    } else {
      add("Gate Conditions (event-linked)", "Condition / required action", "", "No conditions supplied; authorised forum decides whether any are needed.");
    }
    rows.push([
      "05 / Register Core",
      "Operational Status",
      "",
      `Current status is not changed by this checklist (${readiness.status}). Verify and update through the controlled Council process.`,
    ]);
    return { headers: RETIREMENT_HANDOFF_HEADERS.slice(), rows, readiness };
  }

  function retFormDecisionValue(ret) {
    // Map the gate decision onto WCC-AIG-16's controlled set:
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
      "DECISION-PAPER HANDOFF — NOT A FORMAL WCC-AIG-16 RECORD",
      "Proposed Westminster governance suite is a draft; authorised owner must verify the current process.",
      "Retirement / decommission — draft prompts only",
      "=====================================================================",
    );

    heading("1. Decision reference");
    push(
      line("Decision record ID", ret.decisionRecordRef || "(not supplied; use existing authorised record ref)"),
      line("System / model name", ret.systemName || "(not entered)"),
      line("AIR-ID", ret.registerId || "(no ID)"),
      line("Decision date", decisionDate),
      line("Decision-making body", ret.forum || "(not recorded)"),
      line("Risk classification", ret.tier || "(not set)"),
      line("Decision authority / delegation", ret.boardDecision === "Yes" ? "User-entered Yes — verify delegation and evidence" : na),
      line("Meeting / written-decision ref", ret.decisionRecordRef || na),
    );

    heading("2. Decision");
    push(
      line("Decision", retFormDecisionValue(ret)),
      line("Gate decision (WCC-AIG-36)", decided ? ret.decision : "Pending: not yet decided"),
      "",
      "Summary of the decision and reasoning:",
    );
    const summary = [
      `Retire and decommission ${ret.systemName || "the system"}${ret.registerId ? " (" + ret.registerId + ")" : ""}.`,
      ret.reason ? `Reason: ${ret.reason}.` : "",
      ret.rationale ? `Rationale: ${ret.rationale}` : "",
      ret.monitoringRef ? `Prompted by monitoring finding ${ret.monitoringRef} (WCC-AIG-39).` : "",
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
      line("Action closure status", readiness.complete ? "All retirement conditions met" : "Open — see outstanding items"),
      line("Conditions verified by / date", na),
    );

    heading("5. Authorisation");
    push(
      line("Recorded by", `${ret.recordedBy || "(not recorded)"} on ${formatDate(new Date())}`),
      line("Chair / approver", ret.decisionMaker || na),
      line("Signature", "____________________"),
      line("Date", decisionDate),
      line("Authority vs delegated limits", ret.boardDecision === "Yes" ? "Confirmed: relevant Council delegation" : na),
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
    build05DraftHandoff,
    AGENCY_DIMENSIONS,
    AGENCY_MULTIPLIERS,
    CAPABILITY_VECTOR,
    AGENCY_TIERS,
    AGENCY_PATHWAYS,
    computeAgentic,
    autonomyLabel,
    buildGatePlanCsv,
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
