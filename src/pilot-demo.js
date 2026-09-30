(function () {
  "use strict";

  // Guarded demo mode for the fictional pilot scenarios (src/pilot-scenarios.js).
  // While a demo is loaded: a fixed banner says the data is fictional, every
  // export, copy and print route is blocked, and the only way out is a full
  // reset of the page. Nothing is stored or sent anywhere.
  const data = window.PilotScenarios;
  const logic = window.TriageLogic;
  const form = document.getElementById("triageForm");
  if (!data || !logic || !form) return;

  const byId = (id) => document.getElementById(id);
  const EXPORT_IDS = [
    "downloadRegister", "downloadCapabilitiesMap", "downloadCanonical", "downloadAgpi",
    "downloadRisk", "downloadGateReady", "downloadGates", "downloadHandoff",
    "downloadAgent", "downloadCapabilities", "downloadAgenticGovernance",
    "downloadSummary", "copySummary", "printResult",
  ];
  const BLOCKED_MESSAGE =
    "Exports are switched off in demo mode. This is fictional demo data, not a Council record. Choose “Clear demo” to start a real triage.";
  let demoActive = false;

  const style = document.createElement("style");
  style.id = "pilot-demo-style";
  style.textContent = [
    ".pilot-demo{border:2px dashed #b7791f;background:#fffaf0;border-radius:10px;padding:14px 16px;margin:0 0 18px}",
    ".pilot-demo h2{font-size:1.05rem;margin:0 0 4px;color:#7b341e}",
    ".pilot-demo p{margin:4px 0 10px;font-size:.92rem}",
    ".pilot-demo-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center}",
    ".pilot-demo-row select{flex:1 1 320px;min-width:0;max-width:100%}",
    ".pilot-demo-banner{position:sticky;top:0;z-index:50;background:#b7791f;color:#fff;font-weight:700;text-align:center;padding:8px 12px;margin:0 0 12px;border-radius:6px}",
    ".pilot-demo-banner[hidden]{display:none}",
    "body.demo-mode .export-panel button{opacity:.45;cursor:not-allowed}",
    "@media print{body.demo-mode *{visibility:hidden!important}body.demo-mode::after{visibility:visible;content:'Fictional demo scenario: not a Council record. Printing is switched off in demo mode.';position:fixed;top:40%;left:0;right:0;text-align:center;font:700 20px sans-serif}}",
  ].join("");
  document.head.appendChild(style);

  const panel = document.createElement("section");
  panel.className = "pilot-demo";
  panel.id = "pilotDemo";
  panel.setAttribute("aria-labelledby", "pilotDemoTitle");
  panel.innerHTML =
    '<h2 id="pilotDemoTitle">Pilot lab: fictional demo scenarios</h2>' +
    "<p>Load one of eleven uses of a made-up system to see every priority and risk tier, and agency tiers T1 to T5. " +
    "The data is fictional, the identifiers are not Council-issued, and all exports are switched off until you clear the demo.</p>" +
    '<div class="pilot-demo-row">' +
    '<label for="pilotDemoSelect" class="visually-hidden">Demo scenario</label>' +
    '<select id="pilotDemoSelect"><option value="">Choose a demo scenario…</option></select>' +
    '<button type="button" id="pilotDemoLoad">Load demo</button>' +
    '<button type="button" id="pilotDemoClear" class="secondary" hidden>Clear demo</button>' +
    "</div>";
  const banner = document.createElement("div");
  banner.className = "pilot-demo-banner";
  banner.id = "pilotDemoBanner";
  banner.setAttribute("role", "status");
  banner.hidden = true;

  form.insertBefore(banner, form.firstChild);
  form.insertBefore(panel, banner);

  const select = byId("pilotDemoSelect");
  ["Standard", "Agentic"].forEach((lane) => {
    const group = document.createElement("optgroup");
    group.label = lane + " lane";
    data.SCENARIOS.filter((s) => s.lane === lane).forEach((s) => {
      const option = document.createElement("option");
      option.value = s.id;
      const agency = s.expected.agencyTier ? ", " + s.expected.agencyTier.split(" ")[0] : "";
      option.textContent = s.id + " · " + s.expected.priority.split(" – ")[0] +
        ", " + s.expected.effectiveTier + " risk" + agency + " · " + s.title;
      group.appendChild(option);
    });
    select.appendChild(group);
  });

  function fire(el) {
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }
  function setValue(id, value) {
    const el = byId(id);
    if (!el) return;
    el.value = value;
    fire(el);
  }
  function setChecked(el, on) {
    if (!el || el.disabled) return;
    if (el.checked !== on) {
      el.checked = on;
      fire(el);
    }
  }

  function applyScenario(s) {
    const sys = data.SYSTEM;
    setValue("registerId", sys.registerId);
    setValue("systemName", sys.systemName);
    setValue("purpose", sys.purpose);
    setValue("ucId", s.id);
    setValue("ucIdStatus", sys.ucIdStatus);
    setValue("usePurpose", "FICTIONAL DEMO: " + s.title);
    setValue("serviceArea", sys.serviceArea);
    setValue("serviceOwner", sys.serviceOwner);
    setValue("supplierDeveloper", sys.supplierDeveloper);
    setValue("source", sys.source);
    setValue("procurementRequired", sys.procurementRequired);
    setValue("lifecycle", sys.lifecycle);
    Object.entries(s.profile).forEach(([id, value]) => setValue(id, value));

    logic.DIMENSIONS.forEach((d) => {
      const radio = byId("score-" + d.id + "-" + s.agpi[d.id]);
      if (radio) { radio.checked = true; fire(radio); }
    });
    Object.entries(s.impacts).forEach(([id, value]) => setValue("impact-" + id, String(value)));
    setValue("likelihood", String(s.likelihood));
    setValue("control", String(s.control));
    setValue("controlEvidence", s.controlEvidence);

    form.querySelectorAll("[data-trigger]").forEach((box) => {
      setChecked(box, s.triggers.includes(box.dataset.trigger));
    });

    const ag = s.agentic;
    logic.AGENCY_DIMENSIONS.forEach((d) => {
      setValue("ag_" + d.id, ag ? String(ag.dimensions[d.id]) : "");
      setValue("ag_reason_" + d.id, ag ? "Fictional demo score" : "");
    });
    document.querySelectorAll(".ag-mult").forEach((box) => setChecked(box, !!ag && ag.multipliers.includes(box.value)));
    document.querySelectorAll(".ag-cap").forEach((box) => setChecked(box, false));
    setChecked(byId("agKill"), !!ag && ag.killSwitch);
    setChecked(byId("agRollback"), !!ag && ag.rollback);
    setChecked(byId("agBoundaries"), !!ag && ag.boundariesTested);
    if (ag && byId("assessAgency")) byId("assessAgency").click();
    const step = byId("agenticStep");
    if (ag && step && step.hidden) {
      banner.textContent += " Agency tier: " + s.expected.agencyTier +
        " (this use cannot act, so the agentic step stays hidden).";
    }
  }

  function enterDemo(s) {
    demoActive = true;
    document.body.classList.add("demo-mode");
    banner.textContent = "FICTIONAL DEMO: " + s.id + " · " + data.SYSTEM.registerId +
      ". Not a Council record. Exports, copying and printing are switched off.";
    banner.hidden = false;
    byId("pilotDemoClear").hidden = false;
    EXPORT_IDS.forEach((id) => {
      const b = byId(id);
      if (b) b.setAttribute("aria-disabled", "true");
    });
  }

  // Capture phase: runs before the tool's own export handlers.
  document.addEventListener("click", (event) => {
    if (!demoActive) return;
    const button = event.target.closest && event.target.closest("button");
    if (!button || !EXPORT_IDS.includes(button.id)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const msg = byId("validationMessage");
    if (msg) msg.textContent = BLOCKED_MESSAGE;
  }, true);
  window.addEventListener("beforeprint", () => {
    if (demoActive) {
      const msg = byId("validationMessage");
      if (msg) msg.textContent = BLOCKED_MESSAGE;
    }
  });

  byId("pilotDemoLoad").addEventListener("click", () => {
    const s = data.SCENARIOS.find((item) => item.id === select.value);
    if (!s) return;
    enterDemo(s);
    applyScenario(s);
    const msg = byId("validationMessage");
    if (msg && !msg.textContent) msg.textContent = BLOCKED_MESSAGE;
    const priority = byId("priority");
    if (priority && priority.scrollIntoView) priority.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  byId("pilotDemoClear").addEventListener("click", () => {
    // A full reload guarantees no demo value survives into a real triage.
    window.location.reload();
  });
})();
