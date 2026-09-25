"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { deflateRawSync, inflateRawSync } = require("node:zlib");
const Templates = require("../src/local-templates.js");

const AGPI_HEADERS = [
  "Governance dimension",
  "Weight",
  "Score (1–5)",
  "Weighted points",
  "Assessment consideration",
];
const IMPORT_HEADERS = [
  "Canonical field",
  "Value",
  "Capture status",
  "Used in WCC-AIG-07",
  "Implementation note",
];
const GATE_HEADERS = [
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
];
const REGISTER_HEADERS = [
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
];
const VECTOR_HEADERS = [
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
];

const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc & 1) ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function put16(bytes, offset, value) {
  bytes[offset] = value & 255;
  bytes[offset + 1] = (value >>> 8) & 255;
}

function put32(bytes, offset, value) {
  bytes[offset] = value & 255;
  bytes[offset + 1] = (value >>> 8) & 255;
  bytes[offset + 2] = (value >>> 16) & 255;
  bytes[offset + 3] = (value >>> 24) & 255;
}

function get16(bytes, offset) {
  return bytes[offset] | (bytes[offset + 1] << 8);
}

function get32(bytes, offset) {
  return (
    (bytes[offset] |
      (bytes[offset + 1] << 8) |
      (bytes[offset + 2] << 16) |
      (bytes[offset + 3] << 24)) >>>
    0
  );
}

