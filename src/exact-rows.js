(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.TriageExactRows = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const SCHEMAS = {
    registerCore: {
      sheet: "Register Core",
      headers: [
        "AIR-ID",
        "System / Model Name",
        "Approved Purpose / Boundary",
        "Service Area",
        "Service Owner",
        "Supplier / Developer",
        "Source",
        "Primary AI Type (summary)",
        "Lifecycle Stage",
        "Date Registered",
        "Date First Used",
        "Governance Approval Status",
        "Operational Status",
        "Action Authority (summary)",
        "Is Agent?",
        "Agent Record (45) Ref",
        "Last Review Date",
        "Next Review Date",
        "05 source / version",
        "Reconciled on",
        "Register QA (structural)",
        "Authority escalation (derived)",
        "Escalation / approval evidence ref",
        "Escalation Gate Event ID",
        "Approved view row (derived)",
      ],
      formulaColumns: [
        "Register QA (structural)",
        "Authority escalation (derived)",
        "Approved view row (derived)",
      ],
    },
    gatePlan: {
      sheet: "Gate Plan",
      headers: [
        "Plan ID",
        "AIR-ID",
        "Gate / forum",
        "Trigger / lifecycle stage",
        "Requirement",
        "Basis / triage ref",
        "Target date",
        "Responsible role",
        "Plan state",
        "N-A / waiver rationale and authority ref",
        "Source version",
        "Plan QA",
      ],
      formulaColumns: ["Plan QA"],
    },
    agpiTriage: {
      sheet: "AGPI Triage",
      headers: [
        "Governance dimension",
        "Weight",
        "Score (1–5)",
        "Weighted points",
        "Assessment consideration",
      ],
      formulaColumns: ["Weighted points"],
    },
    triageImport: {
      sheet: "Triage Import",
      headers: [
        "Canonical field",
        "Value",
        "Capture status",
        "Used in WCC-AIG-07",
        "Implementation note",
      ],
      formulaColumns: [],
    },
    agentRecord: {
      sheet: "Agent Record",
      headers: [
        "AIR-ID",
        "Agent Name",
        "Approved Purpose (mandate)",
        "Prohibited Purposes",
        "Decisions never delegated",
        "Max acceptable consequence",
        "Accountable Executive",
        "Business Owner",
        "Operator / Platform",
        "Environment",
        "Jurisdiction",
        "Autonomy Level",
        "Agency Tier",
        "AGPI Priority (from 05)",
        "Persistence?",
        "Memory Type",
        "Can delegate / create agents?",
        "Financial Authority (limit)",
        "Permission Scope (summary)",
        "Identity / credential provenance",
        "Suspension mechanism",
        "Termination mechanism",
        "Kill-switch tested?",
        "Rollback capability?",
        "Evaluation / red-team status",
        "Date authorised",
        "Authority expiry / next reauthorisation",
        "Governance Approval Status",
        "Operational Status",
        "Notes",
        "Memory Read Scope",
        "Memory Write Scope",
        "Memory Retention / Deletion",
        "Memory Provenance",
        "Memory Isolation / Poisoning Control",
        "Model Routing / Fallback",
        "Frontier Model?",
        "Max Delegation Depth",
        "Recursion Allowed?",
        "Max Concurrent Sub-agents",
        "Runtime Control State",
        "Containment Test Date",
        "Time to Containment",
        "Action Record Available?",
        "Human Oversight Mode",
        "Reversibility Class",
        "Compensating Action",
        "Budget / Transaction Ceiling",
        "Agent Creation Authority",
        "Self-Modification Authority",
        "AG-ID",
      ],
      formulaColumns: [],
    },
    capabilityVector: {
      sheet: "Capability Vector",
      headers: [
        "AIR-ID",
        "Read",
        "Write",
        "Execute",
        "Communicate",
        "Purchase",
        "Delegate",
        "Persuade",
        "Code",
        "Discover",
        "Persist",
        "Replicate",
        "Learn",
        "Escalate",
        "Multiplier: Credential access",
        "Multiplier: Self-modification",
        "Multiplier: Tool discovery",
        "Multiplier: Goal adaptation",
        "Multiplier: External comms",
        "Notes",
      ],
      formulaColumns: [],
    },
  };

  const AGPI_ROWS = [
    [
      "Resident Impact",
      0.25,
      "resident",
      "Could the AI influence services, decisions or outcomes affecting residents or service users?",
    ],
    [
      "Public Trust & Reputation",
      0.2,
      "trust",
      "Could failures reduce confidence in the Council or attract significant public scrutiny?",
    ],
    [
      "Legal & Regulatory Exposure",
      0.2,
      "legal",
      "Does the AI engage statutory duties, regulatory requirements or legal obligations?",
    ],
    [
      "Governance Visibility & Accountability",
      0.15,
      "visibility",
      "Is ownership clear? Is the AI registered, documented and appropriately governed?",
    ],
    [
      "Strategic Value & Organisational Dependency",
      0.1,
      "strategic",
      "How important is the AI to delivering the Council's strategic objectives and performance?",
    ],
    [
      "Human Oversight & Decision Authority",
      0.1,
      "oversight",
      "Does meaningful human oversight exist and can AI-assisted decisions be reviewed or challenged?",
    ],
  ];

  const IMPORT_FIELDS = [
    ["AIR-ID", "Identity", "Direct profile field.", "auto"],
    ["System / Model Name", "Identity", "Direct profile field.", "auto"],
    ["Purpose / Description", "Identity", "Direct profile field.", "auto"],
    ["Service Area", "Identity", "Direct profile field.", "auto"],
    ["Service Owner", "Identity", "Direct profile field.", "auto"],
    [
      "Supplier / Developer",
      "Context",
      "Direct profile field; retained for traceability.",
      "auto",
    ],
    ["Source", "Context", "Direct profile field.", "auto"],
    ["AI Capability", "Context / agentic gate", "Direct profile field.", "auto"],
    [
      "Automated Action Authority",
      "Agentic context",
      "Direct profile field.",
      "auto",
    ],
    [
      "Systems / Tools Accessed",
      "Agentic context",
      "Direct profile field.",
      "auto",
    ],
    ["Lifecycle Stage", "Context", "Direct profile field.", "auto"],
    [
      "Personal / Special Category Data",
      "Escalation context",
      "Direct profile field.",
      "auto",
    ],
    [
      "Triage Date",
      "Identity",
      "Generated at export.",
      "derived",
    ],
    [
      "AGPI Score (0-100)",
      "Triage context",
      "Calculated from the six AGPI dimensions.",
      "derived",
    ],
    [
      "Raw AGPI Priority",
      "Triage context",
      "Current results.priority.label.",
      "derived",
    ],
    [
      "Authorised Governance Priority Uplift",
      "Triage context",
      "Optional formally authorised uplift to a stricter AGPI governance priority. Do not populate this from mandatory risk triggers or the risk-tier floor.",
      "manual",
    ],
    [
      "Effective Governance Priority",
      "Triage context",
      "Stricter of Raw AGPI Priority and any authorised governance-priority uplift only. Risk classification remains separate in Mandatory Risk Floor / Effective Governance Tier.",
      "derived",
    ],
    ["Resident Impact", "Step 1", "Impact score 1–5.", "auto"],
    ["Legal and Regulatory Impact", "Step 1", "Impact score 1–5.", "auto"],
    ["Reputational Impact", "Step 1", "Impact score 1–5.", "auto"],
    ["Operational Impact", "Step 1", "Impact score 1–5.", "auto"],
    ["Financial Impact", "Step 1", "Impact score 1–5.", "auto"],
    ["Likelihood", "Step 2", "Likelihood score 1–5.", "auto"],
    ["Control Effectiveness", "Step 2", "Control effectiveness score 1–5.", "auto"],
    ["Impact Score", "Step 2 / 3", "Highest impact score.", "derived"],
    ["Inherent Risk Score", "Step 3", "Likelihood multiplied by impact.", "derived"],
    ["Inherent Risk Tier", "Step 3", "Tier from inherent risk score.", "derived"],
    ["Residual Risk Score", "Step 3", "Inherent risk adjusted by control effectiveness.", "derived"],
    ["Residual Risk Tier", "Step 3", "Tier from residual risk score.", "derived"],
    [
      "Trigger — Special Category Data",
      "Step 4",
      "Yes/No.",
      "auto",
    ],
    ["Trigger — Vulnerable Residents", "Step 4", "Yes/No.", "auto"],
    ["Trigger — Housing/Care/Homelessness", "Step 4", "Yes/No.", "auto"],
    ["Trigger — Novel Deployment", "Step 4", "Yes/No.", "auto"],
    ["Trigger — Statutory Decisions", "Step 4", "Yes/No.", "auto"],
    ["Trigger — Material Change", "Step 4", "Yes/No.", "auto"],
    ["Trigger — Agentic Autonomous Action", "Step 4", "Yes/No.", "auto"],
    [
      "Mandatory Risk Floor",
      "Step 3 / 4",
      "Critical for statutory or agentic trigger; High for any other trigger; otherwise Low.",
      "derived",
    ],
    [
      "Effective Governance Tier",
      "Step 3 / 4",
      "Highest of inherent tier, residual tier and mandatory risk floor.",
      "derived",
    ],
    ["Tier Floor Reason", "Step 3", "Explains inherent and/or mandatory uplift.", "derived"],
    [
      "Assurance Intensity",
      "Step 3",
      "Comprehensive / Enhanced / Standard / Proportionate.",
      "derived",
    ],
    [
      "Governance Status",
      "Assessment status",
      "Triage complete; formal approvals pending.",
      "derived",
    ],
    [
      "Is Agent",
      "Step 5",
      "Yes if it can act, including when a human approves each action, or its capability is Agentic AI.",
      "derived",
    ],
    ["Agentic Consequence", "Step 5", "0–5.", "agent-auto"],
    ["Agentic Autonomy", "Step 5", "0–5.", "agent-auto"],
    ["Agentic Authority", "Step 5", "0–5.", "agent-auto"],
    ["Agentic Reach", "Step 5", "0–5.", "agent-auto"],
    ["Agentic Controllability", "Step 5", "0–5 reversed.", "agent-auto"],
    ["Autonomy Level", "Step 5", "A0–A5 label.", "agent-derived"],
    ["Agency Tier", "Step 5", "T0–T5 label.", "agent-derived"],
    ["Agentic Pathway", "Step 5", "Governance pathway.", "agent-derived"],
    [
      "Kill-switch Demonstrated",
      "Step 5",
      "Yes/No from agentic controls.",
      "agent-auto",
    ],
    [
      "Rollback Capability",
      "Step 5",
      "Yes/No from agentic controls.",
      "agent-auto",
    ],
  ];

  const TRIGGER_FIELDS = [
    ["Trigger — Special Category Data", "specialData"],
    ["Trigger — Vulnerable Residents", "vulnerable"],
    ["Trigger — Housing/Care/Homelessness", "housingCare"],
    ["Trigger — Novel Deployment", "novel"],
    ["Trigger — Statutory Decisions", "statutory"],
    ["Trigger — Material Change", "materialChange"],
    ["Trigger — Agentic Autonomous Action", "agentic"],
  ];

  const AGENT_DIMENSIONS = [
    ["Agentic Consequence", "consequence"],
    ["Agentic Autonomy", "autonomy"],
    ["Agentic Authority", "authority"],
    ["Agentic Reach", "reach"],
    ["Agentic Controllability", "controllability"],
    ["Autonomy Level", "autonomyLabel"],
    ["Agency Tier", "tierLabel"],
    ["Agentic Pathway", "pathway"],
    ["Kill-switch Demonstrated", "killSwitch"],
    ["Rollback Capability", "rollback"],
  ];

  const CAPABILITIES = [
    "Read",
    "Write",
    "Execute",
    "Communicate",
    "Purchase",
    "Delegate",
    "Persuade",
    "Code",
    "Discover",
    "Persist",
    "Replicate",
    "Learn",
    "Escalate",
  ];

  const MULTIPLIERS = [
    ["Multiplier: Credential access", "Credential access"],
    ["Multiplier: Self-modification", "Self-modification"],
    ["Multiplier: Tool discovery", "Tool discovery"],
    ["Multiplier: Goal adaptation", "Goal adaptation"],
    ["Multiplier: External comms", "External communication"],
  ];

  function blankRow(headers) {
    return headers.map(() => "");
  }

  function rowObject(headers, values) {
    const row = blankRow(headers);
    for (const [header, value] of Object.entries(values)) {
      const index = headers.indexOf(header);
      if (index >= 0 && value != null) row[index] = value;
    }
    return row;
  }

  function text(value) {
    return value == null ? "" : String(value);
  }

  function isAgent(profile, agentic, results) {
    return (
      profile.capability === "Agentic AI" ||
      (profile.actionAuthority && profile.actionAuthority !== "None — outputs only") ||
      (results.triggerIds || []).includes("agentic") ||
      Boolean(agentic)
    );
  }

  function yesNo(value) {
    return value ? "Yes" : "No";
  }

  function tierFloor(profile, results) {
    const triggers = results.triggerIds || [];
    if (triggers.includes("statutory") || triggers.includes("agentic")) {
      return "Critical";
    }
    if (triggers.length || profile.dataType === "Special category data") {
      return "High";
    }
    return "Low";
  }

  function escapeCsv(value) {
    const textValue = text(value);
    const safe = /^[=+\-@\t\r]/.test(textValue) ? `'${textValue}` : textValue;
    return `"${safe.replace(/"/g, '""')}"`;
  }

  function toCsv(headers, rows) {
    const lines = [
      headers.map(escapeCsv).join(","),
      ...rows.map((row) => headers.map((_, index) => escapeCsv(row[index])).join(",")),
    ];
    return `\uFEFF${lines.join("\r\n")}\r\n`;
  }

  function buildExactRows(calculation, options) {
    const safeCalculation = calculation || {};
    const profile = safeCalculation.profile || {};
    const results = safeCalculation.results || {};
    const agpiScores = safeCalculation.agpiScores || {};
    const impactScores = safeCalculation.impactScores || {};
    const route = Array.isArray(safeCalculation.route) ? safeCalculation.route : [];
    const agentic = (options && options.agentic) || null;
    const rows = [];

    const registerValues = {
      "AIR-ID": profile.registerId,
      "System / Model Name": profile.systemName,
      "Service Area": profile.serviceArea,
      "Service Owner": profile.serviceOwner,
      "Supplier / Developer": profile.supplierDeveloper,
      Source: profile.source,
      "Primary AI Type (summary)": profile.capability,
      "Lifecycle Stage": profile.lifecycle,
      "Date First Used": profile.dateFirstUsed,
      "Action Authority (summary)": profile.actionAuthority,
      "Is Agent?": isAgent(profile, agentic, results) ? "Yes" : "",
    };
    rows.push({
      key: "registerCore",
      sheet: SCHEMAS.registerCore.sheet,
      headers: SCHEMAS.registerCore.headers.slice(),
      rows: [rowObject(SCHEMAS.registerCore.headers, registerValues)],
    });

    rows.push({
      key: "gatePlan",
      sheet: SCHEMAS.gatePlan.sheet,
      headers: SCHEMAS.gatePlan.headers.slice(),
      rows: route.map((gate) =>
        rowObject(SCHEMAS.gatePlan.headers, {
          "AIR-ID": profile.registerId,
          "Gate / forum": gate.forum,
          "Trigger / lifecycle stage": profile.lifecycle,
          Requirement: gate.requirement,
        }),
      ),
    });

    rows.push({
      key: "agpiTriage",
      sheet: SCHEMAS.agpiTriage.sheet,
      headers: SCHEMAS.agpiTriage.headers.slice(),
      rows: AGPI_ROWS.map(([dimension, weight, scoreKey, consideration]) => [
        dimension,
        weight,
        agpiScores[scoreKey] == null ? "" : agpiScores[scoreKey],
        "",
        consideration,
      ]),
    });

    const triggerSet = new Set(results.triggerIds || []);
    const agents = agentic || {};
    const importValues = {
      "AIR-ID": profile.registerId,
      "System / Model Name": profile.systemName,
      "Purpose / Description": profile.purpose,
      "Service Area": profile.serviceArea,
      "Service Owner": profile.serviceOwner,
      "Supplier / Developer": profile.supplierDeveloper,
      Source: profile.source,
      "AI Capability": profile.capability,
      "Automated Action Authority": profile.actionAuthority,
      "Systems / Tools Accessed": profile.systemsAccessed,
      "Lifecycle Stage": profile.lifecycle,
      "Personal / Special Category Data": profile.dataType,
      "AGPI Score (0-100)": results.agpiScore,
      "Raw AGPI Priority": results.rawAgpiPriority || (results.priority && results.priority.label),
      "Effective Governance Priority":
        results.effectiveGovernancePriority ||
        results.rawAgpiPriority ||
        (results.priority && results.priority.label),
      "Resident Impact": impactScores.residentImpact,
      "Legal and Regulatory Impact": impactScores.legalImpact,
      "Reputational Impact": impactScores.reputationImpact,
      "Operational Impact": impactScores.operationalImpact,
      "Financial Impact": impactScores.financialImpact,
      Likelihood: results.risk && results.risk.likelihood,
      "Control Effectiveness": results.risk && results.risk.control,
      "Impact Score": results.risk && results.risk.impact,
      "Inherent Risk Score": results.risk && results.risk.inherent,
      "Inherent Risk Tier": results.inherentTierName,
      "Residual Risk Score": results.risk && results.risk.residual,
      "Residual Risk Tier": results.residualTierName,
      "Mandatory Risk Floor": tierFloor(profile, results),
      "Effective Governance Tier": results.effectiveTierName,
      "Tier Floor Reason": results.floorReason,
      "Assurance Intensity": results.assuranceIntensity,
      "Governance Status": results.governanceStatus,
      "Is Agent": yesNo(isAgent(profile, agentic, results)),
    };
    for (const [label, trigger] of TRIGGER_FIELDS) {
      const selected =
        trigger === "specialData" &&
        profile.dataType === "Special category data"
          ? true
          : triggerSet.has(trigger);
      importValues[label] = yesNo(selected);
    }
    for (const [label, key] of AGENT_DIMENSIONS) {
      if (Object.prototype.hasOwnProperty.call(agents, key)) {
        const value = agents[key];
        importValues[label] =
          typeof value === "boolean" ? yesNo(value) : value;
      }
    }
    const triageImportRows = IMPORT_FIELDS.map(([field, , , source]) => {
      const value = Object.prototype.hasOwnProperty.call(importValues, field)
        ? importValues[field]
        : "";
      return [
        field,
        value == null ? "" : value,
        source === "manual"
          ? "MANUAL / GOVERNANCE — optional"
          : source === "agent-auto"
            ? "AUTO — current Agentic Triage"
            : source === "agent-derived"
              ? "DERIVED — current Agentic Triage"
              : source === "derived"
                ? "DERIVED — current web triage"
                : "AUTO — current web triage",
        "",
        "",
      ];
    });
    rows.push({
      key: "triageImport",
      sheet: SCHEMAS.triageImport.sheet,
      headers: SCHEMAS.triageImport.headers.slice(),
      rows: triageImportRows,
    });

    const capabilitySet = new Set(agents.capabilities || []);
    const multiplierSet = new Set(agents.multipliers || []);
    const capabilityValues = { Notes: "" };
    for (const name of CAPABILITIES) {
      capabilityValues[name] = capabilitySet.has(name) ? "Yes" : "";
    }
    for (const [header, name] of MULTIPLIERS) {
      capabilityValues[header] = multiplierSet.has(name) ? "Yes" : "";
    }
    const capabilityVectorRows = agentic
      ? [
          rowObject(SCHEMAS.capabilityVector.headers, {
            ...capabilityValues,
            Notes:
              "Triage selection only. Unselected capabilities and multipliers remain unknown, not No; verify actual scope and evidence.",
          }),
        ]
      : [];
    rows.push({
      key: "capabilityVector",
      sheet: SCHEMAS.capabilityVector.sheet,
      headers: SCHEMAS.capabilityVector.headers.slice(),
      rows: capabilityVectorRows,
    });

    const missing = [];
    if (!profile.registerId) missing.push("Permanent AIR-ID from the existing register");
    if (!profile.systemName) missing.push("System / Model Name");
    if (!profile.purpose) missing.push("Purpose / Description");
    if (!profile.serviceArea) missing.push("Service Area");
    if (!profile.serviceOwner) missing.push("Service Owner");
    if (!profile.dateFirstUsed) missing.push("Date First Used");
    missing.push(
      "Approved Purpose / Boundary and governance/operational status require owner confirmation",
      "Assessor identity and actual assessment date are not asserted",
      "Gate Plan IDs, target dates, accountable roles, and approvals are not asserted",
    );
    if (agentic) {
      missing.push(
        "Agent mandate, authority, permissions, owners, and approval require authorised evidence",
        "Runtime events and containment evidence are not created by triage",
      );
    }

    return {
      rows,
      schemas: Object.fromEntries(
        Object.entries(SCHEMAS).map(([key, value]) => [
          key,
          {
            sheet: value.sheet,
            headers: value.headers.slice(),
            formulaColumns: value.formulaColumns.slice(),
          },
        ]),
      ),
      report: {
        status: "Draft rows only — owner review required",
        missing,
        useInstructions: [
          "Register Core values are triage candidates; they do not establish an approved purpose, Council decision, or operational status.",
          "Triage Import rows match the five-column key/value layout. Only Canonical field and Value are populated; preserve the source sheet's static notes and copy values into matching blank Value cells.",
          "Action-authority text is copied only from the supplied intake profile and is not evidence of actual permissions, an approved mandate, or delegated authority.",
          "AGPI weighted-point cells and workbook-calculated quality/derived cells are intentionally blank for the source workbook to calculate.",
        ],
        omittedSheets: [
          {
            sheet: "Risk Assessment",
            reason:
              "This worksheet is a labelled form with calculations and trigger inputs, not a relational row schema. No CSV row is emitted for it.",
          },
          {
            sheet: SCHEMAS.agentRecord.sheet,
            reason:
              "The record captures an approved mandate, authority, owners, permissions, approval, and runtime state that triage cannot establish. Its exact headers are available in schemas.agentRecord, but no record row is emitted.",
          },
          {
            sheet: "Gate Events",
            reason:
              "Gate events require actual decisions, dates, decision-makers, event IDs, and evidence; a proposed route is not an event.",
          },
          {
            sheet: "Gate Conditions",
            reason:
              "Conditions require a recorded decision/event, action owner, due date, and resolution evidence; triage creates none.",
          },
        ],
        formulaColumnsBlank: Object.fromEntries(
          Object.entries(SCHEMAS)
            .filter(([, schema]) => schema.formulaColumns.length)
            .map(([key, schema]) => [key, schema.formulaColumns.slice()]),
        ),
      },
    };
  }

  return {
    SCHEMAS,
    buildExactRows,
    toCsv,
  };
});