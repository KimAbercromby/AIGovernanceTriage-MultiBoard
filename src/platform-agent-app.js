(function () {
  "use strict";
  // Agents built on an approved platform (Playbook Appendix F.8). Runs before the
  // main triage and sits outside its form, so it never changes the established
  // AGPI, risk or agency calculations. Pre-fill only copies answers into Step 1.
  const logic = window.TriageLogic;
  const byId = (id) => document.getElementById(id);
  if (!logic || !byId("platformAgent")) return;

  const triggerBox = byId("paTriggers");
  logic.PLATFORM_AGENT_TRIGGERS.forEach((t) => {
    const label = document.createElement("label");
    label.className = "field";
    const span = document.createElement("span");
    span.textContent = t.text;
    const select = document.createElement("select");
    select.id = `paTrig-${t.id}`;
    select.dataset.paTrigger = t.id;
    ["Unsure", "No", "Yes"].forEach((v) => {
      const o = document.createElement("option");
      o.textContent = v;
      select.appendChild(o);
    });
    label.append(span, select);
    triggerBox.appendChild(label);
  });

  function readInput() {
    return {
      onPlatform: byId("paOnPlatform").value,
      platformAirId: byId("paPlatformAirId").value.trim(),
      platformName: byId("paPlatformName").value.trim(),
      agentName: byId("paAgentName").value.trim(),
      agentPurpose: byId("paPurpose").value.trim(),
      builtBy: byId("paBuiltBy").value.trim(),
      owner: byId("paOwner").value.trim(),
      audience: byId("paAudience").value,
      matchesPattern: byId("paMatchesPattern").value,
      patternUcId: byId("paPatternUcId").value.trim(),
      triggers: Object.fromEntries(
        Array.from(document.querySelectorAll("[data-pa-trigger]")).map((s) => [s.dataset.paTrigger, s.value]),
      ),
    };
  }

  function fillList(el, items) {
    el.replaceChildren();
    items.forEach((text) => {
      const li = document.createElement("li");
      li.textContent = text;
      el.appendChild(li);
    });
  }

  function render() {
    const input = readInput();
    byId("paDetails").hidden = input.onPlatform !== "Yes";
    const orgSelect = byId("paTrig-orgWide");
    if (input.audience === logic.PLATFORM_AGENT_AUDIENCE.org) {
      orgSelect.value = "Yes";
      orgSelect.disabled = true;
    } else {
      orgSelect.disabled = false;
    }
    const s = logic.platformAgentScreen(readInput());
    const panel = byId("paResult");
    panel.className = `result-panel platform-result pa-${s.cls}`;
    byId("paClass").textContent = s.label;
    byId("paTier").textContent = "";
    byId("paWhy").textContent = s.why;
    fillList(byId("paTriggersMet"), s.triggersMet.map((t) => `${t.text}: ${t.answer}`));
    byId("paCanAct").textContent = s.canAct;
    fillList(byId("paNext"), s.nextSteps);
    byId("paPrefill").hidden = !(s.cls === "individual" || s.cls === "patternCandidate");
    return { input: readInput(), screen: s };
  }

  function slug(text) {
    return (text || "agent").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "agent";
  }

  function download(filename, contents) {
    const blob = new Blob([contents], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  function setField(id, value) {
    const el = byId(id);
    if (!el || value == null) return;
    el.value = value;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function yes(v) { return v === "Yes" || v === "Unsure"; }

  function prefill() {
    const { input, screen } = render();
    const t = input.triggers;
    setField("situation", "New use");
    setField("registerId", input.platformAirId);
    setField("systemName", input.platformName);
    setField("purpose", input.platformName
      ? `${input.platformName}: platform already on the AI Register; staff can build agents on it (Appendix F.8).`
      : "");
    setField("serviceOwner", input.owner);
    setField("source", "Embedded in platform / supplier feature");
    setField("procurementRoute", "Existing contract or licence");
    setField("publicFacing", t.residentFacing === "Yes" ? "Yes" : "No");
    setField("affectsIndividuals", yes(t.influencesDecisions) || t.residentFacing === "Yes" ? "Yes" : "No");
    if (t.sensitiveData === "Yes") setField("dataType", "Special category data");
    if (screen.cls === "individual") {
      setField("capability", "Agentic AI");
      setField("usePurpose", `${input.agentName ? input.agentName + ": " : ""}${input.agentPurpose}`);
      const authority = t.actsUnconfirmed === "Yes" ? "Acts within defined bounds — monitored"
        : t.actsUnconfirmed === "Unsure" ? "Unsure — not yet confirmed"
        : yes(t.changesRecords) || yes(t.callsAgent) ? "Human approves each action"
        : "None — outputs only";
      setField("actionAuthority", authority);
    } else {
      setField("capability", "Generative AI");
      setField("actionAuthority", "None — outputs only");
      setField("usePurpose", `Approved pattern: ${input.agentPurpose}`);
      if (input.patternUcId) {
        setField("ucId", input.patternUcId);
        setField("ucIdStatus", "Provisional — operator-entered, unverified");
      }
    }
    byId("paMessage").textContent = "Step 1 has been pre-filled from this screen. Check every field, then score Steps 2 and 3.";
    const profile = byId("profile");
    if (profile) { profile.open = true; profile.scrollIntoView({ behavior: "smooth" }); }
  }

  byId("platformAgent").addEventListener("input", render);
  byId("platformAgent").addEventListener("change", render);
  byId("paDownload").addEventListener("click", () => {
    const { input, screen } = render();
    if (!input.agentName) {
      byId("paMessage").textContent = "Add the agent name before downloading the screening record.";
      byId("paAgentName").focus();
      return;
    }
    byId("paMessage").textContent = "";
    download(`platform-agent-screening-${slug(input.agentName)}.csv`, logic.buildPlatformAgentCsv(input, screen));
  });
  byId("paPrefill").addEventListener("click", prefill);
  render();
})();