function zip(entries) {
  const local = [];
  const central = [];
  let localOffset = 0;
  for (const [name, source] of entries) {
    const filename = encoder.encode(name);
    const data = encoder.encode(source);
    const compressed = deflateRawSync(data);
    const checksum = crc32(data);
    const localHeader = new Uint8Array(30 + filename.length + compressed.length);
    put32(localHeader, 0, 0x04034b50);
    put16(localHeader, 4, 20);
    put16(localHeader, 6, 0x0800);
    put16(localHeader, 8, 8);
    put16(localHeader, 12, 0x0021);
    put32(localHeader, 14, checksum);
    put32(localHeader, 18, compressed.length);
    put32(localHeader, 22, data.length);
    put16(localHeader, 26, filename.length);
    localHeader.set(filename, 30);
    localHeader.set(compressed, 30 + filename.length);
    local.push(localHeader);

    const centralHeader = new Uint8Array(46 + filename.length);
    put32(centralHeader, 0, 0x02014b50);
    put16(centralHeader, 4, 20);
    put16(centralHeader, 6, 20);
    put16(centralHeader, 8, 0x0800);
    put16(centralHeader, 10, 8);
    put16(centralHeader, 14, 0x0021);
    put32(centralHeader, 16, checksum);
    put32(centralHeader, 20, compressed.length);
    put32(centralHeader, 24, data.length);
    put16(centralHeader, 28, filename.length);
    put32(centralHeader, 42, localOffset);
    centralHeader.set(filename, 46);
    central.push(centralHeader);
    localOffset += localHeader.length;
  }

  const directorySize = central.reduce((sum, part) => sum + part.length, 0);
  const end = new Uint8Array(22);
  put32(end, 0, 0x06054b50);
  put16(end, 8, entries.length);
  put16(end, 10, entries.length);
  put32(end, 12, directorySize);
  put32(end, 16, localOffset);
  const size = local.reduce((sum, part) => sum + part.length, 0) + directorySize + end.length;
  const output = new Uint8Array(size);
  let offset = 0;
  for (const part of [...local, ...central, end]) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

function inlineCell(address, value = "") {
  if (value === "") return `<c r="${address}" s="4"/>`;
  const escaped = value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<c r="${address}" s="4" t="inlineStr"><is><t>${escaped}</t></is></c>`;
}

function row(rowNumber, cells) {
  return `<row r="${rowNumber}">${cells.join("")}</row>`;
}

function worksheet(rows) {
  return `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rows.join("")}</sheetData></worksheet>`;
}

function makeWorkbook({
  wrongAgpiHeader = false,
  wrongRegisterHeader = false,
  missingRegisterFormula = false,
  occupiedAgpiName = false,
  occupiedVectorFlag = false,
  occupiedRegisterName = false,
} = {}) {
  const agpiHeaders = AGPI_HEADERS.slice();
  if (wrongAgpiHeader) agpiHeaders[2] = "Score (1-5)";
  const agpiRows = [
    row(5, [inlineCell("B5", occupiedAgpiName ? "Existing title" : "")]),
    row(6, [inlineCell("B6")]),
    row(7, [inlineCell("B7")]),
    row(9, agpiHeaders.map((header, index) => inlineCell(`${"ABCDE"[index]}9`, header))),
    ...Array.from({ length: 6 }, (_, index) => {
      const number = index + 10;
      return row(number, [
        inlineCell(`C${number}`),
        `<c r="D${number}"><f>C${number}-1</f><v>0</v></c>`,
      ]);
    }),
  ];

  const importRows = [row(4, IMPORT_HEADERS.map((header, index) => inlineCell(`${"ABCDE"[index]}4`, header)))];
  for (let number = 5; number <= 61; number += 1) {
    importRows.push(row(number, [inlineCell(`B${number}`)]));
  }

  const gateRows = [row(4, GATE_HEADERS.map((header, index) => inlineCell(`${"ABCDEFGHIJKL"[index]}4`, header)))];
  gateRows.push(
    row(5, [
      inlineCell("A5"),
      inlineCell("B5"),
      inlineCell("C5"),
      inlineCell("D5"),
      inlineCell("E5"),
      inlineCell("F5"),
      inlineCell("G5"),
      inlineCell("H5"),
      inlineCell("I5"),
      inlineCell("J5"),
      inlineCell("K5"),
      `<c r="L5"><f>COUNTIF(A5:K5,"&lt;&gt;")</f><v>0</v></c>`,
    ]),
  );
  const vectorRows = [
    row(4, VECTOR_HEADERS.map((header, index) => inlineCell(`${"ABCDEFGHIJKLMNOPQRST"[index]}4`, header))),
    row(
      5,
      Array.from({ length: 20 }, (_, index) =>
        inlineCell(
          `${"ABCDEFGHIJKLMNOPQRST"[index]}5`,
          occupiedVectorFlag && index === 1 ? "No" : "",
        ),
      ),
    ),
  ];
  const registerHeaders = REGISTER_HEADERS.slice();
  if (wrongRegisterHeader) registerHeaders[0] = "System ID";
  const registerRow = [
    ...Array.from({ length: 20 }, (_, index) =>
      inlineCell(
        `${"ABCDEFGHIJKLMNOPQRST"[index]}5`,
        occupiedRegisterName && index === 1 ? "Existing system" : "",
      ),
    ),
    '<c r="U5"><f>COUNTA(A5:T5)</f><v>0</v></c>',
    '<c r="V5"><f>IF(A5=&quot;&quot;,&quot;&quot;,&quot;Not triggered by authority field&quot;)</f><v></v></c>',
    inlineCell("W5"),
    inlineCell("X5"),
    missingRegisterFormula ? inlineCell("Y5") : '<c r="Y5"><f>IF(AND(L5=&quot;Approved&quot;,M5=&quot;Active&quot;),1,&quot;&quot;)</f><v></v></c>',
  ];
  const registerRows = [
    row(4, registerHeaders.map((header, index) => inlineCell(`${"ABCDEFGHIJKLMNOPQRSTUVWXY"[index]}4`, header))),
    row(5, registerRow),
  ];
  const workbook = [
    "<workbook xmlns:r=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships\"><sheets>",
    '<sheet name="AGPI Triage" r:id="rId1"/>',
    '<sheet name="Triage Import" r:id="rId2"/>',
    '<sheet name="Gate Plan" r:id="rId3"/>',
    '<sheet name="Capability Vector" r:id="rId4"/>',
    '<sheet name="Register Core" r:id="rId5"/>',
    "</sheets></workbook>",
  ].join("");
  const relationships = [
    "<Relationships>",
    '<Relationship Id="rId1" Target="/xl/worksheets/agpi.xml"/>',
    '<Relationship Id="rId2" Target="/xl/worksheets/import.xml"/>',
    '<Relationship Id="rId3" Target="/xl/worksheets/gates.xml"/>',
    '<Relationship Id="rId4" Target="/xl/worksheets/vector.xml"/>',
    '<Relationship Id="rId5" Target="/xl/worksheets/register.xml"/>',
    "</Relationships>",
  ].join("");

  return zip([
    ["[Content_Types].xml", "<Types/>"],
    ["xl/workbook.xml", workbook],
    ["xl/_rels/workbook.xml.rels", relationships],
    ["xl/worksheets/agpi.xml", worksheet(agpiRows)],
    ["xl/worksheets/import.xml", worksheet(importRows)],
    ["xl/worksheets/gates.xml", worksheet(gateRows)],
    ["xl/worksheets/vector.xml", worksheet(vectorRows)],
    ["xl/worksheets/register.xml", worksheet(registerRows)],
  ]);
}

function makeDocx(documentXml) {
  return zip([
    ["[Content_Types].xml", "<Types/>"],
    ["word/document.xml", documentXml],
  ]);
}

function extract(bytes, path) {
  let endOffset = -1;
  for (let offset = bytes.length - 22; offset >= 0; offset -= 1) {
    if (get32(bytes, offset) === 0x06054b50) {
      endOffset = offset;
      break;
    }
  }
  assert.notEqual(endOffset, -1);
  let cursor = get32(bytes, endOffset + 16);
  const count = get16(bytes, endOffset + 10);
  for (let index = 0; index < count; index += 1) {
    assert.equal(get32(bytes, cursor), 0x02014b50);
    const method = get16(bytes, cursor + 10);
    const compressedSize = get32(bytes, cursor + 20);
    const nameLength = get16(bytes, cursor + 28);
    const extraLength = get16(bytes, cursor + 30);
    const commentLength = get16(bytes, cursor + 32);
    const name = decoder.decode(bytes.subarray(cursor + 46, cursor + 46 + nameLength));
    const localOffset = get32(bytes, cursor + 42);
    if (name === path) {
      const localNameLength = get16(bytes, localOffset + 26);
      const localExtraLength = get16(bytes, localOffset + 28);
      const dataStart = localOffset + 30 + localNameLength + localExtraLength;
      const compressed = bytes.subarray(dataStart, dataStart + compressedSize);
      return decoder.decode(method === 0 ? compressed : inflateRawSync(compressed));
    }
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  throw new Error(`Missing ZIP entry: ${path}`);
}

function zipFileNames(bytes) {
  let endOffset = -1;
  for (let offset = bytes.length - 22; offset >= 0; offset -= 1) {
    if (get32(bytes, offset) === 0x06054b50) {
      endOffset = offset;
      break;
    }
  }
  assert.notEqual(endOffset, -1);
  let cursor = get32(bytes, endOffset + 16);
  const count = get16(bytes, endOffset + 10);
  const names = [];
  for (let index = 0; index < count; index += 1) {
    const nameLength = get16(bytes, cursor + 28);
    const extraLength = get16(bytes, cursor + 30);
    const commentLength = get16(bytes, cursor + 32);
    names.push(decoder.decode(bytes.subarray(cursor + 46, cursor + 46 + nameLength)));
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  return names;
}

function xmlAttribute(xml, key) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|\\s)${escaped}="([^"]*)"`).exec(xml)?.[1] || null;
}

