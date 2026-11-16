// Two ways into the same tool (Playbook §3.8: the Service Owner supplies the facts;
// the AI Governance Lead scores priority and risk and sets the route).
//
//  - Service Owner view (#service-owner): a short, plain-English set of questions
//    about the system, ending with a file to send to the AI Governance Lead. No
//    scores, codes or routes are shown, so a Service Owner never marks their own
//    homework.
//  - AI Governance Lead view (default): the full triage, which can load a Service
//    Owner's file so nothing is retyped.
//
// This layer only changes what is shown and how questions are worded. It never
// changes a field's value, option text or any calculation in triage-logic.js.
(function () {
  "use strict";

  const byId = (id) => document.getElementById(id);
  const ROUTE_FINDER = "https://kimabercromby.github.io/AIGovernanceSuiteTools/route-finder.html";
  const FILE_KIND = "ai-governance-service-owner-answers";

  // The Step 1 fields a Service Owner can answer from their own knowledge, with
  // plain-English wording. Everything else in Step 1 is for the AI Governance Lead.
  const SERVICE_OWNER_FIELDS = {
    situation: "What is happening with this AI?",
    registerId: "AI Register number (AIR-ID), only if the system already has one",
    systemName: "Name of the AI tool or system",
    purpose: "What does the tool do?",
    usePurpose: "What will your service use it for, and what do you want it to achieve?",
    serviceArea: "Your service",
    serviceOwner: "Service Owner (the person accountable for this use)",
    supplierDeveloper: "Who supplies or built it?",
    source: "Where does it come from?",
    capability: "What kind of AI is it?",
    actionAuthority: "Can it do things by itself, such as send messages, update records, book or pay, rather than only suggest?",
    systemsAccessed: "Which systems or data will it connect to?",
    lifecycle: "Where are you with it?",
    dataType: "Will it use information about people?",
    procurementRoute: "How are you getting it?",
    newInvestment: "Does it need new money, licences or a new or changed contract?",
    affectsIndividuals: "Could its output affect decisions about residents, staff or services?",
    publicFacing: "Will residents or the public see or use what it produces?",
    dateFirstUsed: "If you are already using it, when did you start?",
  };
  const REQUIRED = ["systemName", "purpose", "usePurpose"];

  // AIG-INV-02 Part B: the ten Fast-Track eligibility questions, word for word. The form
  // is the only place they are held; test/role-mode.test.js checks this copy against it.
  // All ten No means provisionally eligible for Light-touch, which the AI Governance Lead
  // validates (Part C); any Yes or Unsure means full Intake and triage.
  const FAST_TRACK_QUESTIONS = [
    "Can it take or initiate any action, rather than only produce information for a person to act on (for example sending communications, updating records, invoking tools/APIs, creating transactions or instructing another system)?",
    "Does it process special-category or criminal offence data or confidential/restricted data, create profiles or inferences about identifiable people, or give access to personal data the user could not already open? (Ordinary personal data the user already handles in their own work, such as names in their own emails or meeting notes, is No.)",
    "Could its output influence or support a decision about a resident, employee or other individual, even where a human makes the final decision?",
    "Could it affect access to services, benefits, housing, care, safeguarding, enforcement, eligibility or another statutory function?",
    "Does it interact directly with residents or the public, or publish content externally? (Staff using it themselves for their own work is No.)",
    "Does it connect to live databases, operational systems, APIs, credentials or tools, including any write access?",
    "Is it novel, first-of-type, materially changed, fine-tuned, self-learning, agentic, multi-agent, or using dynamic model/tool routing? (A new use of an existing approved system that is itself unchanged is not “materially changed”.)",
    "Could an incorrect output or action cause material legal, equality, privacy, security, safety, financial, service-delivery or reputational harm?",
    "Does it create significant procurement exposure, a new supplier dependency or material operational reliance on a supplier/service?",
    "Is anything about its data, capability, integration, authority, intended use or operating environment currently unknown or uncertain?"
  ];
  const FT_VALUES = { all: "All ten No", any: "One or more Yes or Unsure", none: "Not done (full Intake)" };

  const body = document.body;
  const profile = byId("profile");
  if (!profile) return;

  // ---- remember the original wording so the Lead view is exactly as before ----
  const labelSpan = (id) => {
    const control = byId(id);
    const field = control && control.closest(".field");
    return field ? field.querySelector(":scope > span") : null;
  };
  const originals = new Map();
  function setLabel(id, text) {
    const span = labelSpan(id);
    if (!span) return;
    const node = Array.from(span.childNodes).find((n) => n.nodeType === Node.TEXT_NODE && n.textContent.trim());
    if (!node) return;
    if (!originals.has(id)) originals.set(id, node.textContent);
    node.textContent = text == null ? originals.get(id) : text + " ";
  }
  const headingParts = {
    eyebrow: profile.querySelector(".step-summary .eyebrow"),
    title: byId("profile-title"),
    lede: profile.querySelector(":scope > .lede"),
  };
  const headingOriginal = {
    eyebrow: headingParts.eyebrow && headingParts.eyebrow.textContent,
    title: headingParts.title && headingParts.title.textContent,
    lede: headingParts.lede && headingParts.lede.textContent,
  };

  // Mark the Step 1 fields that are for the Lead only, so CSS can hide them.
  profile.querySelectorAll(".field").forEach((field) => {
    const control = field.querySelector("input, select, textarea");
    if (control && !(control.id in SERVICE_OWNER_FIELDS)) field.classList.add("lead-only-field");
  });

  // ---- Service Owner: the ten Fast-Track questions ----
  const ft = document.createElement("section");
  ft.className = "step so-fasttrack";
  ft.id = "soFastTrack";
  ft.setAttribute("aria-labelledby", "soFastTrackTitle");
  ft.innerHTML =
    '<p class="eyebrow">Quick screening (Fast-Track, AIG-INV-02)</p>' +
    '<h2 id="soFastTrackTitle">Ten quick questions</h2>' +
    "<p>If every answer is No, your use may be able to take the light-touch route, which is quicker. " +
    "Any Yes or Not sure simply means the normal route, which is fine and common. Answer honestly: the AI Governance Lead checks these answers with you.</p>" +
    '<ol class="ft-list">' +
    FAST_TRACK_QUESTIONS.map(function (q, i) {
      const name = "soFt" + i;
      return '<li><fieldset><legend>' + q.replace(/&/g, "&amp;").replace(/</g, "&lt;") + "</legend>" +
        ["Yes", "No", "Unsure"].map(function (v) {
          return '<label><input type="radio" name="' + name + '" value="' + v + '"> ' + (v === "Unsure" ? "Not sure" : v) + "</label>";
        }).join("") + "</fieldset></li>";
    }).join("") +
    "</ol>" +
    '<p class="ft-result" id="soFtResult" role="status"></p>';
  profile.insertAdjacentElement("afterend", ft);

  function fastTrackAnswers() {
    return FAST_TRACK_QUESTIONS.map(function (q, i) {
      const c = ft.querySelector('input[name="soFt' + i + '"]:checked');
      return { question: q, answer: c ? c.value : "" };
    });
  }
  function fastTrackOutcome(answers) {
    if (answers.some((a) => a.answer === "Yes" || a.answer === "Unsure")) return FT_VALUES.any;
    if (answers.every((a) => a.answer === "No")) return FT_VALUES.all;
    return FT_VALUES.none;
  }
  function syncFastTrack() {
    const answers = fastTrackAnswers();
    const outcome = fastTrackOutcome(answers);
    const answered = answers.filter((a) => a.answer).length;
    const field = byId("fastTrack");
    if (field && body.classList.contains("role-so")) {
      field.value = outcome;
      field.dispatchEvent(new Event("change", { bubbles: true }));
    }
    // Earlier answers can contradict an all-No screen (for example "it can act"). Use the
    // tool's own check, so the Service Owner sees the same conflict the Lead would.
    let conflicts = [];
    if (outcome === FT_VALUES.all && window.TriageLogic && window.TriageLogic.fastTrackConflicts) {
      const p = {};
      Object.keys(SERVICE_OWNER_FIELDS).forEach((id) => { const el = byId(id); if (el) p[id] = el.value; });
      conflicts = window.TriageLogic.fastTrackConflicts(p);
    }
    byId("soFtResult").textContent =
      conflicts.length ? "Your earlier answers suggest at least one of these should be Yes or Not sure: " + conflicts.join("; ") + ". Please check, as this changes the route." :
      outcome === FT_VALUES.all ? "All ten answers are No: your use may be suitable for the light-touch route. The AI Governance Lead will confirm." :
      outcome === FT_VALUES.any ? "At least one Yes or Not sure: your use will follow the normal route. That is fine; the AI Governance Lead will guide you." :
      answered ? answered + " of 10 answered." : "";
  }
  ft.addEventListener("change", syncFastTrack);
  // Re-check when an earlier answer changes, but not for the fastTrack field this
  // function sets itself (that would loop).
  profile.addEventListener("change", function (e) {
    if (body.classList.contains("role-so") && e.target && e.target.id !== "fastTrack") syncFastTrack();
  });

  // ---- Service Owner finish panel ----
  const finish = document.createElement("section");
  finish.className = "step so-finish";
  finish.id = "soFinish";
  finish.setAttribute("aria-labelledby", "soFinishTitle");
  finish.innerHTML =
    '<p class="eyebrow">When you have answered the questions</p>' +
    '<h2 id="soFinishTitle">Send your answers to the AI Governance Lead</h2>' +
    "<p>Download your answers and email the file to the AI Governance Lead. They check the answers with you, " +
    "work out the governance priority and risk, and tell you which route your use will follow and what you need to provide. " +
    "You do not need to score anything yourself.</p>" +
    '<p class="export-actions"><button type="button" id="soDownload"><span class="btn-main">Download my answers for the AI Governance Lead</span>' +
    '<span class="btn-ref">A small file to attach to an email · nothing is sent from this page</span></button></p>' +
    '<p class="provisional-cue" id="soMessage" role="status"></p>' +
    '<p class="so-next">Want to see what is likely to happen next? <a href="' + ROUTE_FINDER + '" target="_blank" rel="noopener noreferrer">' +
    "Use the Route Finder</a> to see the steps for your kind of case and who does each one.</p>" +
    '<p class="so-small">Your answers stay in this browser until you download them, and are cleared when you close or reload the page. ' +
    "Please do not include names or details of residents or staff.</p>";
  ft.insertAdjacentElement("afterend", finish);

  function slug(s) {
    return (String(s || "ai-system").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "ai-system").slice(0, 60);
  }

  byId("soDownload").addEventListener("click", function () {
    const msg = byId("soMessage");
    const missing = REQUIRED.map(byId).find((el) => el && !el.value.trim());
    if (missing) {
      msg.textContent = "Please add the name of the tool, what it does, and what your service will use it for before downloading.";
      missing.reportValidity && missing.reportValidity();
      missing.focus();
      return;
    }
    const fields = {};
    Object.keys(SERVICE_OWNER_FIELDS).forEach((id) => {
      const el = byId(id);
      if (el) fields[id] = el.value.trim();
    });
    const ftAnswers = fastTrackAnswers();
    fields.fastTrack = fastTrackOutcome(ftAnswers);
    const record = {
      kind: FILE_KIND,
      version: 1,
      fastTrackAnswers: ftAnswers,
      created_at: new Date().toISOString(),
      note: "Answers from the Service Owner for the AI Governance Lead to check. These are facts about the system and its use; they are not a triage result, a score or a decision.",
      fields,
    };
    const blob = new Blob([JSON.stringify(record, null, 2) + "\n"], { type: "application/json;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = slug(fields.systemName) + "-service-owner-answers.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    msg.textContent = "Downloaded. Attach the file to an email to the AI Governance Lead.";
  });

  // ---- Lead view: load a Service Owner's answers ----
  const loader = document.createElement("section");
  loader.className = "step so-loader";
  loader.id = "soLoader";
  loader.setAttribute("aria-labelledby", "soLoaderTitle");
  loader.innerHTML =
    '<h2 id="soLoaderTitle">Start from a Service Owner’s answers <small>(optional)</small></h2>' +
    "<p>If a Service Owner has sent you their answers file, load it here to fill in Step 1. You then check every field, " +
    "complete the rest of Step 1 and do the scoring. The file is read in this browser only.</p>" +
    '<p class="export-actions"><label class="file-button"><input type="file" id="soFile" accept=".json,application/json">' +
    '<span>Choose answers file…</span></label></p>' +
    '<p class="provisional-cue" id="soLoadMessage" role="status"></p>' +
    '<div class="so-ft-answers" id="soFtAnswers"></div>';
  profile.insertAdjacentElement("beforebegin", loader);

  function optionMatches(select, value) {
    return Array.from(select.options).some((o) => (o.value || o.text) === value);
  }

  byId("soFile").addEventListener("change", function () {
    const msg = byId("soLoadMessage");
    const file = this.files && this.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function () {
      let data;
      try { data = JSON.parse(reader.result); } catch (e) { data = null; }
      if (!data || data.kind !== FILE_KIND || !data.fields || typeof data.fields !== "object") {
        msg.textContent = "This is not a Service Owner answers file from this tool, so nothing was loaded.";
        return;
      }
      const filled = [], skipped = [];
      Object.keys(SERVICE_OWNER_FIELDS).forEach((id) => {
        const el = byId(id);
        const value = data.fields[id];
        if (!el || value == null || value === "") return;
        if (el.tagName === "SELECT" && !optionMatches(el, value)) { skipped.push(id); return; }
        if (id === "registerId" && !/^AIR-[A-Z0-9]{4}/i.test(value)) { skipped.push(id); return; }
        el.value = value;
        el.classList.add("from-service-owner");
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
        filled.push(id);
      });
      const ftField = byId("fastTrack");
      const ftValue = data.fields.fastTrack;
      if (ftField && ftValue && optionMatches(ftField, ftValue)) {
        ftField.value = ftValue;
        ftField.classList.add("from-service-owner");
        ftField.dispatchEvent(new Event("change", { bubbles: true }));
        filled.push("fastTrack");
      }
      const list = byId("soFtAnswers");
      list.innerHTML = "";
      const answers = Array.isArray(data.fastTrackAnswers) ? data.fastTrackAnswers : [];
      if (answers.some((a) => a && a.answer)) {
        const h = document.createElement("p");
        h.innerHTML = "<strong>The Service Owner’s Fast-Track answers</strong> (AIG-INV-02 Part B). Validate them before relying on the result: any Yes or Unsure means full triage.";
        const ol = document.createElement("ol");
        answers.forEach((a) => {
          const li = document.createElement("li");
          li.textContent = (a.question || "") + " ";
          const b = document.createElement("strong");
          b.textContent = a.answer || "not answered";
          li.appendChild(b);
          ol.appendChild(li);
        });
        list.append(h, ol);
      }
      msg.textContent = filled.length + " answers loaded from the Service Owner and marked in Step 1. Check each one with them, then complete the rest." +
        (skipped.length ? " " + skipped.length + " answer(s) could not be used and were left blank: check them with the Service Owner." : "");
      profile.open = true;
      profile.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    reader.readAsText(file);
    this.value = "";
  });

  // ---- results wait until the basics are in (Lead view) ----
  const route = byId("route");
  let waitNote = null;
  if (route) {
    waitNote = document.createElement("p");
    waitNote.className = "route-wait";
    waitNote.textContent = "Add the name of the system, what it does and the use you are triaging in Step 1, and the route will appear here.";
    const heading = route.querySelector("h2");
    (heading && heading.parentElement === route ? heading : route.firstElementChild).insertAdjacentElement("afterend", waitNote);
  }
  function syncBasics() {
    const missing = REQUIRED.some((id) => byId(id) && !byId(id).value.trim());
    body.classList.toggle("needs-basics", missing);
  }
  document.addEventListener("input", syncBasics);
  document.addEventListener("change", syncBasics);

  // ---- switching between the two views ----
  const banner = document.createElement("p");
  banner.className = "role-banner";
  banner.id = "roleBanner";
  const draft = document.querySelector(".draft-notice");
  (draft || profile).insertAdjacentElement(draft ? "afterend" : "beforebegin", banner);

  const draftOriginal = draft ? draft.innerHTML : "";
  function setRole(role) {
    const so = role === "service-owner";
    if (draft) draft.innerHTML = so
      ? "<strong>Draft for review.</strong> This page helps you describe your AI system for the AI Governance Lead. It does not approve anything or decide the route."
      : draftOriginal;
    body.classList.toggle("role-so", so);
    body.classList.toggle("role-lead", !so);
    Object.keys(SERVICE_OWNER_FIELDS).forEach((id) => setLabel(id, so ? SERVICE_OWNER_FIELDS[id] : null));
    if (headingParts.eyebrow) headingParts.eyebrow.textContent = so ? "Your system" : headingOriginal.eyebrow;
    if (headingParts.title) headingParts.title.textContent = so ? "Tell us about your AI system" : headingOriginal.title;
    if (headingParts.lede) headingParts.lede.textContent = so
      ? "Answer what you can. If you are not sure about something, say so: the AI Governance Lead will go through it with you. Questions marked * are needed."
      : headingOriginal.lede;
    banner.innerHTML = so
      ? '<strong>Service Owner view.</strong> A few questions about your system. The AI Governance Lead does the scoring. <a href="#lead">Switch to the AI Governance Lead view</a>'
      : '<strong>AI Governance Lead view.</strong> The full triage. Service Owners can describe their system in a shorter view: <a href="#service-owner">open the Service Owner view</a> or send them the link to it.';
    if (so) profile.open = true;
    syncBasics();
  }
  function roleFromHash() {
    return location.hash === "#service-owner" ? "service-owner" : "lead";
  }
  window.addEventListener("hashchange", function () {
    if (location.hash === "#service-owner" || location.hash === "#lead") {
      setRole(roleFromHash());
      banner.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
  setRole(roleFromHash());
})();
