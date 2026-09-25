(function () {
  "use strict";
  const logic = window.TriageLogic;
  const byId = (id) => document.getElementById(id);
  if (!logic || !byId("retireMode")) return;

  const retState = {};
  const identityIds = ["registerId", "systemName", "serviceArea", "serviceOwner"];

  function buildPriorityOptions() {
    const sel = byId("ret-priority");
    sel.replaceChildren();
    const prompt = document.createElement("option");
    prompt.value = "";
    prompt.textContent = "Select current priority from 05";
    prompt.disabled = true;
    prompt.selected = true;
    sel.appendChild(prompt);
    logic.RETIREMENT_PRIORITIES.forEach((p) => {
      const o = document.createElement("option");
      o.value = p.label;
      o.textContent = p.label;
      sel.appendChild(o);
    });
    sel.value = "";
  }

  function currentLevel() {
    return logic.retLevelFor(byId("ret-priority").value);
  }

  function makeInput(field) {
    let el;
    if (field.type === "select") {
      el = document.createElement("select");
      field.options.forEach((opt) => {
        const o = document.createElement("option");
        o.value = opt;
        o.textContent = opt;
        el.appendChild(o);
      });
    } else if (field.type === "textarea") {
      el = document.createElement("textarea");
      el.rows = 2;
    } else {
      el = document.createElement("input");
      el.type = field.type === "date" ? "date" : "text";
      el.autocomplete = "off";
      if (field.placeholder) el.placeholder = field.placeholder;
    }
    el.id = "ret-f-" + field.id;
    el.dataset.ret = field.id;
    if (Object.prototype.hasOwnProperty.call(retState, field.id)) {
      el.value = retState[field.id];
    } else if (field.type === "select") {
      retState[field.id] = el.value; // record default so outputs are consistent
    }
    return el;
  }

  function renderFields() {
    const host = byId("retireFields");
    host.replaceChildren();
    const level = currentLevel();
    const fields = logic.retirementFieldsFor(level);
    logic.RETIREMENT_GROUP_ORDER.forEach((group) => {
      const inGroup = fields.filter((f) => f.group === group);
      if (!inGroup.length) return;
      const wrap = document.createElement("div");
      wrap.className = "retire-group";
      const h = document.createElement("h3");
      h.textContent = group;
      wrap.appendChild(h);
      const grid = document.createElement("div");
      grid.className = "form-grid";
      inGroup.forEach((field) => {
        const label = document.createElement("label");
        label.className = "field" + (field.type === "textarea" ? " span-2" : "");
        const span = document.createElement("span");
        span.textContent = field.label;
        label.appendChild(span);
        label.appendChild(makeInput(field));
        grid.appendChild(label);
      });
      wrap.appendChild(grid);
      host.appendChild(wrap);
    });
  }

  function collect() {
    const level = currentLevel();
    const ret = {
      priorityLabel: byId("ret-priority").value,
      priorityLevel: level,
      tier: byId("ret-tier").value,
    };
    identityIds.forEach((id) => {
      ret[id] = byId("ret-" + id).value.trim();
    });
    // Only emit fields in scope for the current priority. Higher-priority
    // answers stay in retState (so they return if the priority is raised
    // again) but must not leak into the record of a system classified lower.
    logic.RETIREMENT_FIELDS.forEach((f) => {
      ret[f.id] = level <= f.showAtOrAbove ? retState[f.id] || "" : "";
    });
    return ret;
  }

  function renderScaleNote() {
    const level = currentLevel();
    const label = byId("ret-priority").value;
    const n = logic.retirementFieldsFor(level).length;
    let extra = "the full decommission gate while current priority is unverified";
    if (level <= 1) extra = "the full decommission gate, including board-level assurance";
    else if (level <= 2) extra = "records, accountability and notification checks on top of the base set";
    else if (level <= 3) extra = "continuity and dependency checks on top of the base set";
    byId("retireScaleNote").textContent = label
      ? `${label}: the gate asks ${extra} (${n} fields). Verify this against the system's current 05 value.`
      : `Current 05 priority not selected: full-depth prompts are shown (${n} fields). Select the system's verified current priority to adjust review depth.`;
  }

  function renderOutputs() {
    const ret = collect();
    const gate = logic.buildRetirementGateLogRow(ret);
    const readiness = gate.readiness;

    const panel = byId("retireReadiness");
    panel.className = "retire-readiness " + (readiness.complete ? "is-complete" : "is-pending");
    panel.replaceChildren();
    const h = document.createElement("h3");
    h.textContent = "Retirement review (no readiness determination) ";
    const badge = document.createElement("span");
    badge.className = "retire-status-badge " + (readiness.complete ? "is-complete" : "is-pending");
    badge.textContent = readiness.status;
    h.appendChild(badge);
    panel.appendChild(h);
    if (readiness.complete) {
      const p = document.createElement("p");
      p.textContent = "No verified readiness conclusion is available. Self-reported answers do not establish evidence, decision authority, closure or current 05 status.";
      p.style.margin = "0.4rem 0 0";
      panel.appendChild(p);
    } else {
      const p = document.createElement("p");
      p.textContent = "Outstanding evidence and authority review (not a switch-off readiness test):";
      p.style.margin = "0.4rem 0 0";
      panel.appendChild(p);
      const ul = document.createElement("ul");
      readiness.outstanding.forEach((item) => {
        const li = document.createElement("li");
        li.textContent = item;
        ul.appendChild(li);
      });
      panel.appendChild(ul);
    }

    byId("retireGateLog").textContent = gate.rows
      .map((row) => gate.headers.map((head, i) => `${head}: ${row[i]}`).join("\n"))
      .join("\n\n");
    byId("retireDecision").textContent = logic.buildRetirementDecisionRecord(ret);
  }

  function refreshAll() {
    renderFields();
    renderScaleNote();
    renderOutputs();
  }

  // ---- mode switching ----
  const stepNav = document.querySelector(".step-nav");
  const triageForm = byId("triageForm");
  function setMode(mode) {
    const retiring = mode === "retire";
    byId("retireMode").hidden = !retiring;
    if (stepNav) stepNav.hidden = retiring;
    if (triageForm) triageForm.hidden = retiring;
    byId("modeRetire").classList.toggle("is-active", retiring);
    byId("modeRetire").setAttribute("aria-pressed", String(retiring));
    byId("modeTriage").classList.toggle("is-active", !retiring);
    byId("modeTriage").setAttribute("aria-pressed", String(!retiring));
    if (retiring) refreshAll();
  }
  byId("modeTriage").addEventListener("click", () => setMode("triage"));
  byId("modeRetire").addEventListener("click", () => setMode("retire"));

  // ---- listeners ----
  byId("retireFields").addEventListener("input", (e) => {
    const key = e.target && e.target.dataset ? e.target.dataset.ret : null;
    if (key) {
      retState[key] = e.target.value;
      renderOutputs();
    }
  });
  byId("retireFields").addEventListener("change", (e) => {
    const key = e.target && e.target.dataset ? e.target.dataset.ret : null;
    if (key) {
      retState[key] = e.target.value;
      renderOutputs();
    }
  });
  ["ret-registerId", "ret-systemName", "ret-serviceArea", "ret-serviceOwner", "ret-tier"].forEach((id) => {
    byId(id).addEventListener("input", renderOutputs);
    byId(id).addEventListener("change", renderOutputs);
  });
  byId("ret-priority").addEventListener("change", refreshAll);

  // ---- exports ----
  function validate() {
    const name = byId("ret-systemName");
    if (!name.value.trim()) {
      byId("retireValidation").textContent = "Add the system or model name before exporting.";
      name.reportValidity();
      name.focus();
      return false;
    }
    byId("retireValidation").textContent = "";
    return true;
  }
  function slug(v) {
    const s = String(v || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    return s || "ai-system";
  }
  function download(filename, contents, type) {
    const blob = new Blob([contents], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }
  byId("retireDownloadGateLog").addEventListener("click", () => {
    if (!validate()) return;
    const gate = logic.buildRetirementGateLogRow(collect());
    download(slug(byId("ret-systemName").value) + "-retirement-36-review-handoff.csv",
      logic.toCsv(gate.headers, gate.rows), "text/csv;charset=utf-8");
  });
  byId("retireDownloadDecision").addEventListener("click", () => {
    if (!validate()) return;
    download(slug(byId("ret-systemName").value) + "-retirement-decision-paper-handoff.txt",
      logic.buildRetirementDecisionRecord(collect()), "text/plain;charset=utf-8");
  });
  byId("retireCopy").addEventListener("click", async () => {
    if (!validate()) return;
    const ret = collect();
    const gate = logic.buildRetirementGateLogRow(ret);
    const text =
      "36 RETIREMENT REVIEW HANDOFF — NOT A LIVE WORKBOOK ROW\n" +
      gate.rows.map((row) => gate.headers.map((h, i) => `${h}: ${row[i]}`).join("\n")).join("\n\n") +
      "\n\n" + logic.buildRetirementDecisionRecord(ret);
    const status = byId("retireCopyStatus");
    try {
      await navigator.clipboard.writeText(text);
      status.textContent = "Copied to the clipboard.";
    } catch (_e) {
      status.textContent = "The browser blocked clipboard access. Use the download buttons instead.";
    }
  });
  byId("retirePrint").addEventListener("click", () => window.print());

  // ---- init ----
  buildPriorityOptions();
  refreshAll();
})();