function workbookSheetPath(bytes, requestedName) {
  const workbook = extract(bytes, "xl/workbook.xml");
  const relationships = extract(bytes, "xl/_rels/workbook.xml.rels");
  const relation = new Map(
    [...relationships.matchAll(/<(?:\w+:)?Relationship\b([^>]*)\/?>/g)].map((match) => [
      xmlAttribute(match[1], "Id"),
      xmlAttribute(match[1], "Target"),
    ]),
  );
  for (const match of workbook.matchAll(/<(?:\w+:)?sheet\b([^>]*)\/?>/g)) {
    const attributes = match[1];
    if (xmlAttribute(attributes, "name") !== requestedName) continue;
    const target = relation.get(xmlAttribute(attributes, "r:id"));
    if (!target) return null;
    return target.startsWith("/")
      ? target.slice(1)
      : target.startsWith("xl/")
        ? target
        : `xl/${target}`;
  }
  return null;
}

function cellsByAddress(xml) {
  const cells = new Map();
  for (const match of xml.matchAll(/<(?:\w+:)?c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/(?:\w+:)?c\s*>)/g)) {
    const address = /\br="([^"]+)"/.exec(match[1])?.[1];
    if (address) cells.set(address, match[0]);
  }
  return cells;
}

function findFile(root, predicate) {
  if (!fs.existsSync(root)) return null;
  for (const name of fs.readdirSync(root)) {
    const file = path.join(root, name);
    const stat = fs.statSync(file);
    if (stat.isDirectory()) {
      const result = findFile(file, predicate);
      if (result) return result;
    } else if (predicate(name)) {
      return file;
    }
  }
  return null;
}

