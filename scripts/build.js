#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const htmlPath = path.join(root, "index.html");
const html = fs.readFileSync(htmlPath, "utf8");
const sources = [
  ["triage-logic", "src/triage-logic.js"],
  ["triage-app", "src/triage-app.js"],
  ["retire-app", "src/retire-app.js"],
];

let output = html;
for (const [id, sourcePath] of sources) {
  const scriptSource = fs.readFileSync(path.join(root, sourcePath), "utf8").trimEnd();
  const pattern = new RegExp(`(<script id="${id}">)[\\s\\S]*?</script>`);
  if (!pattern.test(output)) {
    throw new Error(`Expected one embedded script with id "${id}" in index.html.`);
  }
  output = output.replace(pattern, `$1\n${scriptSource}\n    </script>`);
}

if (process.argv.includes("--check")) {
  if (output !== html) {
    console.error("index.html is out of date. Run node scripts/build.js.");
    process.exitCode = 1;
  } else {
    console.log("index.html matches the maintained JavaScript sources.");
  }
} else {
  fs.writeFileSync(htmlPath, output);
  console.log("Built self-contained index.html from src/*.js.");
}