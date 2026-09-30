(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.PilotScenarios = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  // FICTIONAL DEMONSTRATION DATA ONLY. These eleven uses of one made-up system
  // show every AGPI priority and risk tier, and agency tiers T1 to T5 (under the
  // suite v3.9 tier-assignment table none of them reaches T0). They are not Council
  // records, the identifiers are not Council-issued, and nothing here is stored,
  // exported or sent anywhere. Loading a scenario blocks every export.
  const SYSTEM = {
    registerId: "AIR-DEMO-01",
    systemName: "DEMO: Riverside Repairs Assistant (fictional)",
    purpose: "Fictional pilot system used to demonstrate every triage outcome. Not a real Council system.",
    serviceArea: "Housing repairs (fictional demo)",
    serviceOwner: "Fictional demo owner",
    supplierDeveloper: "Fictional in-house team",
    source: "Internally developed",
    procurementRequired: "No",
    lifecycle: "Pilot",
    ucIdStatus: "Provisional — operator-entered, unverified",
  };
  const SCENARIOS = [
    {
      "id": "UC-DEMO-01",
      "lane": "Standard",
      "title": "Repairs manual summariser for staff",
      "profile": {
        "capability": "Generative AI",
        "dataType": "None",
        "publicFacing": "No",
        "affectsIndividuals": "No",
        "actionAuthority": "None — outputs only"
      },
      "agpi": {
        "resident": 2,
        "trust": 2,
        "legal": 1,
        "visibility": 1,
        "strategic": 2,
        "oversight": 1
      },
      "impacts": {
        "residentImpact": 1,
        "legalImpact": 1,
        "reputationImpact": 1,
        "operationalImpact": 2,
        "financialImpact": 1
      },
      "likelihood": 2,
      "control": 3,
      "controlEvidence": "Implemented and evidenced",
      "triggers": [],
      "expected": {
        "agpiScore": 13.75,
        "priority": "Priority 5 – Observe",
        "effectiveTier": "Low",
        "pathway": "Light-touch governance pathway"
      }
    },
    {
      "id": "UC-DEMO-02",
      "lane": "Standard",
      "title": "Sorts incoming repair requests by trade for staff to check",
      "profile": {
        "capability": "Natural Language Processing",
        "dataType": "Personal data",
        "publicFacing": "No",
        "affectsIndividuals": "No",
        "actionAuthority": "None — outputs only"
      },
      "agpi": {
        "resident": 3,
        "trust": 2,
        "legal": 2,
        "visibility": 2,
        "strategic": 3,
        "oversight": 2
      },
      "impacts": {
        "residentImpact": 2,
        "legalImpact": 2,
        "reputationImpact": 2,
        "operationalImpact": 3,
        "financialImpact": 1
      },
      "likelihood": 2,
      "control": 3,
      "controlEvidence": "Implemented and evidenced",
      "triggers": [],
      "expected": {
        "agpiScore": 33.75,
        "priority": "Priority 4 – Routine",
        "effectiveTier": "Low",
        "pathway": "Light-touch governance pathway"
      }
    },
    {
      "id": "UC-DEMO-03",
      "lane": "Standard",
      "title": "Public chatbot answering repair questions and job-status lookups",
      "profile": {
        "capability": "Generative AI",
        "dataType": "Personal data",
        "publicFacing": "Yes",
        "affectsIndividuals": "Yes",
        "actionAuthority": "None — outputs only"
      },
      "agpi": {
        "resident": 3,
        "trust": 4,
        "legal": 3,
        "visibility": 3,
        "strategic": 3,
        "oversight": 3
      },
      "impacts": {
        "residentImpact": 3,
        "legalImpact": 2,
        "reputationImpact": 3,
        "operationalImpact": 3,
        "financialImpact": 2
      },
      "likelihood": 3,
      "control": 3,
      "controlEvidence": "Implemented and evidenced",
      "triggers": [],
      "expected": {
        "agpiScore": 55,
        "priority": "Priority 3 – Standard",
        "effectiveTier": "Medium",
        "pathway": "Non-agentic governance pathway"
      }
    },
    {
      "id": "UC-DEMO-04",
      "lane": "Standard",
      "title": "Recommends an urgency band for damp and mould reports; an officer confirms",
      "profile": {
        "capability": "Predictive AI",
        "dataType": "Personal data",
        "publicFacing": "No",
        "affectsIndividuals": "Yes",
        "actionAuthority": "None — outputs only"
      },
      "agpi": {
        "resident": 4,
        "trust": 4,
        "legal": 4,
        "visibility": 3,
        "strategic": 4,
        "oversight": 3
      },
      "impacts": {
        "residentImpact": 4,
        "legalImpact": 4,
        "reputationImpact": 3,
        "operationalImpact": 3,
        "financialImpact": 2
      },
      "likelihood": 3,
      "control": 3,
      "controlEvidence": "Implemented and evidenced",
      "triggers": [
        "vulnerable"
      ],
      "expected": {
        "agpiScore": 68.75,
        "priority": "Priority 2 – High",
        "effectiveTier": "High",
        "pathway": "Non-agentic governance pathway"
      }
    },
    {
      "id": "UC-DEMO-05",
      "lane": "Standard",
      "title": "Recommends which households are moved out (decanted) during major works",
      "profile": {
        "capability": "Predictive AI",
        "dataType": "Special category data",
        "publicFacing": "No",
        "affectsIndividuals": "Yes",
        "actionAuthority": "None — outputs only"
      },
      "agpi": {
        "resident": 5,
        "trust": 5,
        "legal": 5,
        "visibility": 4,
        "strategic": 4,
        "oversight": 4
      },
      "impacts": {
        "residentImpact": 5,
        "legalImpact": 5,
        "reputationImpact": 4,
        "operationalImpact": 3,
        "financialImpact": 3
      },
      "likelihood": 3,
      "control": 2,
      "controlEvidence": "Implemented, evidenced and independently verified",
      "triggers": [
        "vulnerable",
        "housingCare",
        "statutory"
      ],
      "expected": {
        "agpiScore": 91.25,
        "priority": "Priority 1 – Critical",
        "effectiveTier": "Critical",
        "pathway": "Non-agentic governance pathway"
      }
    },
    {
      "id": "UC-DEMO-06",
      "lane": "Agentic",
      "title": "Answers staff questions on repair policy; takes no action",
      "profile": {
        "capability": "Generative AI",
        "dataType": "None",
        "publicFacing": "No",
        "affectsIndividuals": "No",
        "actionAuthority": "None — outputs only"
      },
      "agpi": {
        "resident": 1,
        "trust": 2,
        "legal": 1,
        "visibility": 2,
        "strategic": 2,
        "oversight": 1
      },
      "impacts": {
        "residentImpact": 1,
        "legalImpact": 1,
        "reputationImpact": 1,
        "operationalImpact": 2,
        "financialImpact": 1
      },
      "likelihood": 2,
      "control": 3,
      "controlEvidence": "Implemented and evidenced",
      "triggers": [],
      "expected": {
        "agpiScore": 11.25,
        "priority": "Priority 5 – Observe",
        "effectiveTier": "Low",
        "pathway": "Light-touch governance pathway",
        "agencyTier": "T1 assisted"
      },
      "outcomeChange": "Suite v3.9: the agency tier now follows the AIG-AGT-02 / AIG-AGT-03 tier-assignment table (Table A: Consequence 1 sets a T1 floor), so this scenario's agency tier moved from T0 informational to T1 assisted. Its scores are unchanged; priority, risk tier and pathway are unchanged.",
      "agentic": {
        "dimensions": {
          "consequence": 1,
          "autonomy": 0,
          "authority": 0,
          "reach": 1,
          "controllability": 0
        },
        "multipliers": [],
        "killSwitch": true,
        "rollback": true,
        "boundariesTested": true
      }
    },
    {
      "id": "UC-DEMO-07",
      "lane": "Agentic",
      "title": "Drafts appointment emails to residents; an officer clicks send",
      "profile": {
        "capability": "Agentic AI",
        "dataType": "Personal data",
        "publicFacing": "No",
        "affectsIndividuals": "Yes",
        "actionAuthority": "Human approves each action"
      },
      "agpi": {
        "resident": 2,
        "trust": 3,
        "legal": 2,
        "visibility": 2,
        "strategic": 2,
        "oversight": 2
      },
      "impacts": {
        "residentImpact": 2,
        "legalImpact": 2,
        "reputationImpact": 2,
        "operationalImpact": 2,
        "financialImpact": 1
      },
      "likelihood": 2,
      "control": 3,
      "controlEvidence": "Implemented and evidenced",
      "triggers": [],
      "expected": {
        "agpiScore": 30,
        "priority": "Priority 4 – Routine",
        "effectiveTier": "Low",
        "pathway": "Agentic governance pathway",
        "agencyTier": "T1 assisted"
      },
      "agentic": {
        "dimensions": {
          "consequence": 1,
          "autonomy": 1,
          "authority": 1,
          "reach": 1,
          "controllability": 1
        },
        "multipliers": [
          "External communication"
        ],
        "killSwitch": true,
        "rollback": true,
        "boundariesTested": true
      }
    },
    {
      "id": "UC-DEMO-08",
      "lane": "Agentic",
      "title": "Books routine repair slots in the scheduling system within set rules",
      "profile": {
        "capability": "Agentic AI",
        "dataType": "Personal data",
        "publicFacing": "No",
        "affectsIndividuals": "Yes",
        "actionAuthority": "Acts within defined bounds — monitored"
      },
      "agpi": {
        "resident": 3,
        "trust": 3,
        "legal": 2,
        "visibility": 3,
        "strategic": 3,
        "oversight": 3
      },
      "impacts": {
        "residentImpact": 2,
        "legalImpact": 2,
        "reputationImpact": 2,
        "operationalImpact": 3,
        "financialImpact": 2
      },
      "likelihood": 3,
      "control": 2,
      "controlEvidence": "Implemented and evidenced",
      "triggers": [],
      "expected": {
        "agpiScore": 45,
        "priority": "Priority 3 – Standard",
        "effectiveTier": "Critical",
        "pathway": "Agentic governance pathway",
        "agencyTier": "T2 bounded agent"
      },
      "agentic": {
        "dimensions": {
          "consequence": 2,
          "autonomy": 2,
          "authority": 2,
          "reach": 2,
          "controllability": 1
        },
        "multipliers": [],
        "killSwitch": true,
        "rollback": true,
        "boundariesTested": true
      }
    },
    {
      "id": "UC-DEMO-09",
      "lane": "Agentic",
      "title": "Raises works orders to contractors (up to £500) and updates the housing record",
      "profile": {
        "capability": "Agentic AI",
        "dataType": "Personal data",
        "publicFacing": "No",
        "affectsIndividuals": "Yes",
        "actionAuthority": "Acts within defined bounds — monitored"
      },
      "agpi": {
        "resident": 3,
        "trust": 4,
        "legal": 3,
        "visibility": 3,
        "strategic": 4,
        "oversight": 3
      },
      "impacts": {
        "residentImpact": 3,
        "legalImpact": 3,
        "reputationImpact": 3,
        "operationalImpact": 3,
        "financialImpact": 3
      },
      "likelihood": 3,
      "control": 3,
      "controlEvidence": "Implemented and evidenced",
      "triggers": [],
      "expected": {
        "agpiScore": 57.5,
        "priority": "Priority 3 – Standard",
        "effectiveTier": "Critical",
        "pathway": "Agentic governance pathway",
        "agencyTier": "T3 consequential agent"
      },
      "agentic": {
        "dimensions": {
          "consequence": 3,
          "autonomy": 3,
          "authority": 3,
          "reach": 2,
          "controllability": 3
        },
        "multipliers": [
          "External communication",
          "Financial authority"
        ],
        "killSwitch": true,
        "rollback": true,
        "boundariesTested": true
      }
    },
    {
      "id": "UC-DEMO-10",
      "lane": "Agentic",
      "title": "Coordinates repairs by handing tasks to a scheduling agent and a resident-messaging agent",
      "profile": {
        "capability": "Agentic AI",
        "dataType": "Personal data",
        "publicFacing": "Yes",
        "affectsIndividuals": "Yes",
        "actionAuthority": "Acts within defined bounds — monitored"
      },
      "agpi": {
        "resident": 4,
        "trust": 4,
        "legal": 3,
        "visibility": 4,
        "strategic": 4,
        "oversight": 4
      },
      "impacts": {
        "residentImpact": 3,
        "legalImpact": 3,
        "reputationImpact": 4,
        "operationalImpact": 3,
        "financialImpact": 3
      },
      "likelihood": 3,
      "control": 3,
      "controlEvidence": "Implemented and evidenced",
      "triggers": [
        "novel"
      ],
      "expected": {
        "agpiScore": 70,
        "priority": "Priority 2 – High",
        "effectiveTier": "Critical",
        "pathway": "Agentic governance pathway",
        "agencyTier": "T4 high-agency"
      },
      "agentic": {
        "dimensions": {
          "consequence": 3,
          "autonomy": 3,
          "authority": 3,
          "reach": 3,
          "controllability": 3
        },
        "multipliers": [
          "Delegation",
          "Memory",
          "External communication"
        ],
        "killSwitch": true,
        "rollback": false,
        "boundariesTested": true
      }
    },
    {
      "id": "UC-DEMO-11",
      "lane": "Agentic",
      "title": "Shuts off building water or gas via smart controls when it detects a leak, and messages every resident",
      "profile": {
        "capability": "Agentic AI",
        "dataType": "Personal data",
        "publicFacing": "Yes",
        "affectsIndividuals": "Yes",
        "actionAuthority": "Fully autonomous"
      },
      "agpi": {
        "resident": 5,
        "trust": 5,
        "legal": 5,
        "visibility": 4,
        "strategic": 4,
        "oversight": 5
      },
      "impacts": {
        "residentImpact": 5,
        "legalImpact": 5,
        "reputationImpact": 5,
        "operationalImpact": 5,
        "financialImpact": 4
      },
      "likelihood": 3,
      "control": 3,
      "controlEvidence": "Not evidenced — planned or unverified",
      "triggers": [
        "vulnerable",
        "novel"
      ],
      "expected": {
        "agpiScore": 93.75,
        "priority": "Priority 1 – Critical",
        "effectiveTier": "Critical",
        "pathway": "Agentic governance pathway",
        "agencyTier": "T5 exceptional / high-consequence"
      },
      "agentic": {
        "dimensions": {
          "consequence": 4,
          "autonomy": 4,
          "authority": 4,
          "reach": 5,
          "controllability": 4
        },
        "multipliers": [
          "External communication",
          "Credential access"
        ],
        "killSwitch": false,
        "rollback": false,
        "boundariesTested": false
      }
    }
  ];
  return { SYSTEM, SCENARIOS };
});