function templateError(code) {
  return (error) => error instanceof Templates.TemplateError && error.code === code;
}

test("06 AGPI values fill only verified input cells and leave formulas intact", async () => {
  const result = await Templates.fillWorkbookTemplate(makeWorkbook(), {
    kind: "agpi",
    cells: {
      B5: "Synthetic low-risk pilot",
      B6: "AIR-ID supplied by test fixture",
      B7: "Synthetic assessor / explicit date",
      C10: 1,
      C11: 2,
      C12: 3,
      C13: 4,
      C14: 5,
      C15: 1,
    },
  });
  const sheet = extract(result, "xl/worksheets/agpi.xml");
  assert.match(sheet, /<c r="B5" s="4" t="inlineStr"><is><t xml:space="preserve">Synthetic low-risk pilot<\/t><\/is><\/c>/);
  assert.match(sheet, /<c r="C10" s="4"><v>1<\/v><\/c>/);
  assert.match(sheet, /<c r="D10"><f>C10-1<\/f><v>0<\/v><\/c>/);
});

test("06 AGPI refuses unknown headers, invalid scores, occupied cells, and formulas", async () => {
  await assert.rejects(
    Templates.fillWorkbookTemplate(makeWorkbook({ wrongAgpiHeader: true }), {
      kind: "agpi",
      cells: { B5: "Synthetic" },
    }),
    templateError("unsupported-template"),
  );
  await assert.rejects(
    Templates.fillWorkbookTemplate(makeWorkbook(), {
      kind: "agpi",
      cells: { C10: "5" },
    }),
    templateError("invalid-value"),
  );
  await assert.rejects(
    Templates.fillWorkbookTemplate(makeWorkbook({ occupiedAgpiName: true }), {
      kind: "agpi",
      cells: { B5: "Replacement" },
    }),
    templateError("cell-not-blank"),
  );
  const agpiXml = worksheet([
    row(5, ["<c r=\"B5\"><f>1+1</f><v>2</v></c>"]),
    row(9, AGPI_HEADERS.map((header, index) => inlineCell(`${"ABCDE"[index]}9`, header))),
  ]);
  const withFormula = zip([
    ["[Content_Types].xml", "<Types/>"],
    [
      "xl/workbook.xml",
      '<workbook xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="AGPI Triage" r:id="rId1"/></sheets></workbook>',
    ],
    [
      "xl/_rels/workbook.xml.rels",
      '<Relationships><Relationship Id="rId1" Target="/xl/worksheets/agpi.xml"/></Relationships>',
    ],
    ["xl/worksheets/agpi.xml", agpiXml],
  ]);
  await assert.rejects(
    Templates.fillWorkbookTemplate(withFormula, { kind: "agpi", cells: { B5: "Do not overwrite" } }),
    templateError("formula-protected"),
  );
});

test("07 Triage Import accepts only explicit source-sheet values", async () => {
  const result = await Templates.fillWorkbookTemplate(makeWorkbook(), {
    kind: "riskImport",
    cells: {
      B5: "Existing Council-issued AIR-ID supplied by caller",
      B6: "Synthetic system",
      B22: 4,
      B34: "No",
      B40: "Yes",
    },
  });
  const sheet = extract(result, "xl/worksheets/import.xml");
  assert.match(sheet, /<c r="B22" s="4"><v>4<\/v><\/c>/);
  assert.match(sheet, /<c r="B40" s="4" t="inlineStr"><is><t xml:space="preserve">Yes<\/t><\/is><\/c>/);

  await assert.rejects(
    Templates.fillWorkbookTemplate(makeWorkbook(), { kind: "riskImport", cells: { B20: "Priority 1" } }),
    templateError("authority-boundary"),
  );
  await assert.rejects(
    Templates.fillWorkbookTemplate(makeWorkbook(), { kind: "riskImport", cells: { B34: "Unknown" } }),
    templateError("invalid-value"),
  );
  await assert.rejects(
    Templates.fillWorkbookTemplate(makeWorkbook(), { kind: "riskImport", cells: { C42: "Critical" } }),
    templateError("unsupported-cell"),
  );
});

