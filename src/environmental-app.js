(function () {
  "use strict";
  // Environmental considerations (Playbook §4.3.15): live flag and separate CSV
  // download. Optional section; never touches the AI Register export or the tier.
  const logic = window.TriageLogic;
  const byId = (id) => document.getElementById(id);
  if (!logic || !byId("environmentalStep") || !byId("downloadEnvironmental")) return;

  function readEnv() {
    return {
      foundationModels: byId("envFoundationModels").value,
      cloudBased: byId("envCloudBased").value,
      intensity: byId("envComputationalIntensity").value,
      supplierPractices: byId("envSupplierPractices").value,
    };
  }

  function render() {
    const r = logic.environmentalFlag(readEnv());
    const box = byId("envResultBox");
    box.hidden = !r.complete;
    box.dataset.flag = r.flag;
    byId("envFlag").textContent = r.flag;
    byId("envIntensity").textContent = readEnv().intensity;
    byId("envSupplierNeeded").textContent = r.supplierInfoNeeded;
    byId("envWhy").textContent = r.reasons.join("; ");
    byId("envAction").textContent = r.action;
    return r;
  }

  function slug(text) {
    return (text || "ai-system").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "ai-system";
  }

  byId("environmentalStep").addEventListener("change", render);
  byId("downloadEnvironmental").addEventListener("click", () => {
    const r = render();
    const msg = byId("validationMessage");
    const name = byId("systemName").value.trim();
    if (!name) {
      msg.textContent = "Add the system or model name before downloading the environmental considerations.";
      byId("systemName").focus();
      return;
    }
    if (!r.complete) {
      msg.textContent = "Answer the four environmental questions (Environmental considerations, optional) before downloading them.";
      const step = byId("environmentalStep");
      step.open = true;
      byId("envFoundationModels").focus();
      return;
    }
    msg.textContent = "";
    const csv = logic.buildEnvironmentalCsv({ registerId: byId("registerId").value.trim(), systemName: name }, readEnv());
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slug(name)}-environmental-considerations.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  });
  render();
})();
