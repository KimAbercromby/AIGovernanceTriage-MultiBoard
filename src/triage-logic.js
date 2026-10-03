(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.TriageLogic = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  // Suite release this tool is aligned to, with the artefact versions it relies on
  // (from the AIG-GOV-03 Artefact Index, suite release v3.9.7, 3 October 2026).
  const SUITE = {
    release: "v3.9.7",
    date: "3 October 2026",
    status: "Proposed — for Council confirmation; not approved or adopted",
    versions: {
      "AIG-GOV-02 Playbook": "19.9.16 draft",
      "AIG-GOV-03 Artefact Index": "1.32 draft",
      "AIG-INV-04 AI Register": "1.0 draft",
      "AIG-INV-05 Capabilities and System Map": "0.3 proposed design draft",
      "AIG-ASS-01 AGPI Triage Tool": "1.4 draft",
      "AIG-ASS-02 AI Risk Assessment Worksheet": "1.10 draft",
      "AIG-ASS-11 AI Security Review Checklist": "1.9 draft",
      "AIG-DEC-01 Gate Map": "1.11 draft",
      "AIG-DEC-02 Decision-Ready Paper": "1.6 draft",
      "AIG-DEC-03 Governance Decision Record": "1.9 draft",
      "AIG-DEC-04 Gate Log": "1.2 draft",
      "AIG-AGT-02 Agentic Classification Reference": "1.6 draft",
      "AIG-AGT-03 Agentic Triage": "1.5 draft",
      "AIG-AGT-04 Agent Record (ASBOM)": "0.5 working draft",
      "AIG-AGT-06 Agentic Action / Decision Record": "1.5 draft",
      "AIG-OPS-01 Deployment and Rollout Plan": "1.10 draft",
      "AIG-OPS-02 Monitoring and Review Log": "1.6 draft",
      "UC_ID_Risk_Decision_Current_View": "1.0 draft",
    },
  };
  SUITE.label = `AI governance suite ${SUITE.release} (${SUITE.date}; Playbook ${SUITE.versions["AIG-GOV-02 Playbook"]})`;

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

  // AGPI thresholds and "typical governance attention (urgency)" wording from
  // AIG-ASS-01 AGPI Triage B34:B38 and Playbook §3.9.6. The priority sets urgency
  // and sequencing only; the route follows the governing tier (Playbook §3.10.1).
  const PRIORITIES = [
    {
      min: 80,
      level: 1,
      label: "Priority 1 – Critical",
      action:
        "Immediately, first in the queue: governance review with executive oversight; the route, assessments and decision follow the governing tier (Playbook §3.10.1).",
    },
    {
      min: 60,
      level: 2,
      label: "Priority 2 – High",
      action:
        "Promptly, next in the queue: enhanced attention and early risk review with AI Governance Working Group oversight; the route, assessments and decision follow the governing tier (Playbook §3.10.1).",
    },
    {
      min: 40,
      level: 3,
      label: "Priority 3 – Standard",
      action:
        "In normal order: standard governance attention and ongoing monitoring; the route, assessments and decision follow the governing tier (Playbook §3.10.1).",
    },
    {
      min: 20,
      level: 4,
      label: "Priority 4 – Routine",
      action:
        "In routine order: linked UC-ID record under the system AIR-ID and periodic review; the route, assessments and decision follow the governing tier (Playbook §3.10.1).",
    },
    {
      min: 0,
      level: 5,
      label: "Priority 5 – Observe",
      action:
        "When capacity allows: local management oversight, with reassessment before operational deployment.",
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

  // Generic, configurable forum labels from the AIG-DEC-01 Gate Map (configure to
  // local forum names). The AI Assurance Board gives assurance and recommendations;
  // it does not decide.
  const DEFAULT_FORUMS = {
    strategic: "Strategic planning forum",
    technical: "Technical design authority",
    assurance: "AI Assurance Board",
    digital: "Digital governance forum",
    commercial: "Procurement board",
    ethics: "Ethics decision owner (officer or forum with confirmed delegation)",
    release: "Go-live decision-maker for the UC-ID (officer or forum with confirmed delegation)",
  };

  // AIG-DEC-04 Lists A5:A14: the Gate / forum controlled list (AIG-DEC-01 gates).
  const DEC04_GATES = [
    "Gate 0 Intake / opportunity",
    "Gate 1 Strategic prioritisation",
    "Gate 2 Technical design review",
    "Gate 3 Case for change / strategic alignment",
    "Gate 4 Procurement",
    "Gate 5 Ethics assessment",
    "Gate 6 Deployment / go-live",
    "Gate 7 Operate, monitor, review & change",
    "Gate 8 Retirement / closure",
    "Other forum (name it in Decision-maker / role)",
  ];

  // "Can it act?" screen (AIG-AGT-03 §3). The automated action authority answer
  // also says whether each action has evidenced per-action human review.
  const ACTION_AUTHORITY = {
    none: "None — outputs only",
    perAction: "Human approves each action",
    bounded: "Acts within defined bounds — monitored",
    autonomous: "Fully autonomous",
    unsure: "Unsure — not yet confirmed",
  };

  // "What's happening?" (as in the Route Finder, step 1). AI found already in use
  // always goes through full retrospective intake, never Fast Track or light-touch;
  // a change to a use already in governance re-enters intake on the same AIR-ID
  // (Playbook §3.8; AIG-INV-02; AIG-DEC-01 Gate 7). v3.9.2 (T-01).
  const SITUATIONS = {
    new: "New use",
    change: "Change to a use in governance",
    found: "Found already in use",
    approved: "Already approved",
  };
  function situationOf(profile) {
    const value = profile && profile.situation;
    return Object.values(SITUATIONS).includes(value) ? value : SITUATIONS.new;
  }
  // Found already in use, or a "new" use whose operational state is already Live.
  function isFoundInUse(profile) {
    const situation = situationOf(profile);
    return situation === SITUATIONS.found || (situation === SITUATIONS.new && !!profile && profile.lifecycle === "Live");
  }
  function isReentry(profile) {
    const situation = situationOf(profile);
    return situation === SITUATIONS.change || situation === SITUATIONS.approved;
  }

  // Fast-Track Screening (AIG-INV-02) outcome. Light-touch is reachable only after
  // all ten Fast-Track answers are No and the AI Governance Lead validates the route
  // (Playbook §3.8.2.1; AIG-DEC-01 Gate Map). Any Yes or Unsure, or no Fast Track,
  // means full Intake (AIG-INV-03) and the route follows the governing tier.
  const FAST_TRACK = {
    notDone: "Not done (full Intake)",
    allNo: "All ten No",
    notAllNo: "One or more Yes or Unsure",
  };
  function fastTrackOf(profile) {
    const value = profile && profile.fastTrack;
    return Object.values(FAST_TRACK).includes(value) ? value : FAST_TRACK.notDone;
  }
  // Fast-Track answers that the rest of the profile shows cannot be No (AIG-INV-02
  // v1.8, suite v3.9.7): Q1 (can it act?), Q2 (special category data; ordinary
  // personal data the user already handles is No), Q3/Q4 (outputs could materially
  // affect individuals or services) and Q5 (resident- or public-facing; staff using
  // it for their own work is No).
  function fastTrackConflicts(profile) {
    const p = profile || {};
    const out = [];
    const authority = p.actionAuthority || "";
    if (authority && authority !== ACTION_AUTHORITY.none) out.push("Q1 (it can act, or that is unconfirmed)");
    if (p.dataType === "Special category data") out.push("Q2 (it processes special category data)");
    if (p.affectsIndividuals === "Yes") out.push("Q3 or Q4 (its outputs could materially affect individuals or services)");
    if (p.publicFacing === "Yes") out.push("Q5 (it is resident- or public-facing)");
    return out;
  }

  // New investment question (AIG-INV-03 v1.8; AIG-DEC-01 v1.11 Gate 1 and 3 rule;
  // suite v3.9.7). Unsure counts as Yes.
  const NEW_INVESTMENT = {
    unsure: "Unsure (counts as Yes)",
    yes: "Yes",
    no: "No — existing approved system and licence, no new cost",
  };
  function newInvestmentOf(profile) {
    const value = profile && profile.newInvestment;
    return Object.values(NEW_INVESTMENT).includes(value) ? value : NEW_INVESTMENT.unsure;
  }
  // Gate 1 decides whether the Council takes a use or system on at all; Gate 3 decides
  // the investment and strategic case (AIG-DEC-01 v1.12 Gate 1 and 3 rule).
  // Gate 1 is N/A only for a new UC-ID, or a change to a use in governance (decision A5),
  // under an existing AIR-ID with no new investment,
  // at Low or Medium, that cannot act: a new system always goes to Gate 1, even if free.
  // Gate 3 is N/A wherever there is no new investment, at Low or Medium, and the use
  // cannot act, for new and existing systems alike. The tool only proposes N/A: the
  // governance steward confirms it in the Gate Plan with the rule, their name and date.
  function gates13Rule(profile, results) {
    const common = [];
    // A new use, or a change to a use in governance (re-entry, decision A5); never AI found in use.
    if (isFoundInUse(profile)) common.push("AI found already in use goes through retrospective intake");
    if (newInvestmentOf(profile) !== NEW_INVESTMENT.no) common.push("new investment is Yes or Unsure");
    const proc = procurementRouteOf(profile);
    if (proc === PROCUREMENT.new) common.push("a new contract, licence change or variation is needed");
    if (proc === PROCUREMENT.unknown) common.push("the procurement route is not yet known (counts as possible new investment)");
    const tier = results && results.effectiveTierName;
    if (tier !== "Low" && tier !== "Medium") common.push("the governing tier is High or Critical");
    if (isActionCapable(profile, results && results.triggerIds)) common.push("the use can act");
    const existing = /^AIR-[A-Z0-9]/i.test((profile && profile.registerId) || "");
    const reasons1 = existing ? common.slice() : common.concat("no existing AIR-ID is entered (a system new to the Council always goes to Gate 1)");
    const useWord = isReentry(profile) ? "changed use" : "new UC-ID";
    const na1 = reasons1.length === 0;
    const na3 = common.length === 0;
    const base = `no new funding, licences, charges, procurement or business case; governing tier ${tier}; cannot act`;
    return {
      na1, na3, na: na1 && na3, reasons1, reasons3: common, reasons: reasons1,
      rationale1: na1 ? `N/A — existing approved system, no new investment (AIG-DEC-01 Gate 1 and 3 rule): ${useWord} under ${profile.registerId}; ${base}. Governance steward confirms the system approval is current and records the rule, their name and date in column J.` : "",
      rationale3: na3 ? `N/A — no new investment (AIG-DEC-01 Gate 1 and 3 rule): ${base}. Governance steward confirms and records the rule, their name and date in column J.` : "",
          };
  }
  const CARRIED_FROM_GATES_1_3 = [
    "Equality, human-rights and data protection screening outcome (may be by reference to a current covering assessment, with Evidence IDs; Playbook \u00a74.6), seen by the decision-maker before deciding",
    "Purpose and expected benefits",
    "Versioned AI assurance opinion, where one is given",
  ];

  // Procurement question (AIG-DEC-01 v1.11 Gate 4 rule; Playbook §5.5.1; AIG-ASS-08 v1.6;
  // Proposed — for Council confirmation). v3.9.2 (T-07, T-08).
  const PROCUREMENT = {
    unknown: "Not yet known",
    new: "New contract, licence change or contract variation",
    existing: "Existing contract or licence",
    free: "Free public tool",
    inhouse: "Built in-house",
  };
  // Profiles saved before v3.9.2 answered "External procurement or contract approval
  // needed?" (Yes / No) instead; No is read with the Source answer.
  function procurementRouteOf(profile) {
    const value = profile && profile.procurementRoute;
    if (Object.values(PROCUREMENT).includes(value)) return value;
    if (profile && profile.procurementRequired === "Yes") return PROCUREMENT.new;
    if (profile && profile.procurementRequired === "No") {
      return {
        "Internally developed": PROCUREMENT.inhouse,
        "Free / public tool": PROCUREMENT.free,
        Procured: PROCUREMENT.existing,
        "Embedded in platform / supplier feature": PROCUREMENT.existing,
      }[profile.source] || PROCUREMENT.unknown;
    }
    return PROCUREMENT.unknown;
  }
  const SUPPLIER_CHECKS =
    "the data processing terms and the Supplier AI Due Diligence Questionnaire (AIG-ASS-08) section 5 (data protection and security) and section 8 (business continuity and exit)";
  const GATE4_NA_EXISTING = "N/A — existing contract / free tool";
  // Gate 4 applies wherever a procurement, new contract, licence change or contract
  // variation is needed. An AI feature enabled under an existing contract or licence,
  // or a free public tool, records Gate 4 "N/A — existing contract / free tool" with
  // the rationale, and the supplier checks that still apply are completed.
  function gate4Rule(profile) {
    const route = procurementRouteOf(profile);
    if (route === PROCUREMENT.new) {
      return {
        route, applies: true, planRequirement: "Required", naRationale: "", supplierChecks: "full",
        label: "Applies (new contract, licence change or variation)",
        note: "Supplier due diligence (AIG-ASS-08) and AI contract terms; the Procurement board decides within its delegated remit.",
      };
    }
    if (route === PROCUREMENT.existing || route === PROCUREMENT.free) {
      const why = route === PROCUREMENT.existing
        ? "AI feature enabled under an existing contract or licence; no procurement, new contract, licence change or contract variation is needed"
        : "free public tool with no contract; no procurement, new contract, licence change or contract variation is needed";
      return {
        route, applies: false, planRequirement: "Not applicable", supplierChecks: "partial",
        naRationale: `${GATE4_NA_EXISTING}: ${why} (AIG-DEC-01 Gate 4 rule). Supplier checks that still apply: ${SUPPLIER_CHECKS}. Governance steward confirms and adds the authority ref.`,
        label: GATE4_NA_EXISTING,
        note: route === PROCUREMENT.existing
          ? `Record Gate 4 as N/A in the Gate Plan with the reason. Still complete ${SUPPLIER_CHECKS}. If switching it on needs a licence change or contract variation, Gate 4 applies.`
          : `Record Gate 4 as N/A in the Gate Plan with the reason. Still complete ${SUPPLIER_CHECKS}, answered from the published terms, with any gaps recorded.`,
      };
    }
    if (route === PROCUREMENT.inhouse) {
      return {
        route, applies: false, planRequirement: "Not applicable", supplierChecks: "none",
        naRationale: "N/A (built in-house): no procurement, contract or licence (AIG-DEC-01 Gate 4). Governance steward confirms and adds the authority ref.",
        label: "N/A (built in-house)",
        note: "Built in-house: mark Gate 4 N/A in the Gate Plan with the reason.",
      };
    }
    return {
      route, applies: null, planRequirement: "Conditional", naRationale: "", supplierChecks: "confirm",
      label: "If a procurement, new contract, licence change or contract variation is needed",
      note: "Answer the procurement question. Gate 4 applies wherever a procurement, new contract, licence change or contract variation is needed; for an existing contract or licence, or a free public tool, it is N/A with the reason, and the remaining supplier checks are completed.",
    };
  }

  // Monitoring minimum for the governing tier (Playbook §6.4.4 controlled minimum
  // cadence table; AIG-OPS-02 v1.6 Sampling Method), as the Route Finder states it.
  // For action-capable uses the Monitoring and Review Plan raises the cadence; the size
  // of the raise is a Council decision (AIG-OPS-02 column AP). v3.9.2 (T-12, W-08).
  const MONITORING_MINIMUM = {
    Low: ["routine operational monitoring by the Service Owner", "performance review annual", "formal review annual", "minimum sample 10 per review (census if 10 or fewer)"],
    Medium: ["operational monitoring monthly", "performance review quarterly", "formal review annual (AI Governance Working Group)", "minimum sample 20 per review (census if 20 or fewer)"],
    High: ["operational monitoring continuous (logged at least monthly)", "performance review monthly", "formal review quarterly, reported to the AI Assurance Board", "minimum sample the greater of 30 or 5% of the window\u2019s population (census if at or below the minimum)"],
    Critical: ["operational monitoring continuous (logged at least monthly)", "performance review at least monthly", "continuous monitoring with a formal review at least monthly, reported to each AI Assurance Board meeting", "minimum sample the greater of 30 or 5% of the window\u2019s population, plus 100% of adverse or fully automated decisions"],
  };
  const OPS02_REVIEW_TYPES = ["Operational monitoring", "Performance review", "Formal review"];
  const OPS02_AGENTIC_RAISE = ["Raised per Monitoring and Review Plan", "Not action-capable", "Action-capable: raise not yet set"];
  function monitoringMinimum(tierName, actionCapable) {
    const lines = MONITORING_MINIMUM[tierName];
    if (!lines) return "";
    return `Monitoring minimum for the ${tierName} governing tier (Playbook §6.4.4; AIG-OPS-02 Sampling Method): ${lines.join("; ")}. Record the review type (operational, performance or formal) on each Monitoring Log row.` +
      (actionCapable ? " Action-capable: the Monitoring and Review Plan raises (never lowers) this cadence; the size of the raise is to be set by the Council (AIG-OPS-02 column AP)." : "");
  }

  // Autonomy scores allowed for each "Can it act?" answer (AIG-AGT-02: autonomy 0 acts
  // only when a person triggers each individual action). Human-approved actions allow
  // 0 or 1, so a T0 agent can be assessed (v3.9.2, T-03); 2 or more conflicts with
  // per-action review (AIG-ASS-02 row 82).
  function autonomyRangeFor(actionAuthority) {
    if (actionAuthority === "Fully autonomous") return { min: 3, max: 5 };
    if (actionAuthority === "Acts within defined bounds — monitored") return { min: 2, max: 5 };
    if (actionAuthority === "Human approves each action") return { min: 0, max: 1 };
    return { min: 0, max: 5 };
  }

  // Exports deliberately use a handoff schema, never an import-ready row.
  const DRAFT_HANDOFF_HEADERS = [
    "Target artefact / sheet",
    "Field label or prompt",
    "Field reference type",
    "Triage draft value",
    "Value status",
    "Review, evidence or authority still required",
  ];
  // Exact column headers of AIG-INV-04 (row 3), excluding the formula-owned Row check.
  const REGISTER_HEADERS = [
    "AIR-ID", "System name", "Purpose and boundary", "Service area",
    "Service Owner", "Supplier / source", "Lifecycle stage",
    "Governance Approval Status (system baseline; not use approval)",
    "Operational Status (system baseline)", "Can it act?", "Decision record ref",
    "Latest gate Event ID", "Assessment / evidence ref", "Next review",
    "UC-ID(s) covered — approved purpose and scope (one per line or AIG-DEC-03 ref)",
    "AI capability and systems/tools permitted (pointer)", "Date registered",
    "Date first used", "Personal / special category data?", "ATRS requirement",
    "Model Card completion", "Monitoring in place?", "Last review date",
    "Route / pathway", "Intake type",
  ];
  const ASSESSMENT_HEADERS = [
    "AIR-ID", "Effective Governance Priority (AIG-ASS-01, after any authorised override)",
    "AIG-ASS-01 ref / date", "Risk tier (AIG-ASS-02; highest applicable UC-ID or baseline)",
    "AIG-ASS-02 ref / date", "Agency tier (AIG-AGT-02/AIG-AGT-03)", "AIG-AGT-02/AIG-AGT-03 ref / date",
    "Privacy / DPIA position", "Equality / EIA position",
    "Other specialist finding refs", "AIG-AGT-04 Agent Record ref",
    "AIG-AGT-05 Authority Graph ref", "AIG-OPS-02 Monitoring ref", "As-at date",
    "AGPI score (0–100, AIG-ASS-01)", "Inherent risk score (L × I)",
    "Control effectiveness (1–5)", "Residual risk score",
    "Decisions about individuals — Art 22A flag / AIG-OPS-04 tier",
    "Latest priority-override Event ID (AIG-DEC-04)", "Reconciled on",
  ];
  const REGISTER_FIELDS = new Set(REGISTER_HEADERS);
  const ASSESSMENT_FIELDS = new Set(ASSESSMENT_HEADERS);
  // Exact column headers in the AIG-DEC-04 Gate Log workbook (row 3 of each sheet),
  // excluding formula-owned check columns.
  const GATE_EVENT_HEADERS = [
    "Event ID", "AIR-ID", "Plan ID (if any)", "Gate / forum", "Event type", "Date",
    "Outcome", "Decision-maker / role", "AIG-DEC-03 / minutes ref",
    "Assurance opinion ref", "Technical snapshot / as-at ref", "Next gate / action",
    "Recorded by", "UC-ID(s) covered by this dated event",
    "Decision scope (UC-ID specific / Shared system baseline)",
    "Time (hh:mm)", "Source (minutes / decision record / system)",
    "Evidence ID(s) (AIG-INV-04 Evidence index)", "Event-time lifecycle stage",
    "Incident ref (AIG-OPS-03), precautionary pause",
    "Follow-up decision due date (precautionary pause)",
  ];
  const GATE_CONDITION_HEADERS = [
    "Condition ID", "Event ID", "AIR-ID", "Required action / condition",
    "Action owner", "Due date", "State", "Closed / waived on",
    "Evidence / waiver authority ref",
    "UC-ID scope (blank only if shared system condition)",
    "Condition scope (UC-ID specific / shared system baseline)",
    "Verified by / date", "Monitoring condition? (Yes / No)",
    "AIG-OPS-02 evidence ref (monitoring conditions)",
  ];
  const GATE_EVENT_FIELDS = new Set(GATE_EVENT_HEADERS);
  const GATE_CONDITION_FIELDS = new Set(GATE_CONDITION_HEADERS);
  // Exact canonical field labels in AIG-ASS-02 "Triage Import" (column A, rows 5-63).
  const TRIAGE_IMPORT_FIELDS = new Set([
    "AIR-ID", "System / Model Name", "Purpose / Description", "Service Area", "Service Owner",
    "Supplier / Developer", "Source", "AI Capability", "Automated Action Authority",
    "Systems / Tools Accessed", "Lifecycle Stage", "Personal / Special Category Data", "Triage Date",
    "AGPI Score (0-100)", "Raw AGPI Priority", "Authorised Governance Priority Uplift",
    "Effective Governance Priority", "Resident Impact", "Legal and Regulatory Impact",
    "Reputational Impact", "Operational Impact", "Financial Impact", "Likelihood",
    "Control Effectiveness", "Impact Score", "Inherent Risk Score", "Inherent Risk Tier",
    "Residual Risk Score", "Residual Risk Tier", "Trigger \u2014 Special Category Data",
    "Trigger \u2014 Vulnerable Residents", "Trigger \u2014 Housing/Care/Homelessness",
    "Trigger \u2014 Novel Deployment", "Trigger \u2014 Statutory Decisions", "Trigger \u2014 Material Change",
    "Trigger \u2014 Agentic Autonomous Action", "Mandatory Risk Floor", "Effective Governance Tier",
    "Tier Floor Reason", "Assurance Intensity", "Governance Status", "Is Agent", "Agentic Consequence",
    "Agentic Autonomy", "Agentic Authority", "Agentic Reach", "Agentic Controllability", "Autonomy Level",
    "Agency Tier", "Agentic Pathway", "Kill-switch Demonstrated", "Rollback Capability",
    "Boundaries Tested", "Agentic Flags", "Agentic Escalations", "Agentic Deployment Control",
    "Agent Record (ASBOM) Ref", "UC-ID (blank only for explicit system baseline)", "Triage / assessment scope",
  ]);
  // Exact labels in AIG-ASS-01 "AGPI Triage" column A (rows 5-8, 10-19, 21-24).
  const AGPI_SHEET_FIELDS = new Set([
    "System / model name", "AIR-ID", "Assessed by / date",
    "UC-ID (required when scope is UC-ID specific)",
    "Resident Impact", "Public Trust & Reputation", "Legal & Regulatory Exposure",
    "Governance Visibility & Accountability", "Strategic Value & Organisational Dependency",
    "Human Oversight & Decision Authority", "AGPI score (0\u2013100)", "Governance priority",
    "Assessment scope (UC-ID specific / Shared system baseline)",
    "Governance Investigation Required? (Yes / No)",
    "Priority floor: Resident Impact or Legal & Regulatory Exposure = 5 (Proposed \u2014 for Council confirmation)",
    "Typical governance attention for this priority (urgency)",
    "Mandatory escalation trigger applies (Playbook \u00a74.4.6)? (Yes / No / Unsure)",
    "Trigger floor: a \u00a74.4.6 trigger use is at least Priority 4 (Proposed \u2014 for Council confirmation)",
  ]);
  // AIG-ASS-02 "Risk Assessment" D37:D40 labels for the assessor control-evidence
  // inputs E37:E40, which C41/E41 read to allow an evidenced-control reduction.
  const RISK_ASSESSMENT_EVIDENCE_FIELDS = {
    "Controls evidenced?": "E37",
    "Control evidence ref": "E38",
    "Independent check?": "E39",
    "Verification ref": "E40",
  };
  function fieldReferenceType(sheet, field) {
    const value = String(field || "").trim();
    const exactRegister =
      (sheet === "AI Register" && REGISTER_FIELDS.has(value)) ||
      (sheet === "Assessment summary" && ASSESSMENT_FIELDS.has(value));
    const exactGateLog =
      (sheet.includes("Gate plan") && GATE_PLAN_HEADERS.includes(value)) ||
      (sheet.includes("Gate events") && GATE_EVENT_FIELDS.has(value)) ||
      (sheet.includes("Conditions") && GATE_CONDITION_FIELDS.has(value));
    if (sheet === "Triage Import" && TRIAGE_IMPORT_FIELDS.has(value)) {
      return "Exact AIG-ASS-02 Triage Import field label — owner verification required";
    }
    if (sheet === "Risk Assessment" && RISK_ASSESSMENT_EVIDENCE_FIELDS[value]) {
      return `Exact AIG-ASS-02 Risk Assessment ${RISK_ASSESSMENT_EVIDENCE_FIELDS[value]} assessor input (paste into Risk Assessment ${RISK_ASSESSMENT_EVIDENCE_FIELDS[value]}, not Triage Import) \u2014 owner verification required`;
    }
    if (sheet === "AGPI Triage" && AGPI_SHEET_FIELDS.has(value)) {
      return "Exact AIG-ASS-01 AGPI Triage field label — owner verification required";
    }
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

  // The AGPI band for a score (AIG-ASS-01 thresholds), before any floor.
  function priorityFor(score) {
    const safeScore = Math.min(100, Math.max(0, Number(score) || 0));
    return PRIORITIES.find((priority) => safeScore >= priority.min);
  }

  function priorityByLevel(level) {
    return PRIORITIES.find((priority) => priority.level === level);
  }

  // Governance priority (Playbook §3.9.6; AIG-ASS-01 B17 and B21):
  //  - AGPI band from the weighted score;
  //  - priority floor (v3.8): Resident Impact = 5 or Legal & Regulatory Exposure = 5
  //    makes the priority at least Priority 2 – High;
  //  - trigger floor (v3.9.2, AIG-ASS-01 v1.4 rows 23-24): a use with a §4.4.6
  //    mandatory trigger (Yes or Unsure) cannot be Priority 5; it is at least Priority 4.
  //  - Governance Investigation Required (B19 = Yes) replaces the priority with
  //    "Governance Investigation Required — route to discovery" (B17).
  // Where both floors apply, the higher priority results. The priority sets urgency only.
  const INVESTIGATION_LABEL = "Governance Investigation Required \u2014 route to discovery";
  function governancePriority(score, agpiScores, triggerIds, governanceInvestigation) {
    const band = priorityFor(score);
    const scores = agpiScores || {};
    const residentOrLegalFive = clampScore(scores.resident) === 5 || clampScore(scores.legal) === 5;
    let level = band.level;
    let floorApplied = false;
    let overrideApplied = false;
    if (residentOrLegalFive && level > 2) {
      level = 2;
      floorApplied = true;
    }
    const triggered = (triggerIds || []).length > 0;
    if (triggered && level === 5) {
      level = 4;
      overrideApplied = true;
    }
    const priority = priorityByLevel(level);
    const investigation = governanceInvestigation === "Yes";
    const floorNote = investigation ? "" : floorApplied
      ? `Priority floor applied: Resident/Legal = 5 (AGPI band ${band.label} raised to Priority 2 – High)`
      : "No floor effect";
    // AIG-ASS-01 B24, reproduced from the workbook formula (it reads the AGPI score).
    const triggerFloorNote = investigation ? "" : triggered
      ? (Number(score) < 20
        ? "Trigger floor applied: \u00a74.4.6 trigger use raised from Priority 5 \u2013 Observe to Priority 4 \u2013 Routine"
        : "No trigger-floor effect (AGPI band already Priority 4 or higher)")
      : "No trigger floor (no \u00a74.4.6 trigger)";
    return {
      ...priority,
      band,
      // AIG-ASS-01 v1.4 B17 applies both floors, or shows the investigation route.
      ass01Label: investigation ? INVESTIGATION_LABEL : priority.label,
      governanceInvestigation: investigation,
      floorApplied,
      floorNote,
      overrideApplied,
      triggerFloorNote,
      overrideNote: overrideApplied
        ? "Trigger floor applied (Playbook \u00a73.9.6; AIG-ASS-01 row 24): a use with a \u00a74.4.6 mandatory trigger cannot be Priority 5 \u2013 Observe, so it is Priority 4 \u2013 Routine."
        : "",
    };
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

  // Playbook §4.4.8 / AIG-ASS-02: a use is tiered on its inherent risk until the
  // controls credited in its control score are implemented and evidenced (and, where
  // the inherent tier is High or Critical, independently verified), then on its
  // residual risk; never below the mandatory trigger floor (§4.4.6). This is a
  // governance tier, not a legal classification.
  const CONTROL_EVIDENCE = ["Not evidenced — planned or unverified", "Implemented and evidenced", "Implemented, evidenced and independently verified"];
  const TIER_ORDER = ["Low", "Medium", "High", "Critical"];
  function tierNameForScore(score) {
    return score <= 5 ? "Low" : score <= 10 ? "Medium" : score <= 15 ? "High" : "Critical";
  }
  // v3.9.2 (T-04): as in AIG-ASS-02 E41, a reduction also needs the control evidence
  // reference (E38) and, for a High/Critical inherent tier, the verification reference
  // (E40). A reference left undefined (callers that do not track references) is taken
  // as supplied; an empty string is not.
  function effectiveRiskTier({ inherentTierName, residualTierName, mandatoryFloorTier = "Low", controlEvidence, controlEvidenceRef, verificationRef }) {
    const given = (ref) => ref === undefined || String(ref).trim() !== "";
    const highInherent = inherentTierName === "High" || inherentTierName === "Critical";
    const statedVerified = controlEvidence === "Implemented, evidenced and independently verified";
    const statedEvidenced = statedVerified || controlEvidence === "Implemented and evidenced";
    const evidenced = statedEvidenced && given(controlEvidenceRef);
    const verified = statedVerified && given(verificationRef);
    const refMissing = (statedEvidenced && !given(controlEvidenceRef)) || (highInherent && statedVerified && !given(verificationRef));
    const verificationNeeded = evidenced && !verified && highInherent;
    const controlsEvidenced = evidenced && !verificationNeeded;
    const basisTierName = controlsEvidenced ? residualTierName : inherentTierName;
    const floorRaised = TIER_ORDER.indexOf(mandatoryFloorTier) > TIER_ORDER.indexOf(basisTierName);
    const effectiveTierName = floorRaised ? mandatoryFloorTier : basisTierName;
    const basis = controlsEvidenced
      ? "controls evidenced: residual risk tier"
      : refMissing
        ? "evidence reference missing (AIG-ASS-02 E38 / E40): inherent risk tier"
        : verificationNeeded
          ? "independent verification needed to lower a High/Critical inherent tier"
          : "controls not yet evidenced: inherent risk tier";
    return { effectiveTierName, basisTierName, controlsEvidenced, verificationNeeded, refMissing, floorRaised, basis };
  }

  function maxTier(...names) {
    return names.filter(Boolean).reduce(
      (best, name) => (TIER_ORDER.indexOf(name) > TIER_ORDER.indexOf(best) ? name : best),
      "Low",
    );
  }

  // Agency-tier minimum pathway (AIG-DEC-01 v1.11 Agentic pathway; AIG-AGT-03 §6;
  // Playbook F.2). Applies to action-capable uses only. T0/T1 none, T2 Medium,
  // T3 High, T4 High (Critical where actions run without evidenced per-action human
  // review), T5 Critical. Proposed — for Council confirmation.
  function agencyMinimumTier(agencyTierNum, perActionReviewEvidenced) {
    const n = Number(agencyTierNum);
    if (!Number.isFinite(n) || n <= 1) return null;
    if (n === 2) return "Medium";
    if (n === 3) return "High";
    if (n === 4) return perActionReviewEvidenced ? "High" : "Critical";
    return "Critical";
  }

  // Governing tier (Playbook §3.10.1, §4.4; AIG-ASS-02 Risk Assessment C43): the
  // highest of the risk tier (inherent until controls are evidenced), the §4.4.6
  // trigger floor, the impact floor (v3.8: any confirmed Impact 5 → at least Medium)
  // and, for action-capable uses, the agency-tier minimum. None lowers another.
  function governingTier({
    inherentTierName,
    residualTierName,
    mandatoryFloorTier = "Low",
    controlEvidence,
    controlEvidenceRef,
    verificationRef,
    impact,
    actionCapable = false,
    agencyTierNum = null,
    perActionReviewEvidenced = false,
  }) {
    const risk = effectiveRiskTier({ inherentTierName, residualTierName, mandatoryFloorTier, controlEvidence, controlEvidenceRef, verificationRef });
    const impactFloorTier = Number(impact) === 5 ? "Medium" : null;
    const agencyAssessed = actionCapable && agencyTierNum !== null && agencyTierNum !== undefined && agencyTierNum !== "";
    const agencyMinTier = agencyAssessed ? agencyMinimumTier(agencyTierNum, perActionReviewEvidenced) : null;
    const effectiveTierName = maxTier(risk.effectiveTierName, impactFloorTier, agencyMinTier);
    const reasons = [];
    if (!risk.controlsEvidenced && inherentTierName !== residualTierName) {
      reasons.push(risk.verificationNeeded
        ? "High/Critical inherent tier awaits independent verification of controls"
        : "controls not yet evidenced, so inherent risk tier");
    }
    if (risk.floorRaised) reasons.push(`mandatory trigger floor (${mandatoryFloorTier})`);
    const beforeImpact = risk.effectiveTierName;
    const impactFloorApplied = !!impactFloorTier && TIER_ORDER.indexOf("Medium") > TIER_ORDER.indexOf(beforeImpact);
    if (impactFloorApplied) reasons.push("Impact floor (Severe impact) → Medium");
    const beforeAgency = maxTier(beforeImpact, impactFloorTier);
    const agencyFloorApplied = !!agencyMinTier && TIER_ORDER.indexOf(agencyMinTier) > TIER_ORDER.indexOf(beforeAgency);
    if (agencyFloorApplied) reasons.push(`agency-tier minimum pathway (T${agencyTierNum} → ${agencyMinTier})`);
    return {
      ...risk,
      riskTierName: risk.effectiveTierName,
      effectiveTierName,
      impactFloorTier,
      impactFloorApplied,
      agencyMinTier,
      agencyFloorApplied,
      agencyPending: actionCapable && !agencyAssessed,
      reasons,
    };
  }

  // Gate 4 and the full Supplier DDQ apply only where a procurement, new contract,
  // licence change or contract variation is needed (AIG-DEC-01 v1.11), not from the
  // Source answer alone (v3.9.2, T-07).
  function commercialRequired(profile) {
    return procurementRouteOf(profile) === PROCUREMENT.new;
  }

  // AIG-ASS-02 Risk Assessment C45: indicative assurance depth from the governing
  // tier and mandatory triggers only. The AGPI priority does not raise assurance
  // depth (v3.8, T1).
  function assuranceIntensity(tierName, triggerIds) {
    if ((triggerIds || []).length || tierName === "Critical") return "Comprehensive / immediate";
    if (tierName === "High") return "Enhanced";
    if (tierName === "Medium") return "Standard";
    return "Proportionate";
  }

  // AIG-ASS-02 Risk Assessment C60: the decision/assurance route for the governing tier.
  function decisionRouteFor(tierName) {
    return {
      Critical: "Critical — relevant delegated decision forum + Executive Sponsor/Leadership oversight; AI Assurance Board assurance opinion/recommendation",
      High: "High — relevant delegated decision forum; AI Assurance Board assurance opinion/recommendation",
      Medium: "Medium — AI Governance Working Group review; decision by the officer or forum with confirmed delegation",
      Low: "Low — decision by the officer or forum with confirmed delegation (Service Owner/Service Manager only if delegated); Service Owner self-assessment and annual review",
    }[tierName] || "Incomplete — assessment required";
  }

  // "Can it act?" (AIG-AGT-03 §3): Unsure is treated as Yes until confirmed.
  function isActionCapable(profile, triggerIds) {
    const authority = profile && profile.actionAuthority;
    return (profile && profile.capability === "Agentic AI") ||
      (!!authority && authority !== ACTION_AUTHORITY.none) ||
      (triggerIds || []).includes("agentic");
  }

  // Per-action human review: Yes only where each action is human-approved; Unsure
  // is treated as No (§4.4.6; AIG-ASS-02 C56).
  function perActionReview(profile) {
    const authority = profile && profile.actionAuthority;
    if (!authority || authority === ACTION_AUTHORITY.none) return "Not applicable";
    if (authority === ACTION_AUTHORITY.perAction) return "Yes";
    if (authority === ACTION_AUTHORITY.unsure) return "Unsure";
    return "No";
  }

  // Triggers implied by the profile: special category data (§4.4.6 trigger 1) and
  // actions without evidenced per-action human review (trigger 7; Unsure = No).
  function impliedTriggerIds(profile) {
    const ids = [];
    if (profile && profile.dataType === "Special category data") ids.push("specialData");
    const review = perActionReview(profile);
    if (review === "No" || review === "Unsure") ids.push("agentic");
    return ids;
  }

  function normaliseTriggerIds(profile, triggerIds) {
    const set = new Set([...(triggerIds || []), ...impliedTriggerIds(profile)]);
    return TRIGGERS.map((t) => t.id).filter((id) => set.has(id));
  }

  function mandatoryFloorFor(triggerIds) {
    const ids = triggerIds || [];
    if (ids.includes("statutory") || ids.includes("agentic")) return "Critical";
    return ids.length ? "High" : "Low";
  }

  // One calculation used by the page and the tests. Returns the results object the
  // exports read.
  function calculateTriage({ profile, agpiScores, impactScores, likelihood, control, controlEvidence, controlEvidenceRef, verificationRef, triggerIds, agentic, governanceInvestigation }) {
    const ids = normaliseTriggerIds(profile, triggerIds);
    const agpiScore = calculateAgpi(agpiScores || {});
    const priority = governancePriority(agpiScore, agpiScores, ids, governanceInvestigation);
    const risk = calculateRisk(impactScores || {}, likelihood, control);
    const inherentTierName = tierNameForScore(risk.inherent);
    const residualTierName = risk.tier.name;
    const mandatoryFloorTier = mandatoryFloorFor(ids);
    const actionCapable = isActionCapable(profile, ids);
    const review = perActionReview(profile);
    const tier = governingTier({
      inherentTierName,
      residualTierName,
      mandatoryFloorTier,
      controlEvidence,
      controlEvidenceRef,
      verificationRef,
      impact: risk.impact,
      actionCapable,
      agencyTierNum: agentic ? agentic.tierNum : null,
      perActionReviewEvidenced: review === "Yes",
    });
    // AIG-ASS-02 Triage Import B42: the web-triage pre-control tier (highest of
    // inherent, residual and mandatory floor; no control-based reduction).
    const preControlTierName = maxTier(inherentTierName, residualTierName, mandatoryFloorTier);
    const results = {
      agpiScore,
      priority,
      // AIG-ASS-01 B17 (both floors, or the Governance Investigation route).
      rawAgpiPriority: priority.ass01Label,
      effectiveGovernancePriority: priority.ass01Label,
      governanceInvestigation: priority.governanceInvestigation,
      // AIG-ASS-01 B23: a §4.4.6 trigger applies? Unsure where the only trigger is an
      // unconfirmed per-action review (Unsure counts as Yes).
      triggerAnswer: !ids.length ? "No" : (ids.length === 1 && ids[0] === "agentic" && perActionReview(profile) === "Unsure") ? "Unsure" : "Yes",
      risk,
      triggerIds: ids,
      residualTierName,
      inherentTierName,
      riskTierName: tier.riskTierName,
      effectiveTierName: tier.effectiveTierName,
      preControlTierName,
      mandatoryFloorTier,
      impactFloorApplied: tier.impactFloorApplied,
      agencyMinTier: tier.agencyMinTier,
      agencyFloorApplied: tier.agencyFloorApplied,
      agencyPending: tier.agencyPending,
      agencyTierLabel: agentic ? agentic.tierLabel : "",
      actionCapable,
      perActionReview: review,
      controlEvidence,
      controlEvidenceRef: controlEvidenceRef === undefined ? "" : String(controlEvidenceRef).trim(),
      verificationRef: verificationRef === undefined ? "" : String(verificationRef).trim(),
      evidenceRefMissing: !!tier.refMissing,
      tierBasis: tier.basis,
      tierFloored: tier.effectiveTierName !== residualTierName,
      floorReason: tier.reasons.join(" + "),
      assuranceIntensity: assuranceIntensity(tier.effectiveTierName, ids),
      decisionRoute: decisionRouteFor(tier.effectiveTierName),
      governanceStatus: "Triage complete — formal governance approvals pending",
    };
    results.monitoringMinimum = monitoringMinimum(tier.effectiveTierName, actionCapable);
    results.situation = situationOf(profile);
    results.gate4 = gate4Rule(profile);
    results.requirements = assessmentRequirements(profile, results);
    return results;
  }

  // AIG-ASS-02 Risk Assessment E37:E40 values for the control-evidence state the
  // triage used, so a pasted pre-fill reproduces the same C41/C43 reduction (T-04).
  function controlEvidenceFields(results) {
    const stated = results.controlEvidence || "";
    const verified = stated === "Implemented, evidenced and independently verified";
    const evidenced = verified || stated === "Implemented and evidenced";
    return [
      ["Controls evidenced?", evidenced ? "Yes" : "No"],
      ["Control evidence ref", evidenced ? results.controlEvidenceRef || "" : ""],
      ["Independent check?", verified ? "Yes" : "No"],
      ["Verification ref", verified ? results.verificationRef || "" : ""],
    ];
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
    // Playbook §4.5.9 / AIG-ASS-05: a completed DPIA is normally required for High and
    // Critical uses that process personal data; the DPO confirms the Article 35 test.
    const highTierPersonal =
      (results.effectiveTierName === "High" || results.effectiveTierName === "Critical") &&
      profile.dataType && profile.dataType !== "None";
    if (specialData || highTierPersonal || triggerSet.has("housingCare") || triggerSet.has("statutory")) {
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
    const gate4 = gate4Rule(profile);

    return {
      supplierChecks: gate4.supplierChecks,
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

  // Playbook §3.8.2.1 / Appendix F.6: light-touch only for a Priority 4-5,
  // Low-tier, non-action-capable use with no mandatory trigger and no indicated
  // specialist assessment. The AI Governance Lead still validates the route.
  function lowTierCandidate(profile, results) {
    const req = assessmentRequirements(profile, results);
    const label = (results.priority && results.priority.label) || "";
    const lowPriority = label.indexOf("Priority 4") === 0 || label.indexOf("Priority 5") === 0;
    const anyAssessment =
      req.dpia.startsWith("Potential DPIA") ||
      req.eia.startsWith("Potential full assessment") ||
      req.humanRightsPotential ||
      req.supplierDueDiligence;
    // v3.9.2 (T-01): only a new use can take the light-touch route. AI found already
    // in use goes through full retrospective intake; a changed use re-enters intake.
    const newUse = situationOf(profile) === SITUATIONS.new && !isFoundInUse(profile);
    return newUse && !results.governanceInvestigation && lowPriority && results.effectiveTierName === "Low" &&
      !(results.triggerIds || []).length && !anyAssessment && !isAgentSystem(profile, results);
  }
  // Light-touch needs everything above AND an all-No Fast Track that the rest of the
  // profile does not contradict (Copilot simulation finding, 3 October 2026: Light-touch
  // was shown without any Fast-Track answers being recorded).
  function isLightTouch(profile, results) {
    return lowTierCandidate(profile, results) && fastTrackOf(profile) === FAST_TRACK.allNo &&
      !fastTrackConflicts(profile).length;
  }
  // Why a use that otherwise looks low enough is not Light-touch ("" when it is, or
  // when it was never a candidate).
  function lightTouchBlockReason(profile, results) {
    if (!lowTierCandidate(profile, results) || isLightTouch(profile, results)) return "";
    const ft = fastTrackOf(profile);
    if (ft === FAST_TRACK.notDone) return "No Fast-Track Screening (AIG-INV-02) is recorded, so the use goes through full Intake (AIG-INV-03) and the Standard route at the Low tier.";
    if (ft === FAST_TRACK.notAllNo) return "The Fast-Track Screening (AIG-INV-02) had at least one Yes or Unsure, so Light-touch is not available. The use goes through full Intake (AIG-INV-03) and the Standard route at the Low tier.";
    return `Fast Track is recorded as all ten No, but this profile means ${fastTrackConflicts(profile).join(", ")} would be Yes. Check the Fast-Track answers; until they agree, the use takes the Standard route at the Low tier.`;
  }

  // Governance by trigger, not by catalogue (Playbook §3.8.2.4):
  // screening applies at every tier; fuller assessments follow tier, triggers and
  // action capability.
  function buildEvidenceList(profile, results) {
    const requirements = assessmentRequirements(profile, results);
    const tier = results.effectiveTierName;
    const triggered = (results.triggerIds || []).length > 0;
    const canAct = isAgentSystem(profile, results);
    const lightTouch = isLightTouch(profile, results);
    const evidence = [
      "AI Intake Form and AI Register entry",
      "AGPI triage result",
      "AI Risk Assessment Worksheet",
    ];
    // §4.6.4: completed for each Medium, High and Critical UC-ID.
    if (tier !== "Low" || triggered || canAct) {
      evidence.push("Responsible AI Assessment");
    }
    // Playbook §4.5.9: the AI Security Review Checklist is a High/Critical minimum and
    // applies to action-capable systems at every tier (AIG-ASS-11). Since suite v3.9.4 the
    // item names the Section 8 threat model, required at these tiers and for any
    // action-capable AI (a §4.4.6 trigger always sets at least High).
    if (tier === "High" || tier === "Critical" || triggered || canAct) {
      evidence.push(SECURITY_REVIEW_EVIDENCE);
    } else {
      evidence.push("Security policy compliance check (full Security Review Checklist from High risk, for systems that can act, or where the security owner asks)");
    }
    // Appendix A.4: every model has a model card; proportionate for light-touch.
    evidence.push(lightTouch ? "Model Card (short form: purpose, limits, owner)" : "Model Card");
    evidence.push(
      "Evidence Index",
      "Equality Act 2010 section 149 screening (all tiers; equality-owner confirmation)",
      "Human Rights Act 1998 section 6 screening (all tiers; legal-owner confirmation)",
      "Data protection and privacy screening (all tiers; DPO confirmation where relevant)",
    );
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
    } else if (requirements.supplierChecks === "partial") {
      evidence.push(`Supplier checks that still apply (Gate 4 ${GATE4_NA_EXISTING}): ${SUPPLIER_CHECKS}`);
    } else if (requirements.supplierChecks === "confirm") {
      evidence.push("Procurement route to confirm: Gate 4 and the Supplier AI Due Diligence Questionnaire (AIG-ASS-08) apply if a procurement, new contract, licence change or contract variation is needed");
    }
    // Playbook §3.10.1 / §3.10.2 (v3.9.2, W-11): High needs an independent assurance
    // review (§4.5.3, §4.5.9); Critical needs independent challenge as well.
    if (results.effectiveTierName === "Critical") {
      evidence.push("Independent challenge and independent assurance (Playbook \u00a73.10.2)");
    } else if (results.effectiveTierName === "High") {
      evidence.push("Independent assurance review (Playbook \u00a74.5.3, \u00a74.5.9)");
    } else if (results.triggerIds.length) {
      evidence.push("Independent or enhanced assurance evidence");
    }
    // v3.9 (Proposed — for Council confirmation): resident-facing generative AI at
    // Medium needs a documented adversarial test (AIG-ASS-11 Section 7) before Gate 6.
    if (isResidentFacingGenerativeMedium(profile, results)) {
      evidence.push(ADVERSARIAL_TEST);
    }
    if (canAct) {
      evidence.push("Agentic Triage result (AIG-AGT-03) and Agent Record (AIG-AGT-04); agentic control checkpoints evidenced at Gate 2 and re-confirmed at Gate 6");
      const agencyNum = agencyTierNumber(results);
      if (agencyNum >= 3) evidence.push("Formal AI Assurance Board recommendation before the decision (agency tier T3 or above)");
      if (agencyNum >= 4) evidence.push("AIG-ASS-11 security review (ASI01–ASI10) complete before the Gate 2 decision (agency tier T4 or above)");
      if (agencyNum >= 5) evidence.push("Executive and safety escalation (SRO and Executive Sponsor oversight; independent challenge); no consequential production use until resolved (agency tier T5)");
    }
    return [...new Set(evidence)];
  }

  // v3.9.1 (Proposed — for Council confirmation): AIG-OPS-01 section 8 "Rollback and Contingency" adds the
  // business continuity link (Civil Contingencies Act 2004; AIG-AIMS-05 REQ-054); the label and question are
  // quoted exactly from AIG-OPS-01 v1.8 (unchanged from v1.6) and are evidenced at Gate 6 (go-live).
  const BUSINESS_CONTINUITY_LINK =
    "AIG-OPS-01 section 8, Business continuity link (Proposed — for Council confirmation): Is this service a prioritised activity in the Council's business continuity plan? Yes / No / Not known. If yes, give the plan reference and confirm the fallback above is consistent with it.";

  const ADVERSARIAL_TEST =
    "Adversarial test for resident-facing generative AI (AIG-ASS-11 Section 7) before go-live (Gate 6) (Proposed — for Council confirmation)";

  // v3.9.4: required evidence at High, Critical and for action-capable uses names the
  // AIG-ASS-11 Section 8 threat model (Proposed — for Council confirmation).
  const SECURITY_REVIEW_EVIDENCE = "AI Security Review Checklist, including the Section 8 threat model";

  function isResidentFacingGenerativeMedium(profile, results) {
    return results.effectiveTierName === "Medium" &&
      profile.publicFacing === "Yes" &&
      profile.capability === "Generative AI";
  }

  function agencyTierNumber(results) {
    const match = /^T(\d)/.exec((results && results.agencyTierLabel) || "");
    return match ? Number(match[1]) : null;
  }

  // Prospective gate route (AIG-DEC-01 v1.11 Gate Map, gates 1 to 6), with the AI
  // Assurance Board's assurance input shown as a separate, non-deciding step. The
  // governing tier sets which gates apply; the AGPI priority sets urgency only.
  // Gate 2 and Gate 6 are mandatory for every action-capable use (R1, R2); Gate 4
  // applies when procured; Gate 5 applies from Medium (Playbook §4.6.4).
  // Non-applicable gates are proposed as Conditional: only the governance steward
  // marks a gate N/A in the Gate Plan.
  function buildRoute(profile, results, forums) {
    const configured = { ...DEFAULT_FORUMS, ...(forums || {}) };
    const gate4 = gate4Rule(profile);
    const retrospective = isFoundInUse(profile);
    const reentry = isReentry(profile);
    const assuranceEvidence = buildEvidenceList(profile, results);
    const tier = results.effectiveTierName;
    const atLeast = (name) => TIER_ORDER.indexOf(tier) >= TIER_ORDER.indexOf(name);
    const canAct = isAgentSystem(profile, results);
    const agencyNum = agencyTierNumber(results);
    const pendingNote = results.agencyPending
      ? " The agency tier is not yet assessed: the governing tier is at least " + tier + " and may rise once Agentic Triage (AIG-AGT-03) sets the minimum pathway."
      : "";
    const unsureNote = profile.actionAuthority === ACTION_AUTHORITY.unsure
      ? " \u201cCan it act?\u201d is Unsure, so it is treated as Yes until confirmed."
      : "";
    const gate2Required = canAct || atLeast("High");
    const gate5Required = atLeast("Medium");
    const g13 = gates13Rule(profile, results);
    const g13Status = "Not applicable (proposed) · governance steward confirms under the AIG-DEC-01 Gate 1 and 3 rule";
    const boardRecommendation = agencyNum !== null && agencyNum >= 3;
    const status = (required) => required
      ? (retrospective ? "Draft plan — required (retrospective)" : "Draft plan — required")
      : "Conditional — governance steward confirms or marks N/A in the Gate Plan";

    return [
      {
        sequence: 1,
        key: "strategic",
        gate: DEC04_GATES[1],
        gateNumber: 1,
        requirement: "Gate 1 · Strategic prioritisation",
        applicability: g13.na1 ? "Not applicable" : "Required",
        planRequirement: g13.na1 ? "Not applicable" : "Required",
        naRationale: g13.rationale1,
        forum: configured.strategic,
        decision: retrospective
          ? "Does the purpose, ownership and continued strategic fit support retaining this live system? (Invest in discovery, or reject.)"
          : reentry
            ? "Re-entry for a change to a use already in governance: is the changed use still aligned and worth progressing on the same AIR-ID? (Invest in discovery, or reject.)"
            : "Is the proposal aligned, sufficiently defined and worth progressing to the next gate? (Invest in discovery, or reject.)",
        evidence: [
          "AI Intake Form (AIG-INV-03) and AIR-ID",
          "Named Service Owner",
          "Purpose and expected benefits",
          "AGPI triage result (urgency) and provisional governing tier (AIG-ASS-01 / AIG-ASS-02)",
          "Decision-Ready Paper (AIG-DEC-02)",
        ],
        status: g13.na1 ? g13Status : status(true),
        handoff:
          "The AGPI priority sets how quickly governance looks at this use; the route is set by the governing tier. The forum's decision belongs in AIG-DEC-03 or approved minutes, with a dated AIG-DEC-04 Gate Event.",
      },
      {
        sequence: 2,
        key: "technical",
        gate: DEC04_GATES[2],
        gateNumber: 2,
        requirement: "Gate 2 · Technical design review",
        applicability: gate2Required ? "Required" : "Conditional",
        forum: canAct ? `${configured.technical} (AI Governance Working Group input)` : configured.technical,
        decision:
          "Is the design feasible, secure, supportable and aligned to architecture and data standards?" +
          (canAct
            ? " Mandatory for every action-capable use (any agency tier, including T0): the agentic control checkpoints (memory control, tool/interface authority, delegation chain, containment/kill switch, identity/credentials, rollback) are evidenced here." + unsureNote
            : gate2Required
              ? " Mandatory for High and Critical."
              : " Mandatory for High, Critical and action-capable uses; otherwise only where a fundamental architectural change is involved.") +
          (boardRecommendation ? " A formal AI Assurance Board recommendation is needed before the decision (agency tier T3 or above)." : "") +
          (agencyNum !== null && agencyNum >= 4 ? " The AIG-ASS-11 security review (ASI01–ASI10) must be complete before this decision (agency tier T4 or above)." : ""),
        evidence: [
          "Solution design, data flows, integrations and permissions",
          "Security Review (AIG-ASS-11)",
          "Model Card (AIG-ASS-09), including explainability",
          "Test approach and acceptance criteria",
          ...(canAct ? ["Agentic Triage result (AIG-AGT-03) and Agent Record (AIG-AGT-04); agentic control checkpoints evidenced"] : []),
        ],
        status: status(gate2Required),
        handoff:
          "Propose the requirement in the AIG-DEC-04 Gate plan. Record a dated decision as a separate Gate Event and create each condition as an event-linked Condition only after the authorised decision." + pendingNote,
      },
      {
        sequence: 3,
        key: "assurance",
        gate: null,
        gateNumber: null,
        requirement: "Assurance input (not a decision gate)",
        applicability: "Assurance input",
        forum: configured.assurance,
        decision:
          "Is AI-specific risk sufficiently understood and controlled to give a versioned assurance opinion and recommendations to the deciding forum? The Board gives assurance and recommendations; it does not decide." +
          (boardRecommendation ? " Agency tier T3 or above: a formal Board recommendation is required before the decision." : ""),
        evidence: assuranceEvidence,
        status: `Assurance input — ${results.assuranceIntensity.toLowerCase()} assurance`,
        handoff:
          "The assurance owner may give a versioned assurance opinion (an AIG-DEC-04 Assurance opinion event) and carry forward conditions; triage itself is not an assurance opinion or a decision.",
      },
      {
        sequence: 4,
        key: "digital",
        gate: DEC04_GATES[3],
        gateNumber: 3,
        requirement: "Gate 3 · Case for change / strategic alignment",
        applicability: g13.na3 ? "Not applicable" : "Required",
        planRequirement: g13.na3 ? "Not applicable" : "Required",
        naRationale: g13.rationale3,
        forum: configured.digital,
        decision:
          "Strategic alignment, cost-benefit and delivery dates: should the investment progress within portfolio, funding, dependency and delivery constraints?",
        evidence: [
          "Carried-forward triage and risk",
          "DPIA (AIG-ASS-05), EIA (AIG-ASS-06) and Human Rights (AIG-ASS-07) screening",
          "Business case or proportionate benefits statement",
          "Versioned AI assurance opinion",
          "Material open conditions",
        ],
        status: g13.na3 ? g13Status : status(true),
        handoff:
          "Prepare the decision question and evidence; the forum records any decision in AIG-DEC-03 or approved minutes.",
      },
      {
        sequence: 5,
        key: "commercial",
        gate: DEC04_GATES[4],
        gateNumber: 4,
        requirement: "Gate 4 · Procurement",
        applicability: gate4.applies === true ? "Required" : gate4.applies === false ? "Not applicable" : "Conditional",
        planRequirement: gate4.planRequirement,
        naRationale: gate4.naRationale,
        forum: configured.commercial,
        decision:
          "Funding, tendering and contract award: is the procurement route, supplier and contract acceptable under the relevant delegated authority? Gate 4 applies wherever a procurement, new contract, licence change or contract variation is needed (AIG-DEC-01 v1.11; Proposed \u2014 for Council confirmation).",
        evidence: gate4.applies === true || gate4.applies === null
          ? [
            "Supplier AI Due Diligence Questionnaire (AIG-ASS-08)",
            "Third-party information-security questionnaire",
            "AI-specific contract terms, audit and change-notification rights",
            "Versioned AI assurance opinion",
          ]
          : gate4.supplierChecks === "partial"
            ? [`Supplier checks that still apply: ${SUPPLIER_CHECKS}`, "Gate Plan N/A rationale and authority ref"]
            : ["Gate Plan N/A rationale and authority ref"],
        status: gate4.applies === true
          ? (retrospective ? "Draft plan — required (retrospective)" : "Draft plan — required") + " · new contract, licence change or variation"
          : gate4.applies === false
            ? `${gate4.label} · governance steward confirms the N/A rationale and authority ref`
            : "Conditional: procurement route not yet known; answer the procurement question",
        handoff: `Procurement route: ${gate4.route}. ${gate4.note}`,
      },
      {
        sequence: 6,
        key: "ethics",
        gate: DEC04_GATES[5],
        gateNumber: 5,
        requirement: "Gate 5 · Ethics assessment",
        applicability: gate5Required ? "Required" : "Conditional",
        forum: configured.ethics,
        decision:
          "Is it ethically acceptable to deploy? Applies from Medium (Playbook §4.6.4); at Low only where the Governance Checklist (AIG-ASS-03) assigns it.",
        evidence: [
          "Responsible AI Assessment (AIG-ASS-04)",
          "Bias testing and monitoring plan",
          "Human-in-the-loop validation",
          ...(g13.na3 && gate5Required ? CARRIED_FROM_GATES_1_3 : []),
        ],
        status: status(gate5Required),
        handoff: gate5Required
          ? "Required for Medium, High and Critical UC-IDs; the named ethics decision owner decides within its delegation."
          : "At Low, only where the Governance Checklist (AIG-ASS-03) assigns it; otherwise the steward marks N/A in the Gate Plan.",
      },
      {
        sequence: 7,
        key: "release",
        gate: DEC04_GATES[6],
        gateNumber: 6,
        requirement: retrospective
          ? "Gate 6 · Deployment / go-live (continuation decision)"
          : "Gate 6 · Deployment / go-live",
        applicability: "Required",
        forum: configured.release,
        decision:
          (retrospective
            ? "Should the live service continue, continue with conditions, be suspended or return for remediation?"
            : "Whether to authorise go-live once approval conditions are closed or formally accepted.") +
          ` Decision route for the governing tier: ${results.decisionRoute}.` +
          (canAct ? " Mandatory for every action-capable use: grants the permitted autonomy level for this UC-ID (it may be lower than requested), recorded in AIG-DEC-03 and written to AIG-AGT-04; agentic control checkpoints re-confirmed." : "") +
          (agencyNum !== null && agencyNum >= 5 ? " Agency tier T5: executive and safety escalation; no consequential production use until resolved." : ""),
        evidence: [
          "Deployment and Rollout Plan (AIG-OPS-01)",
          "Approval conditions closed or formally accepted",
          "Monitoring plan with agreed thresholds and who agreed them (AIG-OPS-01 section 7; AIG-OPS-02)",
          "Incident, rollback and suspension arrangements",
          BUSINESS_CONTINUITY_LINK,
          "Final Model Card and Evidence Index",
          ...(atLeast("High") || canAct ? ["Security Review (AIG-ASS-11) outcome confirmed"] : []),
          ...(isResidentFacingGenerativeMedium(profile, results) ? [ADVERSARIAL_TEST] : []),
          "ATRS applicability / publication owner confirmation and evidence reference (pending; case-specific)",
          ...(g13.na3 && !gate5Required ? CARRIED_FROM_GATES_1_3 : []),
        ],
        status: status(true),
        handoff:
          "If authorised, record the go-live decision in AIG-DEC-03 or approved minutes, link the dated AIG-DEC-04 Gate Event, and record each condition separately. Triage does not approve deployment.",
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

  function ucIdEntryStatus(profile) {
    return profile.ucId
      ? profile.ucIdStatus || "Operator-entered; verification pending"
      : "Pending — no UC-ID entered; use-specific provisional case, not shared system baseline";
  }

  function isAgentSystem(profile, results) {
    return isActionCapable(profile, results && results.triggerIds);
  }
  const REGISTER_LIFECYCLE_STAGES = [
    "Idea and Innovation", "Registration and Intake", "Risk Assessment and Review",
    "Approval and Assurance", "Deployment and Operation", "Monitoring and Review",
    "Retirement and Decommissioning",
  ];

  function registerDate(value) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || "");
    return m ? `${m[3]}/${m[2]}/${m[1]}` : (value || "");
  }

  // AIG-INV-04 "Personal / special category data?" controlled list.
  function registerDataValue(dataType) {
    return {
      "Special category data": "Yes — special category",
      "Personal data": "Yes — personal data",
      None: "No",
    }[dataType] || "Unsure";
  }

  // One handoff row per AIG-INV-04 column (AI Register A:Z, Assessment summary A:U),
  // in workbook order, excluding the formula-owned Row check columns.
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
    const uc = profile.ucId || "(pending)";
    const usePurpose = profile.usePurpose || profile.purpose || "(not entered)";

    // Blank status/reference fields are deliberate: triage cannot establish current
    // state, formal decisions, assessment records or IDs.
    const reg = "AI Register";
    add(reg, "AIR-ID", profile.registerId, identityReview);
    add(reg, "System name", profile.systemName, "Verify against the current authoritative record.");
    add(reg, "Purpose and boundary", profile.purpose, "Intake proposal only; not approved purpose. The authorised owner confirms purpose and boundary.");
    add(reg, "Service area", profile.serviceArea, "Verify locally against the current record.");
    add(reg, "Service Owner", profile.serviceOwner, "Verify the current accountable owner.");
    add(reg, "Supplier / source", supplierSource, "Combined from separate intake prompts for review; verify the supplier/source value against the actual workbook field and source.");
    // The Register's "Lifecycle stage" is a governance stage, not the operational state
    // asked on the form. A case being triaged is at Risk Assessment and Review (intake and
    // the AIR-ID come before triage, the decision after), except a retired system.
    const registerLifecycle = profile.lifecycle === "Retired"
      ? "Retirement and Decommissioning"
      : "Risk Assessment and Review";
    add(reg, "Lifecycle stage", registerLifecycle,
      `Proposed from where this case sits: it is being triaged${profile.lifecycle === "Retired" ? " as a retired system" : ""}. Operational state entered: ${profile.lifecycle || "not stated"}. The AI Governance Lead confirms the stage against the current AIG-INV-04 record.`);
    add(reg, "Governance Approval Status (system baseline; not use approval)", "", "Do not infer or change current approval status. Formal decisions remain in AIG-DEC-03 or authorised native minutes.");
    add(reg, "Operational Status (system baseline)", "", "Do not infer or change current operational status; verify the current AIG-INV-04 record.");
    add(reg, "Can it act?", "", `Do not set Yes/No/Unsure from this triage. Triage screen answer: ${results.actionCapable ? "can act" : "cannot act"}${profile.actionAuthority === ACTION_AUTHORITY.unsure ? " (Unsure, treated as Yes until confirmed)" : ""}. Verify actual capability and permissions against AIG-AGT-04 and complete the applicable agent assessment.`);
    add(reg, "Decision record ref", "", "Only the authorised owner supplies a reference to an actual AIG-DEC-03 or approved native decision record.");
    add(reg, "Latest gate Event ID", "", "Only the AIG-DEC-04 owner supplies the ID of an actual dated Gate Event; triage creates none.");
    add(reg, "Assessment / evidence ref", "", "Add only an existing, verified reference; evidence remains at source.");
    add(reg, "Next review", "", "Set by the accountable owner from the approved review schedule.");
    add(reg, "UC-ID(s) covered — approved purpose and scope (one per line or AIG-DEC-03 ref)", "", `Approved scope only. Triage covers UC-ID ${uc} ("${usePurpose}"), which is not approved; add it only after the delegated decision is recorded in AIG-DEC-03.`);
    add(reg, "AI capability and systems/tools permitted (pointer)", "", `Permitted capability is set by the authorised decision and AIG-AGT-04, not by intake. Intake context: ${profile.capability || "capability not stated"}; systems/tools: ${profile.systemsAccessed || "not stated"}.`);
    add(reg, "Date registered", "", "Set by the governance steward when the AIR-ID is registered.");
    add(reg, "Date first used", registerDate(profile.dateFirstUsed), "Operator-entered date (dd/mm/yyyy); verify against the service record.");
    add(reg, "Personal / special category data?", registerDataValue(profile.dataType), "Intake answer mapped to the AIG-INV-04 list; the DPO or privacy owner confirms.");
    add(reg, "ATRS requirement", "To assess", `The case-specific or legal owner confirms. Triage indication: ${results.requirements ? results.requirements.atrs : "owner confirmation pending"}.`);
    add(reg, "Model Card completion", "", "Set from the actual Model Card (AIG-ASS-09) status; not asserted by triage.");
    add(reg, "Monitoring in place?", "", "Set from the actual AIG-OPS-02 record; not asserted by triage.");
    add(reg, "Last review date", "", "Set when an actual review is recorded.");
    add(reg, "Route / pathway", "To be determined", `System-level route follows the highest applicable UC-ID. This UC-ID triage indicates ${isLightTouch(profile, results) ? "Light-touch" : results.effectiveTierName}${results.agencyPending ? " (at least; agency tier not yet assessed)" : ""}; the AI Governance Lead confirms.`);
    add(reg, "Intake type", isFoundInUse(profile) ? "Retrospective" : isReentry(profile) ? "" : "New",
      isReentry(profile)
        ? `${situationOf(profile)}: keep the Intake type already on the AIG-INV-04 row for this AIR-ID; the change re-enters intake and triage on the same AIR-ID.`
        : "Proposed from \u201cWhat's happening?\u201d and the operational state (found already in use or Live \u2192 Retrospective); use Aggregated only for an aggregated tool-level entry.");

    const sum = "Assessment summary";
    add(sum, "AIR-ID", profile.registerId, identityReview);
    add(sum, "Effective Governance Priority (AIG-ASS-01, after any authorised override)", "", `Leave blank: AIG-INV-04 Assessment summary is a one-row-per-AIR-ID system summary, not a UC-specific priority slot. This ${results.priority.label} (score ${results.agpiScore}) is a use-specific triage prompt for UC-ID ${uc} and exact use purpose "${usePurpose}"; do not write it to the system summary. Re-score materially different uses separately, then have the owner reconcile the system-level summary and current AIG-ASS-01 from authoritative assessments.`);
    add(sum, "AIG-ASS-01 ref / date", "", "Only enter an existing, verified AIG-ASS-01 record reference and date.");
    add(sum, "Risk tier (AIG-ASS-02; highest applicable UC-ID or baseline)", "", `UC-ID ${uc}; exact use purpose "${usePurpose}". Triage governing tier is ${results.effectiveTierName}${results.agencyPending ? " (at least; agency tier not yet assessed)" : ""}; it is not the current assessor-confirmed AIG-ASS-02 tier or evidence reference. The system summary holds the highest applicable UC-ID or baseline tier.`);
    add(sum, "AIG-ASS-02 ref / date", "", "Only enter an existing, verified AIG-ASS-02 assessment reference and date.");
    add(sum, "Agency tier (AIG-AGT-02/AIG-AGT-03)", agentic && agentic.tierLabel, "Draft agentic triage only; verify the authorised assessment and applicable AIG-AGT-02/AIG-AGT-03 record.");
    add(sum, "AIG-AGT-02/AIG-AGT-03 ref / date", "", "Only enter an existing, verified AIG-AGT-02/AIG-AGT-03 assessment reference and date.");
    add(sum, "Privacy / DPIA position", `Privacy screening required; ${results.requirements.dpia || "DPIA position requires screening"}`, "Screening/indication only; DPO or privacy owner determines applicability and completion.");
    add(sum, "Equality / EIA position", `Equality screening required; ${results.requirements.eia || "EIA position requires screening"}`, "Screening/indication only; equality owner determines applicability and completion.");
    add(sum, "Other specialist finding refs", "", "Only enter existing, verified specialist record references.");
    add(sum, "AIG-AGT-04 Agent Record ref", agentic && agentic.asbomRef, "User-entered pointer only; confirm the existing authorised AIG-AGT-04 Agent Record.");
    add(sum, "AIG-AGT-05 Authority Graph ref", "", "Only enter an existing verified AIG-AGT-05 reference; the map or triage does not grant authority.");
    add(sum, "AIG-OPS-02 Monitoring ref", "", "Only enter an existing, verified AIG-OPS-02 record reference.");
    add(sum, "As-at date", "", "Set only when the authorised owner verifies and updates the assessment summary.");
    add(sum, "AGPI score (0–100, AIG-ASS-01)", "", `Leave blank: system summary. This UC-ID triage scored ${results.agpiScore}; reconcile from the authoritative AIG-ASS-01 record.`);
    add(sum, "Inherent risk score (L × I)", "", `Leave blank: system summary. This UC-ID triage gives ${results.risk.inherent}; reconcile from the authoritative AIG-ASS-02 record.`);
    add(sum, "Control effectiveness (1–5)", "", `Leave blank: system summary. This UC-ID triage entered ${results.risk.control}; reconcile from AIG-ASS-02.`);
    add(sum, "Residual risk score", "", `Leave blank: system summary. This UC-ID triage gives ${results.risk.residual}; reconcile from AIG-ASS-02.`);
    add(sum, "Decisions about individuals — Art 22A flag / AIG-OPS-04 tier", "", `Owner assesses (Tier A / B / C or Unsure — assess). Intake: materially affects individuals = ${profile.affectsIndividuals || "not stated"}.`);
    add(sum, "Latest priority-override Event ID (AIG-DEC-04)", "", "Only an actual Priority override Gate Event ID; triage creates none.");
    add(sum, "Reconciled on", "", "Date the owner reconciles this row against source records.");
    return { headers: DRAFT_HANDOFF_HEADERS.slice(), rows };
  }

  function buildCapabilitiesMapHandoff(profile, results) {
    const UCV = "UC_ID_Risk_Decision_Current_View / proposed pointer only";
    const headers = [
      "Target workbook / sheet",
      "Suggested field",
      "Draft proposal",
      "Review, evidence or authority still required",
    ];
    const rows = [
      ["AIG-INV-05 Capabilities and System Map / Use cases", "UC-ID", profile.ucId || "", profile.ucId ? `${profile.ucIdStatus || "Operator-entered; verification pending"}. Verify against the catalogue/current owner; this tool never issues identifiers or verifies an ID.` : "UC-ID pending by operator choice for this use-specific case; blank does not mean shared system baseline. Leave pending until a verified existing or provisional identifier is supplied. This tool never issues identifiers."],
      ["AIG-INV-05 Capabilities and System Map / Use cases", "Outcome-led use case", profile.usePurpose || profile.purpose || "", `Exact scoped purpose/outcome proposal for UC-ID ${profile.ucId || "(pending)"}; confirm one materially distinct outcome/workflow and reconcile against the canonical AIG-INV-03 source. Not an approved mandate.`],
      ["AIG-INV-05 Capabilities and System Map / Use cases", "Note (not a column) — UC-ID status (operator entry only)", ucIdEntryStatus(profile), "An operator statement is not independent verification; catalogue owner verifies current ID and source."],
      ["AIG-INV-05 Capabilities and System Map / Use cases", "Service / workflow", profile.serviceArea || "", "Confirm the service/workflow with its owner."],
      ["AIG-INV-05 Capabilities and System Map / Use cases", "Service Owner", profile.serviceOwner || "", "Confirm accountable owner and their authority to validate this map entry."],
      ["AIG-INV-05 Capabilities and System Map / Use cases", "Canonical AIG-INV-03 / source ref", "", "Add an exact source artefact and row/URI; do not copy source records."],
      ["AIG-INV-05 Capabilities and System Map / Use cases", "AIR-ID (only if issued)", profile.registerId || "", profile.registerId ? "Verify the existing permanent AIR-ID against current AIG-INV-04; do not replace or mint it." : "Blank is valid at this proposal stage; only add an official AIR-ID after one is issued and verified in AIG-INV-04."],
      ["AIG-INV-05 Capabilities and System Map / Use cases", "Confidence", "Unknown", "Controlled value (High, Medium, Low, Unknown). Raise only when the owner has checked the source."],
      ["AIG-INV-05 Capabilities and System Map / Use cases", "Verified on", "", "Date the owner verifies the entry against its source; blank until then."],
      ["AIG-INV-05 Capabilities and System Map / Use cases", "State", "Proposed", "Controlled value (Proposed, Confirmed, Superseded). Do not mark Confirmed without a named owner, source, High/Medium confidence and verification date."],
      ["AIG-INV-05 Capabilities and System Map / Use cases", "Use-specific decision / minutes ref (pointer only)", "", "Only a verified reference to an actual AIG-DEC-03 or approved minutes record for this UC-ID; none exists at triage."],
      ["AIG-INV-05 Capabilities and System Map / Use cases", "UC-specific monitoring ref (pointer only)", "", "Only a verified AIG-OPS-02 reference once monitoring for this UC-ID exists."],
      ["AIG-INV-05 Capabilities and System Map / Use cases", "Index role (descriptive; not approval)", "", "Descriptive role of this row in the index, set by the map owner; it is never an approval."],
      ["AIG-INV-05 Capabilities and System Map / Capabilities", "CAP-ID", "", "Propose only under approved catalogue and ID rules; this tool never issues identifiers."],
      ["AIG-INV-05 Capabilities and System Map / Capabilities", "Function (verb + noun)", profile.capability || "", "Triage classification is only a starting point; rewrite as an atomic reusable function and confirm inputs, outputs, boundary, owner and source."],
      ["AIG-INV-05 Capabilities and System Map / Capabilities", "Inputs", "", "Capability owner and service specialist define and verify; do not infer from the intake category."],
      ["AIG-INV-05 Capabilities and System Map / Capabilities", "Outputs", "", "Capability owner and service specialist define and verify; do not infer from the intake category."],
      ["AIG-INV-05 Capabilities and System Map / Capabilities", "Boundary / excluded use", "", "Capability owner states what the capability must not be used for."],
      ["AIG-INV-05 Capabilities and System Map / Capabilities", "Capability owner", "", "Named owner who defines and maintains this capability."],
      ["AIG-INV-05 Capabilities and System Map / Capabilities", "Definition source ref", "", "Exact source artefact and row/URI for the capability definition."],
      ["AIG-INV-05 Capabilities and System Map / Capabilities", "Confidence", "Unknown", "Controlled value (High, Medium, Low, Unknown)."],
      ["AIG-INV-05 Capabilities and System Map / Capabilities", "Verified on", "", "Date the capability owner verifies the definition; blank until then."],
      ["AIG-INV-05 Capabilities and System Map / Capabilities", "State", "Proposed", "Controlled value (Proposed, Confirmed, Superseded)."],
      ["AIG-INV-05 Capabilities and System Map / Relationships", "Map Edge ID", "", "Map owner assigns an ID under the approved map rules; this tool never issues one."],
      ["AIG-INV-05 Capabilities and System Map / Relationships", "From type", "UC", "Controlled value. Proposed UC → CAP relationship only; no official AIR-ID is needed for this edge."],
      ["AIG-INV-05 Capabilities and System Map / Relationships", "From ID", profile.ucId || "", profile.ucId ? "UC-ID as entered; verify before use." : "Blank while the UC-ID is pending; do not invent an endpoint."],
      ["AIG-INV-05 Capabilities and System Map / Relationships", "Relationship", "requires", "Controlled value (requires, provided by, references, depends on)."],
      ["AIG-INV-05 Capabilities and System Map / Relationships", "To type", "CAP", "Controlled value."],
      ["AIG-INV-05 Capabilities and System Map / Relationships", "To ID", "", "CAP-ID once assigned under the approved catalogue rules; this tool never issues one."],
      ["AIG-INV-05 Capabilities and System Map / Relationships", "AIR context", "", "Leave blank for UC → CAP. Other relationships require an existing official AIR-ID reconciled to the current AIG-INV-04 record."],
      ["AIG-INV-05 Capabilities and System Map / Relationships", "Meaning / data or action flow", "Use case may require the proposed capability", "Plain statement of what flows or happens along this link; the link owner confirms it."],
      ["AIG-INV-05 Capabilities and System Map / Relationships", "Link owner", "", "Named owner who confirms the link."],
      ["AIG-INV-05 Capabilities and System Map / Relationships", "Evidence / source ref", "", "Exact source artefact and row/URI evidencing the link."],
      ["AIG-INV-05 Capabilities and System Map / Relationships", "Confidence", "Unknown", "Controlled value (High, Medium, Low, Unknown)."],
      ["AIG-INV-05 Capabilities and System Map / Relationships", "Verified on", "", "Date the link owner verifies it; blank until then."],
      ["AIG-INV-05 Capabilities and System Map / Relationships", "State", "Proposed", "Controlled value (Proposed, Confirmed, Superseded). Do not mark Confirmed until both endpoints are source-reconciled with owner, evidence, High/Medium confidence and verification date."],
      [UCV, "UC-ID", profile.ucId || "", `${ucIdEntryStatus(profile)}; operator-entered pointer only. Verify an existing ID or confirm a provisional ID under approved catalogue rules.`],
      [UCV, "AIR-ID", profile.registerId || "", "System identity pointer only; verify against current AIG-INV-04."],
      [UCV, "Outcome / workflow", profile.usePurpose || profile.purpose || "", "Exact scoped proposal only; confirm against the canonical source. Not approved purpose."],
      [UCV, "Service Owner", profile.serviceOwner || "", "Confirm the accountable Service Owner for this use."],
      [UCV, "AGPI priority (UC-specific)", results ? results.priority.label : "", results ? `Triage prompt only (AGPI score ${results.agpiScore}${results.priority.floorApplied ? "; priority floor applied" : ""}${results.priority.overrideApplied ? "; §4.4.6 override applied" : ""}). Not an assessor-confirmed finding; add only after current AIG-ASS-01 source and as-at date are verified.` : "Add only after current AIG-ASS-01 source and as-at date are verified."],
      [UCV, "Risk tier (UC-specific)", results ? results.effectiveTierName : "", results ? `Triage prompt only (governing tier${results.agencyPending ? ", at least; agency tier not yet assessed" : ""}). Not an assessor-confirmed finding; add only after current AIG-ASS-02 source and as-at date are verified.` : "Add only after current AIG-ASS-02 source and as-at date are verified."],
      [UCV, "Assessment ref(s) / as-at", "", "Add verified AIG-ASS-01 / AIG-ASS-02 source references and as-at dates only."],
      [UCV, "Decision outcome (source)", "", "Pointer to an actual source decision only (AIG-DEC-03 outcome list); no status or outcome is inferred or created."],
      [UCV, "Delegated authority / decision ref", "", "Only an existing verified delegation/decision reference; this handoff creates no authority."],
      [UCV, "AIG-DEC-03 / approved minutes ref", "", "Pointer only; authorised decision remains in the source record."],
      [UCV, "Decision scope (UC-ID specific / Shared system baseline)", "UC-ID specific", "Controlled value: this triage is use-specific. A shared baseline never approves a use."],
      [UCV, "Permitted purpose, users, data, actions and exclusions", "", "Only the permitted scope recorded in the actual decision; none exists at triage."],
      [UCV, "Condition ID(s)", "", "Only source-reconciled event-linked condition pointers; none are created here."],
      [UCV, "Condition closure / waiver evidence ref", "", "Pointer only; no closure or waiver is asserted."],
      [UCV, "Condition state (None / Open / Closed-verified / Accepted-open / Waived / Unknown)", "", "Controlled value from the source condition only; not inferred."],
      [UCV, "AIG-DEC-04 dated Decision Event ID", "", "Pointer to an actual dated source event only; this tool creates no event."],
      [UCV, "Decision effective date", "", "From the actual decision record only."],
      [UCV, "Expiry / next review date", "", "From the actual decision record or approved review schedule only."],
      [UCV, "AIG-OPS-02 use-specific monitoring ref / as-at", "", "Pointer only; do not infer monitoring evidence or status."],
      [UCV, "Independent checker / date", "", "Completed by the independent checker only."],
      [UCV, "Reconciliation (Verified / Unverified / Conflict)", "Unverified", "Controlled value: nothing in this handoff has been verified against source records."],
      [UCV, "AIG-DEC-04 Decision event date", "", "Date of the actual dated source event only."],
      ["AIG-INV-05 Capabilities and System Map / System map", "Note (not a column) — System entry", "", "Do not create a system-map row without an existing official AIR-ID. AIG-INV-04 remains authoritative for AIR-ID, purpose, Service Owner and current status."],
      ["AIG-INV-05 Capabilities and System Map / All sheets", "Note (not a column) — Authority and record boundaries", "Proposed controlled AIG-INV-05; draft only", "If adopted, the map is controlled/versioned; it remains a relationship catalogue, not a second Register. Map links grant no access, permission, approval or decision right. AIG-DEC-04 remains separate for plans, dated events and event-linked conditions; AIG-AGT-04 is authoritative for agent scope and AIG-AGT-05 is a derived delegation view."],
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

  // AIG-DEC-04 "Gate plan" sheet columns, in workbook order (A to L).
  const GATE_PLAN_HEADERS = [
    "Plan ID",
    "AIR-ID",
    "Gate / forum",
    "Trigger / stage",
    "Requirement",
    "Basis / triage ref",
    "Target date",
    "Responsible role",
    "Plan state",
    "N-A / waiver rationale and authority ref",
    "UC-ID scope(s) (blank only for explicit system baseline)",
    "Decision scope (UC-ID specific / Shared system baseline)",
  ];
  // Column M of the Gate plan sheet is the workbook's Row check formula. The export
  // leaves it empty and says so, so pasting a whole row does not go unnoticed.
  const GATE_PLAN_ROW_CHECK_NOTE = "Column M is the workbook Row check: paste columns A to L only, never over M";
  const GATE_PLAN_GUIDANCE_HEADERS = [
    "Guidance only, do not paste: configured forum or decision-maker",
    "Guidance only, do not paste: decision question for the forum",
    "Guidance only, do not paste: evidence to bring",
    "Guidance only, do not paste: handoff note",
  ];

  // Paste-ready rows for the AIG-DEC-04 Gate plan sheet, one per applicable
  // AIG-DEC-01 decision gate (1 to 6). Columns A to L match the workbook exactly and
  // every controlled column holds a value from its dropdown: Gate / forum from the
  // Lists sheet, Requirement Required/Conditional (Not applicable for Gate 4 under the
  // AIG-DEC-01 v1.11 rule, with a draft rationale in column J for the steward to confirm),
  // Plan state Planned, Decision scope UC-ID specific. A blank spacer column separates
  // the guidance columns, which are not part of the Gate plan. Plan ID and Target date
  // stay blank for the governance steward: the tool never issues IDs. The AI
  // Assurance Board's assurance input is not a decision gate and has no plan row.
  function buildGatePlanCsv(profile, route, results) {
    const situation = situationOf(profile);
    const stage = `${isFoundInUse(profile)
      ? "Retrospective intake (found already in use)"
      : situation === SITUATIONS.change
        ? "Re-entry: change to a use in governance"
        : situation === SITUATIONS.approved
          ? "Re-entry: use of an approved system outside the approval"
          : "New proposal"} · lifecycle ${profile.lifecycle || "not entered"}`;
    const basis = results
      ? `Triage prompt: AGPI ${results.agpiScore} (${results.priority.label}; urgency only); governing tier ${results.effectiveTierName}${results.agencyPending ? " (at least; agency tier not yet assessed)" : ""}. Verify against current AIG-ASS-01 / AIG-ASS-02 before relying on it.`
      : "Add the AIG-ASS-01 / AIG-ASS-02 reference";
    const headers = [...GATE_PLAN_HEADERS, GATE_PLAN_ROW_CHECK_NOTE, ...GATE_PLAN_GUIDANCE_HEADERS];
    const rows = route.filter((gate) => gate.gate).map((gate) => [
      "",
      profile.registerId || "",
      gate.gate,
      stage,
      gate.planRequirement || (gate.applicability === "Required" ? "Required" : "Conditional"),
      basis,
      "",
      "Service Owner",
      "Planned",
      "",
      profile.ucId || "",
      "UC-ID specific",
      "",
      gate.forum,
      gate.decision,
      gate.evidence.join("; "),
      `${gate.status}. ${gate.naRationale ? `Proposed N/A rationale for column J (the steward confirms it and adds the authority ref, their name and date): ${gate.naRationale} ` : ""}${gate.handoff} UC-ID entry state: ${ucIdEntryStatus(profile)}. Exact scoped purpose/outcome: ${profile.usePurpose || profile.purpose || "(not entered)"}. A Gate plan row is a prospective requirement only; not a decision, approval or Gate Event.`,
    ]);
    return toCsv(headers, rows);
  }


  // AIG-DEC-02 "Forum Decision Paper" template fields, in template order: header
  // block, Decision required, Triage headline (AGPI Priority, Risk tier, Escalation,
  // Route), the per-UC-ID table, Recommendation, Bearing on your decision, Conditions
  // proposed, Full evidence and Decision.
  const DEC02_HEADERS = [
    "AIR-ID", "System", "Forum", "Gate", "Prepared by", "Date",
    "Decision required",
    "Triage headline: AGPI Priority", "Triage headline: Risk tier",
    "Triage headline: Escalation", "Triage headline: Route",
    "UC-ID and use", "AGPI priority; risk tier; assessment refs", "Proposed outcome",
    "Permitted and excluded scope", "Conditions",
    "Delegated authority; effective and review dates",
    "Recommendation", "Bearing on your decision", "Conditions proposed", "Full evidence",
    "Decision",
  ];
  const DEC02_GUIDANCE_HEADERS = [
    "Guidance only: export status",
    "Guidance only: UC-ID entry status (operator statement only; not verification)",
    "Guidance only: exact use purpose / outcome scoped to this triage",
  ];

  // DEC-02 writes the priority as "Priority 2 (High)".
  function paperPriority(label) {
    const m = /^Priority (\d) – (.+)$/.exec(label || "");
    return m ? `Priority ${m[1]} (${m[2]})` : (label || "");
  }

  // DEC-01 / DEC-02 / Playbook §3.8.1 routes: Light-touch, Standard, Enhanced / Agentic
  // (higher-impact or action-capable AI).
  function paperRoute(profile, results) {
    if (isLightTouch(profile, results)) return "Light-touch";
    if (isAgentSystem(profile, results) || results.effectiveTierName === "High" || results.effectiveTierName === "Critical") {
      return "Enhanced / Agentic";
    }
    return "Standard";
  }

  function buildDecisionReadyHandoff(calculation) {
    const { profile, results, route } = calculation;
    const escalation = results.triggerIds.length
      ? triggerTextFor(results.triggerIds).join("; ")
      : "none";
    const headers = [...DEC02_HEADERS, "", ...DEC02_GUIDANCE_HEADERS];
    const priority = paperPriority(results.effectiveGovernancePriority || results.priority.label);
    const tier = results.effectiveTierName + (results.agencyPending ? " (at least; agency tier not yet assessed)" : "");
    // No paper is prepared for a gate proposed Not applicable (Gate 1 and 3 rule, Gate 4 rule).
    const rows = route.filter((gate) => gate.gate && gate.applicability !== "Not applicable").map((gate) => [
      profile.registerId || "",
      profile.systemName || "",
      `${gate.forum} (Gate ${gate.gateNumber}; configure to local name)`,
      `${gate.gateNumber} of route`,
      "",
      "",
      gate.decision,
      priority,
      tier,
      escalation,
      paperRoute(profile, results),
      `${profile.ucId || "UC-ID pending"}: ${profile.usePurpose || profile.purpose || ""}`,
      `${priority}; ${tier}; refs: (owner to complete)`,
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "Draft triage prompt — review and complete in AIG-DEC-02; not an import-ready record. Prepared by and Date are left for the AI Governance Lead / governance function (actual paper date; do not use the export date). Decision boxes stay blank: the officer or forum with confirmed delegation decides, recorded in AIG-DEC-03 or approved minutes.",
      ucIdEntryStatus(profile),
      profile.usePurpose || profile.purpose || "",
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
      schemaVersion: "1.1",
      suiteVersion: `${SUITE.label}; proposed integrated AI governance suite draft — not approved`,
      exportedAt: exportedAt || new Date().toISOString(),
      profile,
      triageScope: {
        ucId: calculation.profile.ucId || "",
        ucIdEntryStatus: ucIdEntryStatus(calculation.profile),
        exactUsePurpose: calculation.profile.usePurpose || calculation.profile.purpose || "",
        basis: "This priority and risk triage is specific to the stated use/outcome, including non-agentic uses. Materially different use/outcome requires distinct UC-ID and separate triage.",
        authority: "Scope metadata only. No approval, filled decision status, delegated authority, gate event or UC-ID is issued.",
      },
      agpi: {
        dimensionScores: { ...calculation.agpiScores },
        score: calculation.results.agpiScore,
        rawPriority: calculation.results.rawAgpiPriority || calculation.results.priority.label,
        effectiveGovernancePriority:
          calculation.results.effectiveGovernancePriority || calculation.results.priority.label,
        agpiBand: calculation.results.priority.band ? calculation.results.priority.band.label : "",
        priorityFloor: calculation.results.priority.floorNote || "",
        overrideRule: calculation.results.priority.overrideNote || "",
        typicalAttention: calculation.results.priority.action || "",
        note: "The priority sets urgency and sequencing only; the route is set by the governing tier (Playbook §3.10.1).",
        authorisedPriorityUplift: null,
      },
      risk: {
        impactScores: { ...calculation.impactScores },
        likelihood: calculation.results.risk.likelihood,
        controlEffectiveness: calculation.results.risk.control,
        controlEvidence: calculation.results.controlEvidence || "",
        mandatoryRiskFloor: calculation.results.mandatoryFloorTier || "",
        tierBasis: calculation.results.tierBasis || "",
        impact: calculation.results.risk.impact,
        inherentRisk: calculation.results.risk.inherent,
        inherentRiskTier: calculation.results.inherentTierName,
        residualRisk: calculation.results.risk.residual,
        residualRiskTier: calculation.results.residualTierName,
        effectiveGovernanceTier: calculation.results.effectiveTierName,
        riskTierWithTriggerFloor: calculation.results.riskTierName || "",
        webTriagePreControlTier: calculation.results.preControlTierName || "",
        impactFloorApplied: !!calculation.results.impactFloorApplied,
        agencyMinimumTier: calculation.results.agencyMinTier || null,
        agencyTierPending: !!calculation.results.agencyPending,
        actionCapable: !!calculation.results.actionCapable,
        perActionHumanReview: calculation.results.perActionReview || "",
        decisionRoute: calculation.results.decisionRoute || "",
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

    items.push({
      artefact: "UC-ID-scoped triage context — applies to all prompts below",
      section: "Use/outcome identity and boundary",
      fields: [
        { label: "AIR-ID (system identity; verify existing)", value: profile.registerId || "Pending — not entered" },
        { label: "UC-ID (operator-entered only)", value: profile.ucId || "Pending — not entered" },
        { label: "UC-ID entry status (not independently verified)", value: ucIdEntryStatus(profile) },
        { label: "Exact purpose / outcome scoped to this triage", value: profile.usePurpose || profile.purpose || "Not entered" },
        { label: "Priority and risk scope", value: "This triage applies only to the stated use/outcome; materially different uses require distinct UC-ID and separate priority/risk triage, including non-agentic uses." },
      ],
      note: "Context only. UC-ID is never auto-issued; use an operator-entered existing/provisional identifier or leave it pending. This does not create approval, decision status, delegated authority or a gate event.",
    });

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
        section: "\u201cCan it act?\u201d screen, agency profile and authority envelope",
        fields: [
          { label: "Can it act (is an agent)?", value: profile.actionAuthority === ACTION_AUTHORITY.unsure ? "Unsure — treated as Yes until confirmed" : "Yes" },
          { label: "Per-action human review evidenced?", value: results.perActionReview === "Unsure" ? "Unsure — treated as No (§4.4.6 Critical floor)" : (results.perActionReview || perActionReview(profile)) },
          { label: "Agentic triage required?", value: "Yes — complete before routing" },
          { label: "Agency tier (triage)", value: results.agencyTierLabel || "Not yet assessed — run Assess agency" },
          { label: "Agency-tier minimum pathway", value: results.agencyMinTier || (results.agencyTierLabel ? "None" : "Pending agency tier") },
        ],
        note: "Run AIG-AGT-03 Agentic Triage: score the five agency dimensions, record the assessed autonomy level and agency tier, test the authority boundary and kill-switch, and open the AIG-AGT-04 Agent Record / ASBOM. Gate 2 (agentic control checkpoints) and Gate 6 (grants the permitted autonomy level) are mandatory for every action-capable use (AIG-DEC-01 R1, R2). The AI Register (AIG-INV-04) records Can it act? and its Assessment summary carries the agency tier; the ASBOM holds the full composition and AIG-AGT-05 Authority Graph derives from it. Consequential actions in service are recorded in AIG-AGT-06.",
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
        section: "Controlled fields (runtime evidence; generated when operated)",
        fields: [
          { label: "AIR-ID", value: profile.registerId || "Pending current AIG-INV-04 AIR-ID" },
          { label: "UC-ID", value: profile.ucId || "Pending — not entered" },
          { label: "Action ID", value: "Not supplied — generated for each consequential action when operated" },
          { label: "Approval/override", value: "Not supplied — recorded at runtime" },
          { label: "Evidence reference", value: "Not supplied — recorded at runtime" },
          { label: "Authority granted by this triage", value: "No" },
        ],
        note: "No action record, decision or authority is created by this handoff. Link actual action records to verified agent / ASBOM identity and authorised boundaries.",
      });
    }

    items.push({
      artefact: "AIG-ASS-05 Data Protection Impact Assessment",
      section: "Section 2 \u2014 Screening \u2014 Is a DPIA Required?",
      fields: [
        { label: "Materially affects individuals?", value: yn(profile.affectsIndividuals) },
        { label: "Public / resident facing?", value: yn(profile.publicFacing) },
      ],
      note: `${requirements.dpia}. A DPO/privacy owner determines case-specific legal requirements and records any assessment outcome; this tool does not establish applicability or completion.`,
    });

    items.push({
        artefact: "AIG-ASS-06 Equality Impact Assessment",
        section: "Section 2 \u2014 Purpose and Affected Groups; Section 149 PSED due-regard evidence",
        fields: [
          { label: "Public / resident facing?", value: yn(profile.publicFacing) },
          { label: "Materially affects individuals?", value: yn(profile.affectsIndividuals) },
        ],
        note: `${requirements.eia}. Screen every system; an equality owner determines whether a fuller assessment is needed. AGPI does not waive the public sector equality duty.`,
      });

    items.push({
        artefact: "AIG-ASS-07 Human Rights Assessment",
        section: "Section 3 \u2014 Convention and Protocol Rights Screening",
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
      section: "Tier 1 \u2014 Summary Information; Section 9 \u2014 Risks, Mitigations and Impact Assessments",
      fields: [
        { label: "ATRS intake indication (not applicability decision)", value: requirements.atrs },
        { label: "Public / resident facing?", value: yn(profile.publicFacing) },
        {
          label: "Potential impact assessment prompts (Section 9; confirm)",
          value: atrsAssessments.length ? atrsAssessments.join(", ") : "Owner screening pending — no applicability conclusion",
        },
        {
          label: "Human oversight to describe (Section 4 \u2014 Deployment Context)",
          value: atrsAgentic ? "Yes \u2014 agentic trigger fired" : "Standard",
        },
        { label: "Applicability owner", value: "Case-specific/legal owner — pending" },
        { label: "Evidence reference", value: "Pending — no evidence reference supplied" },
        { label: "Screening status", value: "Not completed — owner applicability confirmation pending" },
      ],
      note: `${requirements.atrs}. Applicability owner: pending. Evidence reference: pending. Status: screening not completed. The case-specific/legal owner confirms whether ATRS applies, any publication duty and timing; do not record legal N/A from an unselected intake response.`,
    });

    const gate4 = gate4Rule(profile);
    items.push({
      artefact: "AIG-ASS-08 Supplier AI Due Diligence Questionnaire",
      section: gate4.supplierChecks === "partial"
        ? "Section 5 (data protection and security) and Section 8 (business continuity and exit); data processing terms"
        : "Sections 1\u20139 (supplier responses); Section 10 \u2014 Council Evaluation (internal)",
      fields: [
        { label: "Procurement route (intake answer)", value: gate4.route },
        { label: "Gate 4 (AIG-DEC-01 v1.11 rule)", value: gate4.label },
      ],
      note: `${gate4.note} The commercial owner confirms the procurement position. (Proposed \u2014 for Council confirmation.)`,
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
        { label: "AGPI Priority", value: paperPriority(results.priority.label) },
        { label: "Risk tier", value: results.effectiveTierName + (results.agencyPending ? " (at least; agency tier not yet assessed)" : "") },
        { label: "Escalation", value: results.triggerIds.length ? triggerTextFor(results.triggerIds).join("; ") : "none" },
        { label: "Route", value: paperRoute(profile, results) },
      ],
      note: "The triage result populates the paper's headline. The AGPI priority sets urgency only; the route follows the governing tier. The AI Governance Lead / governance function compiles the one-page paper the forum reads to decide.",
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
  // AGPI or the forward deployment route. Every Appendix E.7 closure question is
  // asked for every retirement (v3.9.2, T-02); the system's CURRENT governance
  // priority (read from the Register) sets urgency only.
  const RETIREMENT_PRIORITIES = [
    { level: 1, label: "Priority 1 – Critical" },
    { level: 2, label: "Priority 2 – High" },
    { level: 3, label: "Priority 3 – Standard" },
    { level: 4, label: "Priority 4 – Routine" },
    { level: 5, label: "Priority 5 – Observe" },
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
    { id: "retireScope", group: "Decision", type: "select", label: "What is being retired?", options: ["Not stated", "Named use(s) only — UC-ID specific", "Whole system — shared system baseline"] },
    { id: "ucIds", group: "Decision", type: "text", label: "UC-ID(s) being retired (leave blank only for a whole-system retirement)", placeholder: "UC-XXXX; UC-YYYY" },
    { id: "allUsesClosed", group: "Decision", type: "select", label: "Whole-system retirement only: are all other uses under this AIR-ID closed or retired?", options: ["Not applicable — named uses only", "Not yet confirmed", "Confirmed — every linked UC-ID closed or retired"] },
    { id: "reason", group: "Decision", type: "select", label: "Reason for retirement", options: RETIREMENT_REASONS },
    { id: "rationale", group: "Decision", type: "textarea", label: "Rationale (why retire, options considered)" },
    { id: "monitoringRef", group: "Decision", type: "text", label: "Prompted by a monitoring finding? Ref in the Post-Deployment Monitoring Log (AIG-OPS-02), if any", placeholder: "AIG-OPS-02 row / review ref" },
    { id: "hasSuccessor", group: "Decision", type: "select", label: "Replacement or successor system?", options: ["No", "Yes"] },
    { id: "successorId", group: "Decision", type: "text", label: "Successor AIR-ID (if any)", placeholder: "AIR-XXXX" },
    { id: "decommissionDate", group: "Decision", type: "date", label: "Planned decommission date" },

    { id: "dataDisposition", group: "Data and access", type: "select", label: "Data and logs disposition", options: ["Retain in place", "Archive", "Dispose / delete", "Return to supplier or data subject"] },
    { id: "dataBasis", group: "Data and access", type: "text", label: "Retention or disposal basis", placeholder: "Statute, policy or contract reference" },
    { id: "accessTeardown", group: "Data and access", type: "select", label: "Accounts, API keys and agentic action scopes revoked?", options: ["Not yet", "Scheduled", "Confirmed revoked"] },

    { id: "dependencies", group: "Continuity", type: "textarea", label: "Downstream dependencies (what consumes its outputs)" },
    { id: "fallback", group: "Continuity", type: "select", label: "Fallback or transition arrangement before switch-off?", options: ["Not needed", "Planned", "Confirmed in place"] },
    { id: "affectedStaff", group: "Continuity", type: "textarea", label: "Affected staff: process change or retraining" },
    { id: "monitoringClosure", group: "Continuity", type: "select", label: "Post-Deployment Monitoring Log (AIG-OPS-02) closure", options: ["Not applicable - no active monitoring", "To be closed", "Closed"] },

    { id: "atrsAction", group: "Records and accountability", type: "select", label: "ATRS record action", options: ["No ATRS record exists", "Withdraw", "Update / mark retired"] },
    { id: "residualOwner", group: "Records and accountability", type: "text", label: "Residual accountability owner (complaints, appeals, subject access, audit)" },
    { id: "residualDuration", group: "Records and accountability", type: "text", label: "For how long is that owner accountable?", placeholder: "e.g. 6 years" },
    { id: "recordsRetention", group: "Records and accountability", type: "text", label: "Records retention period for outputs it produced", placeholder: "Statutory / FOI / audit retention" },
    { id: "supplierExit", group: "Records and accountability", type: "select", label: "Supplier exit (contract closure, data return or destruction)", options: ["Not applicable", "In progress", "Completed"] },
    { id: "residentNotify", group: "Records and accountability", type: "select", label: "Resident or service-user notification required?", options: ["Not required", "Required: planned", "Required: completed"] },
    { id: "riskOfRetiring", group: "Records and accountability", type: "textarea", label: "Risk of retiring (gap, fallback)" },
    { id: "riskOfNotRetiring", group: "Records and accountability", type: "textarea", label: "Risk of not retiring" },

    { id: "boardDecision", group: "Decision authority", type: "select", label: "Decommission authorised by the relevant Council authority under confirmed delegation?", options: ["No", "Yes"] },
    { id: "conditionsClosed", group: "Closure assurance", type: "select", label: "All open conditions and incidents closed or formally transferred?", options: ["No", "Yes"] },
    { id: "postReview", group: "Closure assurance", type: "select", label: "Post-retirement / lessons-learned review scheduled?", options: ["No", "Yes: date recorded"] },
    { id: "notifyLive", group: "Closure assurance", type: "select", label: "Resident notification and appeal handling live before switch-off?", options: ["No", "Yes"] },

    { id: "planId", group: "Gate event record", type: "text", label: "Existing Gate Plan ID (verify in AIG-DEC-04; do not invent)", placeholder: "Existing plan ID only" },
    { id: "eventId", group: "Gate event record", type: "text", label: "Existing Event ID (verify in AIG-DEC-04; do not invent)", placeholder: "Existing event ID only" },
    { id: "forum", group: "Gate event record", type: "text", label: "Retirement decision-maker: officer or forum with confirmed retirement delegation (Gate 8; recorded in Decision-maker / role)" },
    { id: "decision", group: "Gate event record", type: "select", label: "Gate 8 outcome (AIG-DEC-04; Decommission = Retired in AIG-DEC-03, Suspend = Suspended, Stop = Rejected)", options: ["Pending: not yet decided", "Progress", "Progress with condition", "Return for evidence", "Pause", "Stop", "Suspend", "Decommission", "Re-authorise", "Opinion only", "No decision"] },
    { id: "eventDate", group: "Gate event record", type: "date", label: "Date of decision (leave blank until decided)" },
    { id: "decisionMaker", group: "Gate event record", type: "text", label: "Decision-maker and role" },
    { id: "conditionDue", group: "Gate event record", type: "date", label: "Condition due date (if any)" },
    { id: "assuranceRef", group: "Gate event record", type: "text", label: "Assurance opinion reference" },
    { id: "evidenceRefs", group: "Gate event record", type: "text", label: "Evidence references (recorded in Notes)", placeholder: "Disposal record, ATRS update log, notification plan" },
    { id: "decisionRecordRef", group: "Gate event record", type: "text", label: "Existing AIG-DEC-03 / approved minutes reference (verify)", placeholder: "Existing authorised decision reference" },
    { id: "recordedBy", group: "Gate event record", type: "text", label: "Recorded by (recorded in Notes)" },
    { id: "airIdEvidenceRef", group: "Gate event record", type: "text", label: "AIR-ID evidence reference in AIG-INV-04", placeholder: "AIG-INV-04 record / source URI" },
    { id: "assuranceEvidenceRef", group: "Gate event record", type: "text", label: "Current 05 assurance-state evidence reference", placeholder: "Current 05 snapshot / source URI" },
    { id: "authorityEvidenceRef", group: "Gate event record", type: "text", label: "Decision authority / delegation evidence reference", placeholder: "Delegation record / source URI" },
  ];

  const RETIREMENT_GROUP_ORDER = [
    "Decision",
    "Data and access",
    "Continuity",
    "Records and accountability",
    "Decision authority",
    "Closure assurance",
    "Gate event record",
  ];

  const RETIREMENT_HANDOFF_HEADERS = DRAFT_HANDOFF_HEADERS.slice();

  function retLevelFor(label) {
    const found = RETIREMENT_PRIORITIES.find((p) => p.label === label);
    return found ? found.level : 1;
  }

  // v3.9.2 (T-02): every Appendix E.7 closure item applies to every retirement. The
  // current priority sets urgency only; it no longer hides any question.
  function retirementFieldsFor() {
    return RETIREMENT_FIELDS.slice();
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
    // "Opinion only" and "No decision" are AIG-DEC-04 outcomes that are not decisions.
    return !!ret.decision && !["Pending: not yet decided", "Opinion only", "No decision"].includes(ret.decision);
  }

  // Appendix E.7 / AIG-GOV-03: retire each UC-ID separately; retire the AIR-ID only
  // when every linked use is closed or retired.
  function retirementScopeOf(ret) {
    const scope = String(ret.retireScope || "");
    if (scope.startsWith("Named use")) return "UC-ID specific";
    if (scope.startsWith("Whole system")) return "Shared system baseline";
    return "";
  }

  function retirementReadiness(ret) {
    const decided = retirementDecided(ret);
    const outstanding = [];
    if (!ret.priorityLabel) outstanding.push("Current AIG-INV-04 governance priority not verified; full-depth prompts are shown until it is.");
    if (!ret.tier) outstanding.push("Current AIG-INV-04 assurance/risk tier not verified.");
    if (!ret.registerId) outstanding.push("Existing Council-issued AIR-ID not recorded.");
    const retScope = retirementScopeOf(ret);
    if (!retScope) outstanding.push("Retirement scope not stated: named use(s) (UC-ID specific) or the whole system.");
    if (retScope === "UC-ID specific" && !String(ret.ucIds || "").trim()) outstanding.push("UC-ID(s) being retired not recorded.");
    if (retScope === "Shared system baseline" && ret.allUsesClosed !== "Confirmed — every linked UC-ID closed or retired") outstanding.push("Whole-system retirement: not yet confirmed that every UC-ID under this AIR-ID is closed or retired (Appendix E.7).");
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
    // Every Appendix E.7 closure check applies whatever the priority (v3.9.2, T-02).
    if (ret.fallback === "Planned") outstanding.push("Fallback arrangement planned but not confirmed in place.");
    if (ret.monitoringClosure === "To be closed") outstanding.push("Post-Deployment Monitoring Log (AIG-OPS-02) not yet closed.");
    if (!ret.residualOwner) outstanding.push("Residual accountability owner not named.");
    if (ret.residentNotify === "Required: planned") outstanding.push("Required resident notification not yet completed.");
    if (ret.supplierExit === "In progress") outstanding.push("Supplier exit (data return or destruction) not yet completed.");
    if (ret.boardDecision !== "Yes") outstanding.push("Delegated Council decommission decision not confirmed.");
    if (ret.conditionsClosed !== "Yes") outstanding.push("Open conditions or incidents not closed or transferred.");
    if (ret.notifyLive !== "Yes" && ret.residentNotify !== "Not required") outstanding.push("Resident notification and appeal handling not confirmed live before switch-off.");
    if (ret.postReview !== "Yes: date recorded") outstanding.push("Post-retirement / lessons-learned review not yet scheduled.");
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

  // AIG-DEC-04 outcome → AIG-DEC-03 outcome for the UC-ID (AIG-DEC-04 Lists D:E).
  const DEC04_OUTCOME_TO_DEC03 = {
    Progress: "Approved",
    "Progress with condition": "Approved with conditions",
    "Return for evidence": "Deferred",
    Pause: "Deferred (before go-live) / Suspended (in operation)",
    Stop: "Rejected",
    Suspend: "Suspended",
    Decommission: "Retired",
    "Re-authorise": "Approved or Approved with conditions (after reassessment)",
  };

  // Retirement handoff: one row per AIG-DEC-04 column for the Gate plan, Gate events
  // and Conditions sheets (formula-owned checks excluded), in workbook order, with
  // controlled values only; then the AIG-INV-04 fields to reconcile afterwards.
  function buildRetirementGateLogRow(ret) {
    const readiness = retirementReadiness(ret);
    const decided = retirementDecided(ret);
    const conditions = retirementConditions(ret);
    const scope = retirementScopeOf(ret);
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
    const ucReview = "Enter each UC-ID being retired. Leave blank only if the whole shared system baseline is being retired.";
    const gate8 = DEC04_GATES[8];

    const plan = "Gate plan";
    add(plan, "Plan ID", ret.planId, "Never generated here; verify against the existing AIG-DEC-04 Gate plan.");
    add(plan, "AIR-ID", ret.registerId, identityReview);
    add(plan, "Gate / forum", gate8, `Controlled Gate 8 value. Retirement decision-maker entered: ${ret.forum || "(not entered)"}; confirm the officer or forum and its delegation.`);
    add(plan, "Trigger / stage", "Retirement / decommission review", "Prospective plan prompt; not an event.");
    add(plan, "Requirement", "Required", "Controlled value: a retirement decision per UC-ID is required before switch-off.");
    add(plan, "Basis / triage ref", ret.monitoringRef, "Provide verified AIG-OPS-02 / triage source reference; user-entered pointer only.");
    add(plan, "Target date", ret.decommissionDate ? retFmtDate(ret.decommissionDate) : "", "Proposed target only; not an actual decision or decommission date.");
    add(plan, "Responsible role", "", "Accountable role to be supplied and verified; no assignment or delegation is made.");
    add(plan, "Plan state", "Planned", "Controlled value for a prospective requirement; never an actual Gate Event or completed status.");
    add(plan, "N-A / waiver rationale and authority ref", "", "No waiver proposed or authorised by this handoff.");
    add(plan, "UC-ID scope(s) (blank only for explicit system baseline)", ret.ucIds, ucReview);
    add(plan, "Decision scope (UC-ID specific / Shared system baseline)", scope, "Choose UC-ID specific when retiring named uses; Shared system baseline only when retiring the whole system.");

    const event = "Gate events";
    add(event, "Event ID", ret.eventId, "Never generated here; verify against the current Gate events sheet before linking.");
    add(event, "AIR-ID", ret.registerId, identityReview);
    add(event, "Plan ID (if any)", ret.planId, "Optional join; verify this existing plan belongs to this AIR-ID and gate.");
    add(event, "Gate / forum", decided ? gate8 : "", "Controlled Gate 8 value once an authorised decision has actually been made; otherwise leave blank.");
    add(event, "Event type", decided ? "Decision" : "", "Decision only once an authorised forum has actually decided; otherwise leave blank.");
    add(event, "Date", decided ? retFmtDate(ret.eventDate) : "", "User-entered proposal only; actual date belongs to the authoritative event.");
    add(event, "Outcome", decided ? ret.decision : "", decided
      ? `User-entered proposal, not an approved decision or live event. AIG-DEC-03 outcome for the UC-ID: ${DEC04_OUTCOME_TO_DEC03[ret.decision] || "see AIG-DEC-04 Lists"}.`
      : "Blank until an authorised decision is recorded.");
    add(event, "Decision-maker / role", [ret.decisionMaker, ret.forum].filter(Boolean).join(" — "), "Verify current authority and record the actual decision in AIG-DEC-03 / approved native minutes.");
    add(event, "AIG-DEC-03 / minutes ref", ret.decisionRecordRef, "Reference only; verify against authoritative decision record.");
    add(event, "Assurance opinion ref", ret.assuranceRef, "Verify actual versioned assurance opinion; blank means evidence pending.");
    add(event, "Technical snapshot / as-at ref", "", "Capture actual system state and as-at evidence at the event.");
    add(event, "Next gate / action", "", `Forum to set; not inferred from triage. Suggested: ${retirementNextGate(ret)}`);
    add(event, "Recorded by", ret.recordedBy, "User-entered prompt only; verify actual recorder/role.");
    add(event, "UC-ID(s) covered by this dated event", ret.ucIds, ucReview);
    add(event, "Decision scope (UC-ID specific / Shared system baseline)", scope, "UC-ID specific is required for a use-level retirement decision; a shared baseline event is not a use decision.");
    add(event, "Time (hh:mm)", "", "Actual event time only.");
    add(event, "Source (minutes / decision record / system)", "", "Name the actual source of the event record.");
    add(event, "Evidence ID(s) (AIG-INV-04 Evidence index)", "", `Only existing Evidence index IDs. User-entered evidence references (not IDs): ${ret.evidenceRefs || "none"}.`);
    add(event, "Event-time lifecycle stage", decided ? "Retirement and Decommissioning" : "", "Controlled value once the event is recorded.");
    add(event, "Incident ref (AIG-OPS-03), precautionary pause", "", "Precautionary pause (containment) events only; blank for a retirement decision.");
    add(event, "Follow-up decision due date (precautionary pause)", "", "Precautionary pause (containment) events only; blank for a retirement decision.");
    add(event, "Note (not a column) — Rationale", ret.rationale, "Proposal context only; not a record of an event that occurred.");

    const conditionRows = conditions.length ? conditions : [""];
    conditionRows.forEach((condition) => {
      const target = "Conditions";
      add(target, "Condition ID", "", "Never generated here; controlled owner assigns only after an actual event.");
      add(target, "Event ID", ret.eventId, "Verify actual event exists before linking a condition.");
      add(target, "AIR-ID", ret.registerId, "Verify derived relationship in the controlled workbook.");
      add(target, "Required action / condition", condition, condition
        ? "Suggested action only; authorised forum determines whether it is a condition."
        : "No condition supplied; authorised forum decides whether any are needed.");
      add(target, "Action owner", "", "Accountable role to be supplied and confirmed by authorised forum.");
      add(target, "Due date", condition && ret.conditionDue ? retFmtDate(ret.conditionDue) : "", "Proposed date only; confirm and record after formal decision.");
      add(target, "State", "", "Controlled state (Open / Closed-verified / Accepted-open / Waived / Unknown) set only after the formal decision; not inferred.");
      add(target, "Closed / waived on", "", "No resolution or waiver asserted.");
      add(target, "Evidence / waiver authority ref", "", "Evidence/authority pending; no resolution or waiver asserted.");
      add(target, "UC-ID scope (blank only if shared system condition)", ret.ucIds, ucReview);
      add(target, "Condition scope (UC-ID specific / shared system baseline)", scope, "Match the scope of the parent event.");
      add(target, "Verified by / date", "", "Completed by the verifier only.");
      add(target, "Monitoring condition? (Yes / No)", /Monitoring Log \(AIG-OPS-02\)/.test(condition) ? "Yes" : "", "Yes only for a condition tracked through AIG-OPS-02.");
      add(target, "AIG-OPS-02 evidence ref (monitoring conditions)", "", "Pointer only for monitoring conditions.");
    });

    add("AI Register", "AIR-ID", ret.registerId, identityReview);
    add("AI Register", "Operational Status (system baseline)", "", `Current status is not changed by this checklist (${readiness.status}). Verify and update through the controlled process (Decommissioned only once all linked uses are retired).${scope === "UC-ID specific" ? " Retiring named uses does not retire the system: the AIR-ID row stays active while other uses continue." : ""}`);
    add("AI Register", "Assessment / evidence ref", ret.airIdEvidenceRef, "Source pointer only; verify the permanent AIR-ID against AIG-INV-04.");
    add("AI Register", "Decision record ref", "", "Only enter a reference to the actual authorised AIG-DEC-03 / approved native decision record.");
    add("Assessment summary", "AIG-ASS-02 ref / date", ret.assuranceEvidenceRef, "Source pointer only; verify current AIG-ASS-02 assessment and its actual date against AIG-INV-04; not an approval.");
    add("Assessment summary", "Other specialist finding refs", ret.authorityEvidenceRef, "Authority evidence pointer only; verify the actual delegation record and current decision-maker authority.");
    add("Assessment summary", "AIG-OPS-02 Monitoring ref", "", "Only enter an existing verified AIG-OPS-02 monitoring record reference.");
    add("Assessment summary", "As-at date", "", "Update only when the authorised owner verifies the actual AIG-INV-04 assessment summary.");
    return { headers: RETIREMENT_HANDOFF_HEADERS.slice(), rows, readiness };
  }

  function retFormDecisionValue(ret) {
    // AIG-DEC-03's controlled outcome set is Approved / Approved with conditions /
    // Deferred / Rejected / Suspended / Retired. An authorised retirement is recorded
    // as Retired (per UC-ID); a pause is Suspended. The forum, not this tool, decides.
    if (!retirementDecided(ret)) return "Not entered — decision reserved to authorised forum";
    return `User-entered draft: ${ret.decision} (not verified or approved). In AIG-DEC-03 an authorised retirement is recorded as "Retired" for each UC-ID in scope; a pause is "Suspended".`;
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
      line("Retirement scope", retirementScopeOf(ret) || "(not stated — named UC-ID(s) or whole system)"),
      line("UC-ID(s) in scope", ret.ucIds || (retirementScopeOf(ret) === "Shared system baseline" ? "All uses under this AIR-ID (confirm each is closed or retired)" : "(not recorded)")),
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
  // Pathway per agency tier (Playbook F.2; AIG-AGT-03 §6; AIG-DEC-01 Agentic pathway).
  // Worded so AIG-ASS-02 row 82 reads the same floor (T3/T4 → High, T5 → Critical).
  const AGENCY_PATHWAYS = [
    "Normal route; no minimum pathway; Gate 2 and Gate 6 still apply as an action-capable use",
    "Normal route (standard AI review); Gate 2 and Gate 6 apply; recorded on the Agent Record",
    "Agentic controls review at Gate 2; minimum pathway Medium",
    "Agentic controls review at Gate 2 plus formal AI Assurance Board recommendation; minimum pathway High",
    "High-agency review: AIG-ASS-11 complete before the Gate 2 decision; minimum pathway High, raised by the §4.4.6 floor without per-action review",
    "Executive and safety escalation; minimum pathway Critical; no consequential production use until resolved",
  ];
  // AIG-AGT-02 / AIG-AGT-03 §6 tier-assignment table (Proposed — for Council
  // confirmation). Table A: per-dimension score → minimum tier.
  const AGENCY_TABLE_A = {
    consequence: [0, 1, 2, 3, 4, 5],
    autonomy: [0, 1, 2, 2, 3, 5],
    authority: [0, 1, 2, 3, 3, 5],
    reach: [0, 0, 1, 2, 3, 5],
    controllability: [0, 0, 1, 2, 4, 5],
  };
  const D1_TRIGGERS =
    "authority ceiling cannot be reliably enforced; containment cannot be demonstrated; delegation/recursion is unbounded; irreversible high-consequence actions are possible without appropriate human control; persistent/shared memory lacks effective isolation; or the agent can create or modify agents/configurations without separately authorised controls";
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

  // Deterministic agency tier (AIG-AGT-02 / AIG-AGT-03 §6 Tables A and B): apply every
  // Table A floor and every Table B rule; the highest floor wins (minimum T0).
  function computeAgentic(input) {
    const d = (input && input.dimensions) || {};
    const g = (k) => Math.max(0, Math.min(5, Number(d[k] || 0)));
    const consequence = g("consequence"), autonomy = g("autonomy"), authority = g("authority"), reach = g("reach"), controllability = g("controllability");
    const scores = { consequence, autonomy, authority, reach, controllability };
    const mult = (input && input.multipliers) || [];
    const caps = (input && input.capabilities) || [];
    const has = (name) => mult.includes(name);
    const killSwitch = !!(input && input.killSwitch), rollback = !!(input && input.rollback), boundariesTested = !!(input && input.boundariesTested);
    const otherD1 = !!(input && input.otherD1);
    const floors = [];
    const label = { consequence: "Consequence", autonomy: "Autonomy", authority: "Authority", reach: "Reach", controllability: "Controllability" };
    Object.keys(AGENCY_TABLE_A).forEach((key) => {
      const tier = AGENCY_TABLE_A[key][scores[key]];
      if (tier > 0) floors.push({ rule: `A: ${label[key]} ${scores[key]}`, tier });
    });
    const rule = (id, tier, text, applies) => { if (applies) floors.push({ rule: `rule ${id}`, tier, text }); };
    rule("B1", 4, "two or more of Autonomy, Authority and Reach score 4 or more", [autonomy, authority, reach].filter((v) => v >= 4).length >= 2);
    rule("B2", 5, "Consequence 4 or more and Controllability 4 or more", consequence >= 4 && controllability >= 4);
    rule("C1", 1, "memory or external communication flag", has("Memory") || has("External communication"));
    rule("C2", 2, "persistence, delegation, tool discovery, credential access or goal adaptation flag", ["Persistence", "Delegation", "Tool discovery", "Credential access", "Goal adaptation"].some(has));
    rule("C3", 3, "financial authority flag", has("Financial authority"));
    rule("C4", 4, "persistence, delegation or tool discovery flag with Autonomy 3+ or Authority 3+", ["Persistence", "Delegation", "Tool discovery"].some(has) && (autonomy >= 3 || authority >= 3));
    rule("C5", 5, "replication or self-modification flag, or the agent can create new agents", has("Replication") || has("Self-modification") || caps.includes("Replicate"));
    rule("D1", 5, !killSwitch ? "mandatory escalation trigger: containment (kill-switch) not demonstrated" : "mandatory escalation trigger (AIG-AGT-02 rule D1)", !killSwitch || otherD1);
    const tier = floors.reduce((max, f) => Math.max(max, f.tier), 0);
    const setBy = floors.filter((f) => f.tier === tier && tier > 0).map((f) => f.rule);
    const esc = floors.filter((f) => f.tier >= 3).map((f) => `${f.rule} → T${f.tier}${f.text ? ` (${f.text})` : ""}`);
    let deploymentControl;
    if (!killSwitch) deploymentControl = "Do not deploy \u2014 demonstrate stop and containment first (rule D1); document rollback or a compensating action where relevant.";
    else if (tier >= 5) deploymentControl = "Do not deploy without executive and safety escalation; no consequential production use until resolved.";
    else if (tier >= 4) deploymentControl = "Do not deploy without high-agency review; the AIG-ASS-11 security review (ASI01–ASI10) must be complete before the Gate 2 decision.";
    else if (tier >= 2) deploymentControl = "Proceed to agentic controls review at Gate 2; production requires implemented and evidenced required runtime controls or expressly accepted effective, time-bounded compensation, and the permitted autonomy level granted at Gate 6.";
    else deploymentControl = "Proceed to the delegated approval route; Gate 2 and Gate 6 apply to every action-capable use; this triage does not authorise use.";
    const flags = [];
    if (!killSwitch) flags.push("Kill-switch not demonstrated");
    if (!rollback) flags.push("Rollback not confirmed; assess reversibility and compensating action where relevant");
    if (!boundariesTested) flags.push("Boundaries not tested");
    return {
      tierNum: tier, tierLabel: AGENCY_TIERS[tier], pathway: AGENCY_PATHWAYS[tier],
      autonomyLabel: autonomyLabel(autonomy), autonomy, consequence, authority, reach, controllability,
      floors: floors.map((f) => `${f.rule} → T${f.tier}`),
      setBy,
      escalations: esc, flags, deploymentControl,
      asbomRef: (input && input.asbomRef) || "",
      multipliers: mult,
      capabilities: caps,
      killSwitch,
      rollback,
      boundariesTested,
      otherD1,
      worstChain: (input && input.worstChain) || "",
      dimensionNotes: (input && input.dimensionNotes) || {},
    };
  }

  return {
    SUITE,
    DEC04_GATES,
    ACTION_AUTHORITY,
    REGISTER_HEADERS,
    ASSESSMENT_HEADERS,
    GATE_EVENT_HEADERS,
    GATE_CONDITION_HEADERS,
    DEC02_HEADERS,
    AGENCY_TABLE_A,
    D1_TRIGGERS,
    ADVERSARIAL_TEST,
    BUSINESS_CONTINUITY_LINK,
    SECURITY_REVIEW_EVIDENCE,
    governancePriority,
    agencyMinimumTier,
    governingTier,
    decisionRouteFor,
    isActionCapable,
    perActionReview,
    normaliseTriggerIds,
    mandatoryFloorFor,
    calculateTriage,
    paperPriority,
    paperRoute,
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
    CONTROL_EVIDENCE,
    tierNameForScore,
    effectiveRiskTier,
    commercialRequired,
    SITUATIONS,
    situationOf,
    isFoundInUse,
    isReentry,
    PROCUREMENT,
    procurementRouteOf,
    gate4Rule,
    SUPPLIER_CHECKS,
    MONITORING_MINIMUM,
    OPS02_REVIEW_TYPES,
    OPS02_AGENTIC_RAISE,
    monitoringMinimum,
    autonomyRangeFor,
    controlEvidenceFields,
    INVESTIGATION_LABEL,
    GATE_EVENT_HEADERS,
    assuranceIntensity,
    assessmentRequirements,
    buildEvidenceList,
    isLightTouch,
    NEW_INVESTMENT,
    newInvestmentOf,
    gates13Rule,
    lightTouchBlockReason,
    FAST_TRACK,
    fastTrackOf,
    fastTrackConflicts,
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
    GATE_PLAN_ROW_CHECK_NOTE,
    REGISTER_LIFECYCLE_STAGES,
    GATE_PLAN_HEADERS,
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