test("05/36 fills Gate Plan draft cells only and protects formula and out-of-range cells", async () => {
  const result = await Templates.fillWorkbookTemplate(makeWorkbook(), {
    kind: "gatePlan",
    cells: {
      A5: "Plan ID supplied by an authorised register owner",
      B5: "Existing Council-issued AIR-ID supplied by caller",
      C5: "Assurance forum supplied by caller",
      G5: "Explicit date supplied by caller",
    },
  });
  const sheet = extract(result, "xl/worksheets/gates.xml");
  assert.match(sheet, /<c r="C5" s="4" t="inlineStr"><is><t xml:space="preserve">Assurance forum supplied by caller<\/t><\/is><\/c>/);
  assert.match(sheet, /<c r="L5"><f>COUNTIF\(A5:K5,"&lt;&gt;"\)<\/f><v>0<\/v><\/c>/);

  await assert.rejects(
    Templates.fillWorkbookTemplate(makeWorkbook(), { kind: "gatePlan", cells: { L5: "Ready" } }),
    templateError("unsupported-cell"),
  );
  await assert.rejects(
    Templates.fillWorkbookTemplate(makeWorkbook(), { kind: "gatePlan", cells: { C505: "Out of range" } }),
    templateError("unsupported-cell"),
  );
});

test("05 Register Core fills only explicit pilot candidates and preserves formula/status fields", async () => {
  const source = makeWorkbook();
  const result = await Templates.fillWorkbookTemplate(source, {
    kind: "registerCore",
    cells: {
      A5: "Verified existing AIR-ID supplied by caller",
      B5: "Synthetic pilot system",
      D5: "Synthetic service area",
      E5: "Synthetic accountable owner",
      F5: "Synthetic supplier",
      G5: "Internally developed",
      H5: "Agentic AI",
      I5: "Idea",
      K5: "Explicit first-use date",
      N5: "Human approves each action",
      O5: "Yes",
    },
  });
  const register = extract(result, "xl/worksheets/register.xml");
  assert.match(register, /<c r="A5" s="4" t="inlineStr"><is><t xml:space="preserve">Verified existing AIR-ID supplied by caller<\/t><\/is><\/c>/);
  for (const address of ["C5", "J5", "L5", "M5", "P5"]) {
    assert.match(register, new RegExp(`<c r="${address}"[^>]*\\/>`));
  }
  for (const address of ["U5", "V5", "Y5"]) {
    assert.match(register, new RegExp(`<c r="${address}"[^>]*><f>`));
  }
  const incomplete = await Templates.fillWorkbookTemplate(source, {
    kind: "registerCore",
    cells: { B5: "Synthetic system without verified identity" },
  });
  const incompleteRegister = extract(incomplete, "xl/worksheets/register.xml");
  for (const address of ["A5", "C5", "L5", "M5", "O5"]) {
    assert.match(incompleteRegister, new RegExp(`<c r="${address}"[^>]*\\/>`));
  }

  await assert.rejects(
    Templates.fillWorkbookTemplate(makeWorkbook({ wrongRegisterHeader: true }), {
      kind: "registerCore",
      cells: { B5: "Synthetic system" },
    }),
    templateError("unsupported-template"),
  );
  await assert.rejects(
    Templates.fillWorkbookTemplate(makeWorkbook({ missingRegisterFormula: true }), {
      kind: "registerCore",
      cells: { B5: "Synthetic system" },
    }),
    templateError("unsupported-template"),
  );
  await assert.rejects(
    Templates.fillWorkbookTemplate(source, { kind: "registerCore", cells: { C5: "Purpose" } }),
    templateError("unsupported-cell"),
  );
  await assert.rejects(
    Templates.fillWorkbookTemplate(source, { kind: "registerCore", cells: { L5: "Approved" } }),
    templateError("unsupported-cell"),
  );
  await assert.rejects(
    Templates.fillWorkbookTemplate(source, { kind: "registerCore", cells: { U5: "Complete" } }),
    templateError("unsupported-cell"),
  );
  await assert.rejects(
    Templates.fillWorkbookTemplate(source, { kind: "registerCore", cells: { O5: "Unknown" } }),
    templateError("invalid-value"),
  );
  await assert.rejects(
    Templates.fillWorkbookTemplate(makeWorkbook({ occupiedRegisterName: true }), {
      kind: "registerCore",
      cells: { B5: "Replacement" },
    }),
    templateError("cell-not-blank"),
  );
  const explicitlyAuthorised = await Templates.fillWorkbookTemplate(
    makeWorkbook({ occupiedRegisterName: true }),
    { kind: "registerCore", cells: { B5: "Replacement" }, overwriteExisting: true },
  );
  assert.match(extract(explicitlyAuthorised, "xl/worksheets/register.xml"), /Replacement/);
});

