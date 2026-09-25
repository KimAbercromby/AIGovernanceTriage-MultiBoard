(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.LocalTemplates = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const LIMITS = Object.freeze({
    compressedBytes: 24 * 1024 * 1024,
    entryBytes: 16 * 1024 * 1024,
    totalBytes: 48 * 1024 * 1024,
    outputBytes: 56 * 1024 * 1024,
    entries: 12000,
    compressionRatio: 1000,
  });

  const WORKBOOKS = Object.freeze({
    agpi: {
      sheet: "AGPI Triage",
      headerRow: 9,
      headers: [
        "Governance dimension",
        "Weight",
        "Score (1–5)",
        "Weighted points",
        "Assessment consideration",
      ],
      allowed: (cell) =>
        ["B5", "B6", "B7", "C10", "C11", "C12", "C13", "C14", "C15"].includes(cell),
    },
    riskImport: {
      sheet: "Triage Import",
      headerRow: 4,
      headers: [
        "Canonical field",
        "Value",
        "Capture status",
        "Used in WCC-AIG-07",
        "Implementation note",
      ],
      allowed: (cell) => /^B(?:[5-9]|[1-5]\d|6[01])$/.test(cell),
    },
    gatePlan: {
      sheet: "Gate Plan",
      headerRow: 4,
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
      allowed: (cell) => /^[A-K](?:[5-9]|[1-9]\d|[1-4]\d{2}|50[0-4])$/.test(cell),
    },
    registerCore: {
      sheet: "Register Core",
      headerRow: 4,
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
      requiredFormulas: ["U5", "V5", "Y5"],
      allowed: (cell) => ["A5", "B5", "D5", "E5", "F5", "G5", "H5", "I5", "K5", "N5", "O5"].includes(cell),
    },
    agentVector: {
      sheet: "Capability Vector",
      headerRow: 4,
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
      // The source Capability Vector's first data row is blank. Restrict this
      // helper to that row and omit Notes and the separate Agent Record sheet.
      allowed: (cell) => /^[A-S]5$/.test(cell),
    },
  });

  const CRC_TABLE = (() => {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n += 1) {
      let value = n;
      for (let k = 0; k < 8; k += 1) {
        value = (value & 1) ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
      }
      table[n] = value >>> 0;
    }
    return table;
  })();

  class TemplateError extends Error {
    constructor(message, code) {
      super(message);
      this.name = "TemplateError";
      this.code = code;
    }
  }

  function fail(message, code) {
    throw new TemplateError(message, code);
  }

  function u16(bytes, offset) {
    return bytes[offset] | (bytes[offset + 1] << 8);
  }

  function u32(bytes, offset) {
    return (
      (bytes[offset] |
        (bytes[offset + 1] << 8) |
        (bytes[offset + 2] << 16) |
        (bytes[offset + 3] << 24)) >>>
      0
    );
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

  function crc32(bytes) {
    let crc = 0xffffffff;
    for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 255] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
  }

  function decodeUtf8(bytes, message) {
    try {
      return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch (_error) {
      fail(message || "The template contains invalid UTF-8 data.", "invalid-utf8");
    }
  }

  function encodeUtf8(value) {
    return new TextEncoder().encode(value);
  }

  function safeZipPath(name) {
    if (
      !name ||
      name.startsWith("/") ||
      name.includes("\\") ||
      name.includes("\0") ||
      /^[A-Za-z]:/.test(name) ||
      name.split("/").some((part) => part === "." || part === "..")
    ) {
      fail("The template archive contains an unsafe file path.", "unsafe-path");
    }
    return name;
  }

  function findEocd(bytes) {
    const min = Math.max(0, bytes.length - 22 - 0xffff);
    for (let offset = bytes.length - 22; offset >= min; offset -= 1) {
      if (
        u32(bytes, offset) === 0x06054b50 &&
        offset + 22 + u16(bytes, offset + 20) === bytes.length
      ) {
        return offset;
      }
    }
    fail("The selected file is not a complete supported OOXML ZIP archive.", "invalid-zip");
  }

  async function inflateRaw(bytes) {
    if (typeof DecompressionStream === "function" && typeof Blob === "function") {
      try {
        const stream = new Blob([bytes])
          .stream()
          .pipeThrough(new DecompressionStream("deflate-raw"));
        const reader = stream.getReader();
        const chunks = [];
        let size = 0;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.length;
          if (size > LIMITS.entryBytes) {
            await reader.cancel();
            fail("A template entry expands beyond the 16 MB safety limit.", "zip-bomb");
          }
          chunks.push(value);
        }
        const output = new Uint8Array(size);
        let offset = 0;
        for (const chunk of chunks) {
          output.set(chunk, offset);
          offset += chunk.length;
        }
        return output;
      } catch (_error) {
        if (_error instanceof TemplateError) throw _error;
        fail(
          "This browser cannot safely decompress this template. Try a current browser or an uncompressed source copy.",
          "decompression-unavailable",
        );
      }
    }
    if (typeof require === "function") {
      try {
        return new Uint8Array(
          require("node:zlib").inflateRawSync(bytes, { maxOutputLength: LIMITS.entryBytes }),
        );
      } catch (_error) {
        if (_error && _error.code === "ERR_BUFFER_TOO_LARGE") {
          fail("A template entry expands beyond the 16 MB safety limit.", "zip-bomb");
        }
        fail("The template contains an invalid compressed entry.", "invalid-deflate");
      }
    }
    fail(
      "This browser cannot safely decompress this template. Try a current browser.",
      "decompression-unavailable",
    );
  }

  async function readZip(input) {
    if (!(input instanceof Uint8Array)) {
      fail("The template must be supplied as a File, ArrayBuffer, or Uint8Array.", "invalid-input");
    }
    const bytes = input;
    if (bytes.length > LIMITS.compressedBytes) {
      fail("The selected template exceeds the 24 MB compressed-file limit.", "file-too-large");
    }
    if (bytes.length < 22) fail("The selected file is not a supported ZIP archive.", "invalid-zip");

    const eocd = findEocd(bytes);
    const disk = u16(bytes, eocd + 4);
    const centralDisk = u16(bytes, eocd + 6);
    const diskEntries = u16(bytes, eocd + 8);
    const count = u16(bytes, eocd + 10);
    const centralBytes = u32(bytes, eocd + 12);
    const centralOffset = u32(bytes, eocd + 16);
    if (
      disk ||
      centralDisk ||
      diskEntries !== count ||
      count === 0xffff ||
      centralBytes === 0xffffffff ||
      centralOffset === 0xffffffff
    ) {
      fail("Multi-disk and ZIP64 templates are not supported.", "unsupported-zip");
    }
    if (count > LIMITS.entries || centralOffset + centralBytes !== eocd) {
      fail("The template has an invalid or oversized ZIP directory.", "invalid-zip");
    }

    const decoder = new TextDecoder("utf-8", { fatal: true });
    const entries = [];
    const names = new Set();
    let cursor = centralOffset;
    let totalUncompressed = 0;
    let actualUncompressed = 0;

    for (let index = 0; index < count; index += 1) {
      if (cursor + 46 > eocd || u32(bytes, cursor) !== 0x02014b50) {
        fail("The template ZIP directory is malformed.", "invalid-zip");
      }
      const flags = u16(bytes, cursor + 8);
      const method = u16(bytes, cursor + 10);
      const expectedCrc = u32(bytes, cursor + 16);
      const compressedSize = u32(bytes, cursor + 20);
      const uncompressedSize = u32(bytes, cursor + 24);
      const nameLength = u16(bytes, cursor + 28);
      const extraLength = u16(bytes, cursor + 30);
      const commentLength = u16(bytes, cursor + 32);
      const diskStart = u16(bytes, cursor + 34);
      const externalAttributes = u32(bytes, cursor + 38);
      const localOffset = u32(bytes, cursor + 42);
      const end = cursor + 46 + nameLength + extraLength + commentLength;
      if (end > eocd || diskStart !== 0) {
        fail("The template ZIP directory contains an invalid entry.", "invalid-zip");
      }
      if (flags & (0x0001 | 0x0020 | 0x0040 | 0x2000)) {
        fail("Encrypted or patched ZIP entries are not supported.", "unsupported-zip");
      }
      if (method !== 0 && method !== 8) {
        fail("The template uses an unsupported ZIP compression method.", "unsupported-zip");
      }
      if (
        compressedSize === 0xffffffff ||
        uncompressedSize === 0xffffffff ||
        localOffset === 0xffffffff
      ) {
        fail("ZIP64 entries are not supported.", "unsupported-zip");
      }

      let name;
      try {
        name = safeZipPath(decoder.decode(bytes.subarray(cursor + 46, cursor + 46 + nameLength)));
      } catch (error) {
        if (error instanceof TemplateError) throw error;
        fail("The template contains an invalid UTF-8 ZIP path.", "invalid-utf8");
      }
      const nameKey = name.toLowerCase();
      if (names.has(nameKey)) fail("The template contains duplicate ZIP paths.", "duplicate-path");
      names.add(nameKey);
      if (/^_xmlsignatures\//i.test(name)) {
        fail("Digitally signed Office templates cannot be transformed without invalidating their signatures.", "signed-template");
      }

      const unixMode = externalAttributes >>> 16;
      if ((unixMode & 0xf000) === 0xa000) {
        fail("Symbolic links are not supported in templates.", "unsupported-zip");
      }
      if (uncompressedSize > LIMITS.entryBytes) {
        fail("A template entry exceeds the 16 MB expanded-file limit.", "file-too-large");
      }
      totalUncompressed += uncompressedSize;
      if (totalUncompressed > LIMITS.totalBytes) {
        fail("The template exceeds the 48 MB expanded-file limit.", "file-too-large");
      }
      if (
        uncompressedSize > 0 &&
        uncompressedSize / Math.max(compressedSize, 1) > LIMITS.compressionRatio
      ) {
        fail("The template exceeds the safe ZIP expansion-ratio limit.", "zip-bomb");
      }

      if (localOffset + 30 > centralOffset || u32(bytes, localOffset) !== 0x04034b50) {
        fail("The template has an invalid ZIP local-file header.", "invalid-zip");
      }
      const localFlags = u16(bytes, localOffset + 6);
      const localMethod = u16(bytes, localOffset + 8);
      const localNameLength = u16(bytes, localOffset + 26);
      const localExtraLength = u16(bytes, localOffset + 28);
      const localDataStart = localOffset + 30 + localNameLength + localExtraLength;
      const localDataEnd = localDataStart + compressedSize;
      if (
        localFlags !== flags ||
        localMethod !== method ||
        localDataEnd > centralOffset ||
        localNameLength !== nameLength ||
        decoder.decode(bytes.subarray(localOffset + 30, localOffset + 30 + localNameLength)) !== name
      ) {
        fail("The template's ZIP local and central entries do not match.", "invalid-zip");
      }

      const compressed = bytes.subarray(localDataStart, localDataEnd);
      const contents =
        method === 0 ? new Uint8Array(compressed) : await inflateRaw(compressed);
      if (contents.length !== uncompressedSize || crc32(contents) !== expectedCrc) {
        fail("A template entry failed its size or CRC integrity check.", "crc-mismatch");
      }
      actualUncompressed += contents.length;
      if (actualUncompressed > LIMITS.totalBytes) {
        fail("The template exceeds the 48 MB expanded-file limit.", "file-too-large");
      }
      entries.push({ name, bytes: contents });
      cursor = end;
    }
    if (cursor !== eocd) fail("The ZIP directory length does not match its entries.", "invalid-zip");
    return entries;
  }

  function createZip(entries) {
    const localParts = [];
    const centralParts = [];
    let localOffset = 0;
    let totalSize = 22;

    for (const entry of entries) {
      const name = encodeUtf8(entry.name);
      const data = entry.bytes;
      if (name.length > 0xffff || data.length > 0xffffffff) {
        fail("A transformed template entry is too large.", "file-too-large");
      }
      const checksum = crc32(data);
      const local = new Uint8Array(30 + name.length + data.length);
      put32(local, 0, 0x04034b50);
      put16(local, 4, 20);
      put16(local, 6, 0x0800);
      put16(local, 8, 0);
      put16(local, 10, 0);
      put16(local, 12, 0x0021);
      put32(local, 14, checksum);
      put32(local, 18, data.length);
      put32(local, 22, data.length);
      put16(local, 26, name.length);
      put16(local, 28, 0);
      local.set(name, 30);
      local.set(data, 30 + name.length);
      localParts.push(local);

      const central = new Uint8Array(46 + name.length);
      put32(central, 0, 0x02014b50);
      put16(central, 4, 20);
      put16(central, 6, 20);
      put16(central, 8, 0x0800);
      put16(central, 10, 0);
      put16(central, 12, 0);
      put16(central, 14, 0x0021);
      put32(central, 16, checksum);
      put32(central, 20, data.length);
      put32(central, 24, data.length);
      put16(central, 28, name.length);
      put16(central, 30, 0);
      put16(central, 32, 0);
      put16(central, 34, 0);
      put16(central, 36, 0);
      put32(central, 38, entry.name.endsWith("/") ? 0x10 : 0);
      put32(central, 42, localOffset);
      central.set(name, 46);
      centralParts.push(central);
      localOffset += local.length;
      totalSize += local.length + central.length;
    }
    if (
      entries.length > 0xffff ||
      localOffset > 0xffffffff ||
      totalSize > LIMITS.outputBytes
    ) {
      fail("The transformed template exceeds the safe output limit.", "file-too-large");
    }

    const directorySize = centralParts.reduce((sum, part) => sum + part.length, 0);
    const end = new Uint8Array(22);
    put32(end, 0, 0x06054b50);
    put16(end, 4, 0);
    put16(end, 6, 0);
    put16(end, 8, entries.length);
    put16(end, 10, entries.length);
    put32(end, 12, directorySize);
    put32(end, 16, localOffset);
    put16(end, 20, 0);

    const result = new Uint8Array(totalSize);
    let offset = 0;
    for (const part of localParts) {
      result.set(part, offset);
      offset += part.length;
    }
    for (const part of centralParts) {
      result.set(part, offset);
      offset += part.length;
    }
    result.set(end, offset);
    return result;
  }

  function decodeXmlText(value) {
    return String(value)
      .replace(/&#x([0-9a-f]+);/gi, (_match, code) => String.fromCodePoint(parseInt(code, 16)))
      .replace(/&#(\d+);/g, (_match, code) => String.fromCodePoint(Number(code)))
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&amp;/g, "&");
  }

  function escapeXmlText(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  function xmlAttribute(xml, name) {
    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = new RegExp(`(?:^|\\s)${escapedName}=(?:"([^"]*)"|'([^']*)')`).exec(xml);
    return match ? decodeXmlText(match[1] == null ? match[2] : match[1]) : null;
  }

  function xmlCellMap(xml) {
    const cells = new Map();
    const regex = /<(?:\w+:)?c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/(?:\w+:)?c\s*>)/g;
    for (const match of xml.matchAll(regex)) {
      const address = xmlAttribute(match[1], "r");
      if (address) {
        const key = address.toUpperCase();
        if (cells.has(key)) fail("The workbook contains a duplicate cell address.", "invalid-workbook");
        cells.set(key, { attributes: match[1], body: match[2] || "", full: match[0] });
      }
    }
    return cells;
  }

  function cellText(cell, sharedStrings) {
    if (!cell) return "";
    const type = xmlAttribute(cell.attributes, "t");
    if (type === "inlineStr") {
      return [...cell.body.matchAll(/<(?:\w+:)?t\b[^>]*>([\s\S]*?)<\/(?:\w+:)?t\s*>/g)]
        .map((match) => decodeXmlText(match[1]))
        .join("");
    }
    const value = /<(?:\w+:)?v\b[^>]*>([\s\S]*?)<\/(?:\w+:)?v\s*>/.exec(cell.body);
    if (!value) return "";
    const text = decodeXmlText(value[1]);
    return type === "s" ? (sharedStrings[Number(text)] || "") : text;
  }

  function parseSharedStrings(xml) {
    if (!xml) return [];
    return [...xml.matchAll(/<(?:\w+:)?si\b[^>]*>([\s\S]*?)<\/(?:\w+:)?si\s*>/g)].map((si) =>
      [...si[1].matchAll(/<(?:\w+:)?t\b[^>]*>([\s\S]*?)<\/(?:\w+:)?t\s*>/g)]
        .map((text) => decodeXmlText(text[1]))
        .join(""),
    );
  }

  function safeXml(xml, name) {
    if (!xml || xml.length > LIMITS.entryBytes || /<!DOCTYPE|<!ENTITY/i.test(xml)) {
      fail(`The template contains an invalid or oversized ${name} XML part.`, "invalid-xml");
    }
    return xml;
  }

  function resolvePart(base, target) {
    if (!target || /^[a-z]+:/i.test(target) || target.startsWith("//") || target.includes("\\")) {
      fail("The workbook contains an unsafe relationship target.", "unsafe-path");
    }
    const joined = target.startsWith("/") ? target.slice(1) : `${base}/${target}`;
    const parts = [];
    for (const part of joined.split("/")) {
      if (part === "" || part === ".") continue;
      if (part === "..") {
        if (!parts.length) fail("The workbook relationship escapes the archive root.", "unsafe-path");
        parts.pop();
      } else {
        parts.push(part);
      }
    }
    return safeZipPath(parts.join("/"));
  }

  function indexOfEntry(entries, name) {
    return entries.findIndex((entry) => entry.name === name);
  }

  function getEntryText(entries, name) {
    const index = indexOfEntry(entries, name);
    if (index < 0) fail(`The selected workbook is missing ${name}.`, "unsupported-template");
    return decodeUtf8(entries[index].bytes, `The ${name} part is not valid UTF-8 XML.`);
  }

  function workbookSheetParts(entries) {
    const workbook = safeXml(getEntryText(entries, "xl/workbook.xml"), "workbook");
    const rels = safeXml(getEntryText(entries, "xl/_rels/workbook.xml.rels"), "workbook relationship");
    const relationships = new Map();
    for (const match of rels.matchAll(/<(?:\w+:)?Relationship\b([^>]*)\/?>/g)) {
      const id = xmlAttribute(match[1], "Id");
      if (id) {
        relationships.set(id, {
          target: xmlAttribute(match[1], "Target"),
          mode: xmlAttribute(match[1], "TargetMode"),
        });
      }
    }

    const sheets = new Map();
    for (const match of workbook.matchAll(/<(?:\w+:)?sheet\b([^>]*)\/?>/g)) {
      const name = xmlAttribute(match[1], "name");
      const relationshipId =
        xmlAttribute(match[1], "r:id") || xmlAttribute(match[1], "id");
      const relation = relationships.get(relationshipId);
      if (name && relation && relation.mode !== "External") {
        const part = resolvePart("xl", relation.target);
        if (sheets.has(name)) fail("The workbook contains duplicate sheet names.", "invalid-workbook");
        sheets.set(name, part);
      }
    }
    return sheets;
  }

  function verifyHeaders(sheetXml, sharedStrings, row, expected) {
    const cells = xmlCellMap(sheetXml);
    const actual = expected.map((_header, index) =>
      cellText(cells.get(`${columnName(index + 1)}${row}`), sharedStrings),
    );
    if (actual.some((value, index) => value !== expected[index])) {
      fail(
        "The selected workbook does not match the verified source-form headers. No values were written.",
        "unsupported-template",
      );
    }
  }

  function verifyRequiredFormulas(sheetXml, addresses) {
    const cells = xmlCellMap(sheetXml);
    for (const address of addresses || []) {
      const cell = cells.get(address);
      if (!cell || !/<(?:\w+:)?f\b/.test(cell.body)) {
        fail(
          `The selected workbook does not contain the verified formula contract at ${address}. No values were written.`,
          "unsupported-template",
        );
      }
    }
  }

  function columnName(number) {
    let result = "";
    let value = number;
    while (value > 0) {
      value -= 1;
      result = String.fromCharCode(65 + (value % 26)) + result;
      value = Math.floor(value / 26);
    }
    return result;
  }

  function validateValue(kind, address, value) {
    if (value == null || value === "" || (typeof value === "string" && value.trim() === "")) {
      fail(`A value for ${address} must be explicit and non-empty.`, "invalid-value");
    }
    if (!["string", "number", "boolean"].includes(typeof value)) {
      fail(`The value for ${address} must be an explicit string, number, or boolean.`, "invalid-value");
    }
    if (typeof value === "number" && !Number.isFinite(value)) {
      fail(`The value for ${address} must be finite.`, "invalid-value");
    }
    if (kind === "agpi" && /^C1[0-5]$/.test(address)) {
      if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > 5) {
        fail(`AGPI score ${address} must be an explicit integer from 1 to 5.`, "invalid-value");
      }
    }
    if (kind === "riskImport") {
      const row = Number(address.slice(1));
      if (row >= 22 && row <= 28 && (typeof value !== "number" || value < 1 || value > 5)) {
        fail(`${address} must be a numeric score from 1 to 5.`, "invalid-value");
      }
      if ([34, 35, 36, 37, 38, 39, 40, 55, 56, 57].includes(row) && !["Yes", "No"].includes(value)) {
        fail(`${address} must be the explicit text Yes or No.`, "invalid-value");
      }
      if ([20, 21].includes(row)) {
        fail(
          `${address} is an authorised governance-priority field. Local triage cannot populate or imply an authorised uplift.`,
          "authority-boundary",
        );
      }
    }
    if (kind === "agentVector") {
      if (address === "A5") {
        if (typeof value !== "string") {
          fail("Capability Vector AIR-ID must be an explicitly supplied text value.", "invalid-value");
        }
      } else if (value !== "Yes") {
        fail(
          `Capability Vector ${address} may only be set to Yes when explicitly selected. Unknown capabilities stay blank; No and Scoped are not inferred.`,
          "invalid-value",
        );
      }
    }
    if (kind === "registerCore") {
      if (address === "A5" && typeof value !== "string") {
        fail("Register Core AIR-ID must be explicitly supplied as text.", "invalid-value");
      }
      if (address === "O5" && !["Yes", "No"].includes(value)) {
        fail("Register Core Is Agent? may only be Yes or No when explicitly known.", "invalid-value");
      }
    }
    return value;
  }

  function updateCell(xml, address, value, overwriteExisting, sharedStrings) {
    const cells = xmlCellMap(xml);
    const cell = cells.get(address);
    if (!cell) fail(`Target cell ${address} is absent; cells are never inserted implicitly.`, "missing-cell");
    if (/<(?:\w+:)?f\b/.test(cell.body)) {
      fail(`Target cell ${address} contains a formula and is protected.`, "formula-protected");
    }
    const type = xmlAttribute(cell.attributes, "t");
    const current = cellText(cell, sharedStrings);
    if (current !== "" && !overwriteExisting) {
      fail(
        `Target cell ${address} is already populated. Review the source template or explicitly permit overwriting.`,
        "cell-not-blank",
      );
    }
    const remainder = cell.body
      .replace(/<(?:\w+:)?v\b[^>]*>[\s\S]*?<\/(?:\w+:)?v\s*>/g, "")
      .replace(/<(?:\w+:)?is\b[^>]*>[\s\S]*?<\/(?:\w+:)?is\s*>/g, "")
      .trim();
    if (remainder) {
      fail(`Target cell ${address} contains unsupported cell markup.`, "unsupported-cell");
    }

    let cellType;
    let newValue;
    if (typeof value === "string") {
      cellType = "inlineStr";
      newValue = `<is><t xml:space="preserve">${escapeXmlText(value)}</t></is>`;
    } else if (typeof value === "boolean") {
      cellType = "b";
      newValue = `<v>${value ? 1 : 0}</v>`;
    } else {
      cellType = "n";
      newValue = `<v>${String(value)}</v>`;
    }
    let attributes = cell.attributes.replace(/\s+t=(?:"[^"]*"|'[^']*')/g, "");
    if (cellType !== "n") attributes += ` t="${cellType}"`;
    else if (type === "n") attributes += ' t="n"';
    const replacement = `<c${attributes}>${newValue}</c>`;
    return xml.replace(cell.full, replacement);
  }

  async function sourceBytes(source, requiredExtension) {
    let bytes;
    if (source && typeof source.arrayBuffer === "function") {
      if (typeof source.name === "string" && !source.name.toLowerCase().endsWith(requiredExtension)) {
        fail(`Choose a ${requiredExtension} template.`, "wrong-file-type");
      }
      bytes = new Uint8Array(await source.arrayBuffer());
    } else if (source instanceof ArrayBuffer) {
      bytes = new Uint8Array(source);
    } else if (ArrayBuffer.isView(source)) {
      bytes = new Uint8Array(source.buffer, source.byteOffset, source.byteLength);
    } else {
      fail("Select the source template file first.", "invalid-input");
    }
    if (bytes.length > LIMITS.compressedBytes) {
      fail("The selected template exceeds the 24 MB compressed-file limit.", "file-too-large");
    }
    return bytes;
  }

  async function fillWorkbookTemplate(source, options) {
    const kind = options && options.kind;
    const contract = WORKBOOKS[kind];
    if (!contract) {
      fail(
        "Supported workbook targets are agpi, riskImport, gatePlan, agentVector, or registerCore.",
        "unsupported-template",
      );
    }
    if (!options || !options.cells || typeof options.cells !== "object" || Array.isArray(options.cells)) {
      fail("Supply explicit cell-coordinate mappings; values are never inferred.", "invalid-mapping");
    }
    const pairs = Object.entries(options.cells);
    if (!pairs.length) fail("Supply at least one explicit workbook cell value.", "invalid-mapping");
    for (const [address, value] of pairs) {
      const canonical = address.toUpperCase();
      if (!/^[A-Z]{1,3}[1-9]\d{0,4}$/.test(canonical) || !contract.allowed(canonical)) {
        fail(
          `Cell ${address} is outside the verified editable contract for this source form.`,
          "unsupported-cell",
        );
      }
      validateValue(kind, canonical, value);
    }

    const entries = await readZip(await sourceBytes(source, ".xlsx"));
    if (
      !entries.some((entry) => entry.name === "[Content_Types].xml") ||
      !entries.some((entry) => entry.name === "xl/workbook.xml")
    ) {
      fail("The selected .xlsx file is not a supported workbook template.", "unsupported-template");
    }
    const sheets = workbookSheetParts(entries);
    const sheetPath = sheets.get(contract.sheet);
    if (!sheetPath) {
      fail(
        `This workbook does not contain the verified ${contract.sheet} form sheet.`,
        "unsupported-template",
      );
    }
    const sheetIndex = indexOfEntry(entries, sheetPath);
    const sharedIndex = indexOfEntry(entries, "xl/sharedStrings.xml");
    const sharedStrings =
      sharedIndex < 0
        ? []
        : parseSharedStrings(decodeUtf8(entries[sharedIndex].bytes, "Workbook shared strings are invalid."));
    let xml = safeXml(decodeUtf8(entries[sheetIndex].bytes, "The worksheet XML is invalid."), "worksheet");
    verifyHeaders(xml, sharedStrings, contract.headerRow, contract.headers);
    verifyRequiredFormulas(xml, contract.requiredFormulas);
    for (const [address, value] of pairs) {
      xml = updateCell(
        xml,
        address.toUpperCase(),
        value,
        options.overwriteExisting === true,
        sharedStrings,
      );
    }
    entries[sheetIndex] = { ...entries[sheetIndex], bytes: encodeUtf8(xml) };
    return createZip(entries);
  }

  function validateDocx(entries) {
    if (
      !entries.some((entry) => entry.name === "[Content_Types].xml") ||
      !entries.some((entry) => entry.name === "word/document.xml")
    ) {
      fail("The selected .docx file is not a supported Word template.", "unsupported-template");
    }
  }

  async function fillWordTemplate(source, options) {
    if (!options || !options.fields || typeof options.fields !== "object" || Array.isArray(options.fields)) {
      fail("Supply explicit Word placeholder mappings; content is never inferred.", "invalid-mapping");
    }
    const pairs = Object.entries(options.fields);
    if (!pairs.length) fail("Supply at least one explicit Word placeholder value.", "invalid-mapping");
    for (const [key, value] of pairs) {
      if (!/^[A-Za-z][A-Za-z0-9_.-]{0,99}$/.test(key)) {
        fail(`Word placeholder key ${key} is invalid.`, "invalid-mapping");
      }
      if (typeof value !== "string" || value.length === 0) {
        fail(`Word placeholder ${key} must have an explicit non-empty text value.`, "invalid-value");
      }
    }

    const entries = await readZip(await sourceBytes(source, ".docx"));
    validateDocx(entries);
    const editableParts = entries.filter((entry) =>
      /^word\/(?:document|header\d*|footer\d*)\.xml$/.test(entry.name),
    );
    const replacementCounts = new Map(pairs.map(([key]) => [key, 0]));
    const updatedParts = new Map();
    for (const entry of editableParts) {
      let xml = safeXml(decodeUtf8(entry.bytes, `${entry.name} is invalid XML.`), "Word document");
      for (const [key, value] of pairs) {
        const marker = `{{${key}}}`;
        xml = xml.replace(
          /<((?:\w+:)?t)\b([^>]*)>([\s\S]*?)<\/(?:\w+:)?t\s*>/g,
          (whole, tag, attributes, text) => {
            const decoded = decodeXmlText(text);
            if (decoded.includes(marker)) {
              replacementCounts.set(
                key,
                replacementCounts.get(key) + decoded.split(marker).length - 1,
              );
              const preserveSpace =
                /^\s|\s$|\s{2,}/.test(value) && !/\bxml:space=/.test(attributes);
              const updatedAttributes = preserveSpace
                ? `${attributes} xml:space="preserve"`
                : attributes;
              return `<${tag}${updatedAttributes}>${escapeXmlText(decoded.split(marker).join(value))}</${tag}>`;
            }
            return whole;
          },
        );
      }
      updatedParts.set(entry.name, encodeUtf8(xml));
    }
    for (const [key] of pairs) {
      if (replacementCounts.get(key) === 0) {
        fail(
          `This Word document has no supported editable {{${key}}} field. No content was appended or changed; use a review handoff instead.`,
          "unsupported-word-template",
        );
      }
    }
    return createZip(
      entries.map((entry) =>
        updatedParts.has(entry.name) ? { ...entry, bytes: updatedParts.get(entry.name) } : entry,
      ),
    );
  }

  return Object.freeze({
    fillWorkbookTemplate,
    fillWordTemplate,
    TemplateError,
    LIMITS,
  });
});