test("05 Register Core transforms the actual source row while all other sheets remain unchanged", async (context) => {
  const sourceRoot = path.resolve(__dirname, "../../.local/conversation-workspace/files");
  const sourceFile = findFile(
    sourceRoot,
    (name) => name.startsWith("05_36_") && name.endsWith("_Integrated_Register_Gate_Working_Draft.xlsx"),
  );
  if (!sourceFile) {
    context.skip("The locally provided source workbook is unavailable in this checkout.");
    return;
  }

  const original = new Uint8Array(fs.readFileSync(sourceFile));
  const registerPath = workbookSheetPath(original, "Register Core");
  assert.ok(registerPath, "The source workbook has a Register Core worksheet.");
  const result = await Templates.fillWorkbookTemplate(original, {
    kind: "registerCore",
    cells: {
      A5: "Synthetic verified AIR-ID",
      B5: "Synthetic pilot system",
      D5: "Synthetic service",
      E5: "Synthetic owner",
      F5: "Synthetic supplier",
      G5: "Internally developed",
      H5: "Agentic AI",
      I5: "Idea",
      K5: "Explicit synthetic date",
      N5: "Human approves each action",
      O5: "Yes",
    },
  });

  const originalRegister = cellsByAddress(extract(original, registerPath));
  const filledRegister = cellsByAddress(extract(result, registerPath));
  for (const address of [
    "A5", "B5", "D5", "E5", "F5", "G5", "H5", "I5", "K5", "N5", "O5",
  ]) {
    assert.notEqual(filledRegister.get(address), originalRegister.get(address));
  }
  for (const address of ["C5", "J5", "L5", "M5", "P5", "Q5", "R5", "S5", "T5", "U5", "V5", "W5", "X5", "Y5"]) {
    assert.equal(filledRegister.get(address), originalRegister.get(address), `${address} stays untouched`);
  }
  for (const sheetPath of zipFileNames(original).filter(
    (name) => name.startsWith("xl/worksheets/") && name.endsWith(".xml") && name !== registerPath,
  )) {
    assert.equal(
      extract(result, sheetPath),
      extract(original, sheetPath),
      `${sheetPath} stays unchanged`,
    );
  }
});

test("45 Capability Vector writes only a supplied AIR-ID and explicitly selected Yes flags", async () => {
  const source = makeWorkbook();
  const result = await Templates.fillWorkbookTemplate(source, {
    kind: "agentVector",
    cells: { A5: "Existing AIR-ID supplied by caller", B5: "Yes", O5: "Yes" },
  });
  const vector = extract(result, "xl/worksheets/vector.xml");
  assert.match(vector, /<c r="A5" s="4" t="inlineStr"><is><t xml:space="preserve">Existing AIR-ID supplied by caller<\/t><\/is><\/c>/);
  assert.match(vector, /<c r="B5" s="4" t="inlineStr"><is><t xml:space="preserve">Yes<\/t><\/is><\/c>/);
  assert.match(vector, /<c r="O5" s="4" t="inlineStr"><is><t xml:space="preserve">Yes<\/t><\/is><\/c>/);
  assert.match(vector, /<c r="C5" s="4"\/>/);
  assert.match(vector, /<c r="T5" s="4"\/>/);

  const withoutId = await Templates.fillWorkbookTemplate(source, {
    kind: "agentVector",
    cells: { D5: "Yes" },
  });
  assert.match(extract(withoutId, "xl/worksheets/vector.xml"), /<c r="A5" s="4"\/>/);
  await assert.rejects(
    Templates.fillWorkbookTemplate(source, { kind: "agentVector", cells: { C5: "No" } }),
    templateError("invalid-value"),
  );
  await assert.rejects(
    Templates.fillWorkbookTemplate(source, { kind: "agentVector", cells: { C5: "Scoped" } }),
    templateError("invalid-value"),
  );
  await assert.rejects(
    Templates.fillWorkbookTemplate(source, { kind: "agentVector", cells: { T5: "Pilot notes" } }),
    templateError("unsupported-cell"),
  );
  await assert.rejects(
    Templates.fillWorkbookTemplate(source, { kind: "agentVector", cells: { B6: "Yes" } }),
    templateError("unsupported-cell"),
  );
  await assert.rejects(
    Templates.fillWorkbookTemplate(makeWorkbook({ occupiedVectorFlag: true }), {
      kind: "agentVector",
      cells: { B5: "Yes" },
    }),
    templateError("cell-not-blank"),
  );
  const explicitlyAuthorised = await Templates.fillWorkbookTemplate(
    makeWorkbook({ occupiedVectorFlag: true }),
    { kind: "agentVector", cells: { B5: "Yes" }, overwriteExisting: true },
  );
  assert.match(extract(explicitlyAuthorised, "xl/worksheets/vector.xml"), /<c r="B5" s="4" t="inlineStr"><is><t xml:space="preserve">Yes<\/t><\/is><\/c>/);
});

test("45 Capability Vector contract fills the actual blank source row and leaves Agent Record untouched", async (context) => {
  const sourceRoot = path.resolve(__dirname, "../../.local/conversation-workspace/files");
  const sourceFile = findFile(
    sourceRoot,
    (name) => name.startsWith("45_") && name.endsWith("_Agent_Record_ASBOM_Integrated_Draft.xlsx"),
  );
  if (!sourceFile) {
    context.skip("The locally provided source workbook is unavailable in this checkout.");
    return;
  }

  const original = new Uint8Array(fs.readFileSync(sourceFile));
  const result = await Templates.fillWorkbookTemplate(original, {
    kind: "agentVector",
    cells: { A5: "Synthetic existing AIR-ID", B5: "Yes", O5: "Yes" },
  });
  const originalVector = cellsByAddress(extract(original, "xl/worksheets/sheet3.xml"));
  const filledVector = cellsByAddress(extract(result, "xl/worksheets/sheet3.xml"));
  assert.deepEqual(
    [...VECTOR_HEADERS].map((_header, index) => {
      const address = `${"ABCDEFGHIJKLMNOPQRST"[index]}4`;
      return (filledVector.get(address) || "").replace(/>\s+</g, "><");
    }),
    [...VECTOR_HEADERS].map((_header, index) => {
      const address = `${"ABCDEFGHIJKLMNOPQRST"[index]}4`;
      return (originalVector.get(address) || "").replace(/>\s+</g, "><");
    }),
  );
  assert.match(filledVector.get("A5"), /Synthetic existing AIR-ID/);
  assert.match(filledVector.get("B5"), /<t xml:space="preserve">Yes<\/t>/);
  assert.match(filledVector.get("O5"), /<t xml:space="preserve">Yes<\/t>/);
  for (const column of "CDEFGHIJKLMNPQRST") {
    assert.equal(filledVector.get(`${column}5`), originalVector.get(`${column}5`));
  }
  assert.equal(
    extract(result, "xl/worksheets/sheet2.xml"),
    extract(original, "xl/worksheets/sheet2.xml"),
    "The separate Agent Record sheet remains byte-for-byte unchanged.",
  );
});

test("Word placeholders are replaced in place and values are XML-escaped", async () => {
  const source = makeDocx(
    '<w:document xmlns:w="urn:w"><w:body><w:p><w:r><w:t>System: {{system}}</w:t></w:r></w:p><w:p><w:r><w:t>{{owner}}</w:t></w:r></w:p></w:body></w:document>',
  );
  const result = await Templates.fillWordTemplate(source, {
    fields: { system: "Synthetic <test> & review", owner: "Named $& owner" },
  });
  const document = extract(result, "word/document.xml");
  assert.match(document, /System: Synthetic &lt;test&gt; &amp; review/);
  assert.match(document, /<w:t>Named \$&amp; owner<\/w:t>/);
  assert.equal((document.match(/<w:p>/g) || []).length, 2);
});

test("Word forms without explicit editable placeholders fail without appending content", async () => {
  const source = makeDocx(
    '<w:document xmlns:w="urn:w"><w:body><w:p><w:r><w:t>Submission Details</w:t></w:r></w:p></w:body></w:document>',
  );
  await assert.rejects(
    Templates.fillWordTemplate(source, { fields: { submittedBy: "Synthetic assessor" } }),
    templateError("unsupported-word-template"),
  );

  const splitMarker = makeDocx(
    '<w:document xmlns:w="urn:w"><w:body><w:p><w:r><w:t>{{submitted</w:t></w:r><w:r><w:t>By}}</w:t></w:r></w:p></w:body></w:document>',
  );
  await assert.rejects(
    Templates.fillWordTemplate(splitMarker, { fields: { submittedBy: "Synthetic assessor" } }),
    templateError("unsupported-word-template"),
  );
});

test("actual 04 and 38 Word sources remain unsupported and unmodified", async (context) => {
  const sourceRoot = path.resolve(__dirname, "../../.local/conversation-workspace/files");
  const wordSources = [
    (name) => name.startsWith("04_") && name.endsWith("_AI_Intake_Form_Integrated_Draft.docx"),
    (name) => name.startsWith("38_") && name.endsWith("_Decision_Ready_Paper_Integrated_Draft.docx"),
  ].map((matchesName) => findFile(sourceRoot, matchesName));
  if (wordSources.some((file) => !file)) {
    context.skip("One or more locally provided Word sources are unavailable in this checkout.");
    return;
  }
  for (const sourceFile of wordSources) {
    const original = new Uint8Array(fs.readFileSync(sourceFile));
    await assert.rejects(
      Templates.fillWordTemplate(original, { fields: { pilot: "Synthetic pilot" } }),
      templateError("unsupported-word-template"),
    );
  }
});

test("unsafe ZIP paths, CRC damage, and wrong file extensions are rejected", async () => {
  const unsafe = zip([["../outside.xml", "<root/>"]]);
  await assert.rejects(
    Templates.fillWorkbookTemplate(unsafe, { kind: "agpi", cells: { B5: "x" } }),
    templateError("unsafe-path"),
  );

  const damaged = makeWorkbook();
  const eocd = damaged.length - 22;
  const directoryOffset = get32(damaged, eocd + 16);
  const centralCrcOffset = directoryOffset + 16;
  damaged[centralCrcOffset] ^= 1;
  await assert.rejects(
    Templates.fillWorkbookTemplate(damaged, { kind: "agpi", cells: { B5: "x" } }),
    templateError("crc-mismatch"),
  );

  const correctBytes = makeWorkbook();
  const wrongFile = {
    name: "not-a-workbook.docm",
    arrayBuffer: async () => correctBytes.buffer.slice(
      correctBytes.byteOffset,
      correctBytes.byteOffset + correctBytes.byteLength,
    ),
  };
  await assert.rejects(
    Templates.fillWorkbookTemplate(wrongFile, { kind: "agpi", cells: { B5: "x" } }),
    templateError("wrong-file-type"),
  );
});

test("deflate expansion is bounded even when ZIP metadata understates the output size", async () => {
  const inflated = "x".repeat(17 * 1024 * 1024);
  const bomb = zip([["xl/oversized.bin", inflated]]);
  const eocd = bomb.length - 22;
  const centralOffset = get32(bomb, eocd + 16);
  const localOffset = get32(bomb, centralOffset + 42);
  put32(bomb, centralOffset + 24, 32);
  put32(bomb, localOffset + 22, 32);
  await assert.rejects(
    Templates.fillWorkbookTemplate(bomb, { kind: "agpi", cells: { B5: "x" } }),
    templateError("zip-bomb"),
  );
});

test("existing cells can be overwritten only with explicit opt-in", async () => {
  const result = await Templates.fillWorkbookTemplate(makeWorkbook({ occupiedAgpiName: true }), {
    kind: "agpi",
    cells: { B5: "Reviewed replacement" },
    overwriteExisting: true,
  });
  assert.match(extract(result, "xl/worksheets/agpi.xml"), /Reviewed replacement/);
});