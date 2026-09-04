#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const packageRoot = path.resolve(__dirname, "..");
const builtInLogoCache = new Map();
const builtInSchoolLogoCache = new Map();

let inlineLogoContext = {
  mode: "latex",
  input: "",
  packageRoot,
  custom: {}
};

function readBuiltInLogos(packageDir = packageRoot) {
  if (builtInLogoCache.has(packageDir)) return builtInLogoCache.get(packageDir);
  const manifest = path.join(packageDir, "src", "logos", "manifest.json");
  const logos = JSON.parse(fs.readFileSync(manifest, "utf8"));
  builtInLogoCache.set(packageDir, logos);
  return logos;
}

function readBuiltInSchoolLogos(packageDir = packageRoot) {
  if (builtInSchoolLogoCache.has(packageDir)) return builtInSchoolLogoCache.get(packageDir);
  const manifest = path.join(packageDir, "src", "school-logos", "manifest.json");
  const logos = JSON.parse(fs.readFileSync(manifest, "utf8"));
  builtInSchoolLogoCache.set(packageDir, logos);
  return logos;
}

function parseSchoolLogoValue(value) {
  const raw = String(value || "").trim();
  const tag = raw.match(/^<school-logo(?:\s+src=(?:"([^"]+)"|'([^']+)'))?\s*>([^<]+)<\/school-logo>$/i);
  return tag
    ? { source: tag[1] || tag[2] || "", key: tag[3].trim() }
    : { source: "", key: raw };
}

function resolveSchoolLogo(value, options = {}) {
  const parsed = parseSchoolLogoValue(value);
  if (!parsed.key && !parsed.source) return { file: "", label: "" };

  const packageDir = options.packageRoot || packageRoot;
  const baseDir = path.dirname(options.input || options.cwd || process.cwd());
  const normalizedKey = normalizeLogoKey(parsed.key);
  const custom = options.custom && typeof options.custom === "object" ? options.custom : {};
  const builtIn = readBuiltInSchoolLogos(packageDir).find((item) => item.id === normalizedKey);
  let file = "";
  let label = parsed.key || "School logo";

  if (parsed.source) {
    file = path.resolve(baseDir, parsed.source);
  } else if (builtIn) {
    file = path.join(packageDir, "src", "school-logos", builtIn.file);
    label = builtIn.label;
  } else if (custom[normalizedKey]) {
    file = path.resolve(baseDir, String(custom[normalizedKey]));
  } else {
    file = path.resolve(baseDir, parsed.key);
  }

  if (!fs.existsSync(file)) throw new Error(`School logo file not found: ${file}`);
  if (!/\.(png|jpe?g)$/i.test(file)) {
    throw new Error(`School logos must use PNG or JPG: ${file}`);
  }
  return { file, label };
}

function setInlineLogoContext(options = {}) {
  inlineLogoContext = {
    mode: options.mode || "latex",
    input: options.input || "",
    packageRoot: options.packageRoot || packageRoot,
    custom: Object.fromEntries(Object.entries(
      options.custom && typeof options.custom === "object" ? options.custom : {}
    ).map(([key, file]) => [normalizeLogoKey(key), file]))
  };
}

function normalizeLogoKey(value) {
  return String(value || "").trim().toLowerCase();
}

function resolveInlineLogo(key, explicitSource) {
  const normalizedKey = normalizeLogoKey(key);
  const baseDir = path.dirname(inlineLogoContext.input || process.cwd());
  let file = "";
  let label = String(key || "Logo").trim() || "Logo";

  if (explicitSource) {
    file = path.resolve(baseDir, explicitSource);
  } else {
    const builtIn = readBuiltInLogos(inlineLogoContext.packageRoot)
      .find((item) => item.id === normalizedKey);
    if (builtIn) {
      file = path.join(inlineLogoContext.packageRoot, "src", "logos", builtIn.file);
      label = builtIn.label;
    } else if (inlineLogoContext.custom[normalizedKey]) {
      file = path.resolve(baseDir, String(inlineLogoContext.custom[normalizedKey]));
    } else {
      throw new Error(`Unknown inline logo: ${key}. Use a built-in key or add logos.${normalizedKey} to omr.config.json.`);
    }
  }

  if (!fs.existsSync(file)) throw new Error(`Inline logo file not found: ${file}`);
  if (!/\.(png|jpe?g)$/i.test(file)) {
    throw new Error(`Inline logos must use PNG or JPG for consistent LaTeX and HTML output: ${file}`);
  }
  return { file, label };
}

function parseInlineLogo(value, index) {
  if (!value.slice(index).toLowerCase().startsWith("<logo")) return null;
  const match = value.slice(index).match(/^<logo(?:\s+src=(?:"([^"]+)"|'([^']+)'))?\s*>([^<]+)<\/logo>/i);
  if (!match) return null;
  return {
    length: match[0].length,
    source: match[1] || match[2] || "",
    key: match[3].trim()
  };
}

let alignTags = {
  centerOpen: "<center>", centerClose: "</center>",
  leftOpen: "<left>", leftClose: "</left>",
  rightOpen: "<right>", rightClose: "</right>"
};
function setAlignTags(opts) {
  alignTags = {
    centerOpen: opts.centerOpen || "<center>", centerClose: opts.centerClose || "</center>",
    leftOpen: opts.leftOpen || "<left>", leftClose: opts.leftClose || "</left>",
    rightOpen: opts.rightOpen || "<right>", rightClose: opts.rightClose || "</right>"
  };
}
function escRx(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function tagRx(open, close) { return new RegExp(escRx(open) + '(.*?)' + escRx(close), 'gi'); }

function parseFrontmatter(source) {
  const delimiter = source.startsWith("---\r\n") ? "\r\n" : source.startsWith("---\n") ? "\n" : null;
  if (!delimiter) {
    return [{}, source];
  }

  const prefixLen = 3 + delimiter.length; // "---" + line ending
  const endMarker = delimiter + "---";
  const end = source.indexOf(endMarker, prefixLen);
  if (end === -1) {
    throw new Error("Frontmatter is missing a closing --- line.");
  }

  const raw = source.slice(prefixLen, end).split(/\r?\n/);
  const data = {};
  let activeList = null;

  for (const line of raw) {
    if (!line.trim() || line.trim().startsWith("#")) continue;

    const listItem = line.match(/^\s*-\s+(.*)$/);
    if (listItem && activeList) {
      data[activeList].push(stripQuotes(listItem[1].trim()));
      continue;
    }

    const pair = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!pair) continue;

    const key = pair[1];
    const value = pair[2].trim();
    if (value === "") {
      data[key] = [];
      activeList = key;
    } else {
      data[key] = stripQuotes(value);
      activeList = null;
    }
  }

  return [data, source.slice(end + endMarker.length + delimiter.length).trimStart()];
}

function stripQuotes(value) {
  return value.replace(/^['"]|['"]$/g, "");
}

function parseMarkdown(markdown, options = {}) {
  const sections = [];
  let section = null;
  let entry = null;
  const dateFields = new Set((options.dateFields || ["时间", "日期", "date", "dates"]).map(normalizeFieldName));
  const tagFields = new Set((options.tagFields || ["标签", "tags"]).map(normalizeFieldName));
  const CO = options.centerOpen || alignTags.centerOpen;
  const CC = options.centerClose || alignTags.centerClose;
  const LO = options.leftOpen || alignTags.leftOpen;
  const LC = options.leftClose || alignTags.leftClose;
  const RO = options.rightOpen || alignTags.rightOpen;
  const RC = options.rightClose || alignTags.rightClose;
  const rxCT = tagRx(CO, CC);
  const rxLT = tagRx(LO, LC);
  const rxRT = tagRx(RO, RC);

  function ensureSection() {
    if (!section) {
      section = { title: "其他", blocks: [] };
      sections.push(section);
    }
    return section;
  }

  for (const rawLine of markdown.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line === "***") {
      ensureSection().blocks.push({ type: "divider" });
      entry = null;
      continue;
    }

    if (line.startsWith("# ") && !line.startsWith("## ")) {
      ensureSection().blocks.push({ type: "heading", level: 1, text: line.slice(2).trim() });
      entry = null;
      continue;
    }

    if (line.startsWith("#### ")) {
      ensureSection().blocks.push({ type: "heading", level: 4, text: line.slice(5).trim() });
      continue;
    }

    if (line.startsWith("## ")) {
      section = { title: line.slice(3).trim(), blocks: [] };
      sections.push(section);
      entry = null;
      continue;
    }

    if (line.startsWith("### ")) {
      const parsedHeading = parseEntryHeading(line.slice(4).trim(), { CO, CC, LO, LC, RO, RC });
      entry = {
        type: "entry",
        title: parsedHeading.title,
        date: parsedHeading.date,
        tags: parsedHeading.tags,
        center: parsedHeading.center,
        left: parsedHeading.left,
        color: parsedHeading.color,
        fields: [],
        bullets: [],
        paragraphs: []
      };
      ensureSection().blocks.push(entry);
      continue;
    }

    const bullet = rawLine.match(/^(\s*)[-*]\s+(.*)$/);
    if (bullet) {
      const item = { type: "bullet", level: bulletLevel(bullet[1]), text: bullet[2].trim() };
      if (!entry) {
        ensureSection().blocks.push(item);
      } else {
        entry.bullets.push(item);
      }
      continue;
    }

    // Full-line alignment wrapper → treat as paragraph
    let wrappedLine = null;
    const cFullRx = new RegExp('^' + escRx(CO) + '(.*)' + escRx(CC) + '$', 'i');
    const lFullRx = new RegExp('^' + escRx(LO) + '(.*)' + escRx(LC) + '$', 'i');
    const rFullRx = new RegExp('^' + escRx(RO) + '(.*)' + escRx(RC) + '$', 'i');
    const cMatch = line.match(cFullRx);
    const lMatch = line.match(lFullRx);
    const rMatch = line.match(rFullRx);
    if (cMatch) wrappedLine = CO + cMatch[1] + CC;
    else if (lMatch) wrappedLine = LO + lMatch[1] + LC;
    else if (rMatch) wrappedLine = RO + rMatch[1] + RC;

    if (wrappedLine) {
      if (entry) entry.paragraphs.push(wrappedLine);
      else ensureSection().blocks.push({ type: "paragraph", text: wrappedLine });
      continue;
    }

    const field = parseFieldLine(line);
    if (field && entry) {
      const label = field.label;
      const key = normalizeFieldName(label);
      const value = field.value;
      if (dateFields.has(key)) entry.date = value;
      else if (tagFields.has(key)) entry.tags = splitList(value);
      else entry.fields.push({ label, value });
      continue;
    }

    if (entry) entry.paragraphs.push(line);
    else ensureSection().blocks.push({ type: "paragraph", text: line });
  }

  return sections;
}

function parseEntryHeading(value, tagOpts = {}) {
  const CO = tagOpts.CO || alignTags.centerOpen;
  const CC = tagOpts.CC || alignTags.centerClose;
  const LO = tagOpts.LO || alignTags.leftOpen;
  const LC = tagOpts.LC || alignTags.leftClose;
  const RO = tagOpts.RO || alignTags.rightOpen;
  const RC = tagOpts.RC || alignTags.rightClose;
  const rxCT = tagRx(CO, CC);
  const rxLT = tagRx(LO, LC);
  const rxRT = tagRx(RO, RC);

  let title = String(value);
  let date = "";
  const tags = [];
  let center = "";
  let left = "";
  let color = null;

  // A coloured entry bar may wrap the complete heading, including <right>.
  // Keep this extraction before alignment parsing so the date remains dated.
  title = title.replace(/<color\b([^>]*)>([\s\S]*?)<\/color>/i, (_, attributes, content) => {
    const match = String(attributes).match(/\b(?:color|tone|type)\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/i);
    color = parseColorValue(match ? (match[1] || match[2] || match[3]) : "blue");
    return content;
  });

  // Extract left block
  title = title.replace(rxLT, (_, content) => {
    left = content.trim();
    return "";
  });

  // Extract center block
  title = title.replace(rxCT, (_, content) => {
    center = content.trim();
    return "";
  });

  // Process centered tags separately
  let centerTags = [];
  if (center) {
    center = center.replace(/`([^`]+)`/g, (_, content) => {
      centerTags.push(content.trim());
      return "";
    });
    center = center.replace(/\s+/g, " ").trim();
  }

  title = title.replace(rxRT, (_, content) => {
    date = content.trim();
    return "";
  });

  title = title.replace(/`([^`]+)`/g, (_, content) => {
    tags.push(content.trim());
    return "";
  });

  return {
    title: title.replace(/\s+/g, " ").trim(),
    date,
    tags,
    center: center ? { text: center, tags: centerTags } : null,
    left: left || null,
    color
  };
}

function parseColorValue(value) {
  const raw = String(value || "blue").trim().toLowerCase();
  const named = { gray: "gray", grey: "gray", pink: "pink", blue: "blue" };
  if (named[raw]) return { type: "named", value: named[raw] };
  const hex = raw.match(/^#?([0-9a-f]{6})$/i);
  if (hex) {
    const hexValue = hex[1];
    return { type: "rgb", value: [hexValue.slice(0, 2), hexValue.slice(2, 4), hexValue.slice(4, 6)].map((part) => String(parseInt(part, 16))).join(",") };
  }
  if (/^\d{1,3},\d{1,3},\d{1,3}$/.test(raw) && raw.split(",").every((part) => Number(part) <= 255)) {
    return { type: "rgb", value: raw };
  }
  throw new Error(`Unsupported color value: ${value}. Use blue, gray, pink, #RRGGBB, or R,G,B.`);
}

function normalizeFieldName(value) {
  return String(value).trim().toLowerCase();
}

function parseFieldLine(value) {
  const match = String(value).match(/^([^:：\[\]()<>*`]{1,24})[:：]\s*(.*)$/u);
  if (!match) return null;
  const label = match[1].trim();
  if (!label) return null;
  return { label, value: match[2].trim() };
}

function splitList(value) {
  return value
    .split(/[,，、|]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function bulletLevel(indent) {
  const width = String(indent || "").replace(/\t/g, "    ").length;
  if (width <= 0) return 1;
  return width >= 4 ? 3 : 2;
}

function buildBulletTree(bullets) {
  const root = [];
  const stack = [{ level: 0, children: root }];
  for (const bullet of bullets) {
    const level = Math.max(1, Math.min(3, Number(bullet.level) || 1));
    while (stack.length > 1 && stack[stack.length - 1].level >= level) stack.pop();
    const item = { text: bullet.text, children: [] };
    stack[stack.length - 1].children.push(item);
    stack.push({ level, children: item.children });
  }
  return root;
}

function escapeLatex(text) {
  const map = {
    "\\": "\\textbackslash{}",
    "&": "\\&",
    "%": "\\%",
    "$": "\\$",
    "#": "\\#",
    "_": "\\_",
    "{": "\\{",
    "}": "\\}",
    "~": "\\textasciitilde{}",
    "^": "\\textasciicircum{}"
  };
  return String(text).replace(/[\\&%$#_{}~^]/g, (char) => map[char]);
}

function texPath(filePath) {
  return path.resolve(filePath).replace(/\\/g, "/");
}

function inline(text) {
  let result = "";
  let i = 0;
  const value = String(text);

  while (i < value.length) {
    const logoTag = parseInlineLogo(value, i);
    if (logoTag) {
      const logo = resolveInlineLogo(logoTag.key, logoTag.source);
      result += `\\omrInlineLogo{${escapeLatex(texPath(logo.file))}}`;
      i += logoTag.length;
      continue;
    }

    if (value.startsWith("**", i)) {
      const end = value.indexOf("**", i + 2);
      if (end !== -1) {
        result += `\\omrStrong{${inline(value.slice(i + 2, end))}}`;
        i = end + 2;
        continue;
      }
    }

    if (value[i] === "`") {
      const end = value.indexOf("`", i + 1);
      if (end !== -1) {
        result += `\\tagbox{${inline(value.slice(i + 1, end))}}`;
        i = end + 1;
        continue;
      }
    }

    const CO = alignTags.centerOpen, CC = alignTags.centerClose;
    const LO = alignTags.leftOpen, LC = alignTags.leftClose;
    const RO = alignTags.rightOpen, RC = alignTags.rightClose;

    if (value.startsWith(CO, i)) {
      const end = value.indexOf(CC, i + CO.length);
      if (end !== -1) {
        result += `\\omrCenter{${inline(value.slice(i + CO.length, end))}}`;
        i = end + CC.length;
        continue;
      }
    }

    if (value.startsWith(LO, i)) {
      const end = value.indexOf(LC, i + LO.length);
      if (end !== -1) {
        result += `\\omrLeft{${inline(value.slice(i + LO.length, end))}}`;
        i = end + LC.length;
        continue;
      }
    }

    if (value.startsWith(RO, i)) {
      const end = value.indexOf(RC, i + RO.length);
      if (end !== -1) {
        result += `\\omrRight{${inline(value.slice(i + RO.length, end))}}`;
        i = end + RC.length;
        continue;
      }
    }

    if (value[i] === "[") {
      const textEnd = value.indexOf("]", i + 1);
      const urlStart = textEnd !== -1 ? value.indexOf("(", textEnd) : -1;
      const urlEnd = urlStart !== -1 ? value.indexOf(")", urlStart) : -1;
      if (textEnd !== -1 && urlStart === textEnd + 1 && urlEnd !== -1) {
        const label = inline(value.slice(i + 1, textEnd));
        const url = value.slice(urlStart + 1, urlEnd).replace(/\\/g, "");
        result += `\\href{${escapeLatex(url)}}{${label}}`;
        i = urlEnd + 1;
        continue;
      }
    }

    result += escapeLatex(value[i]);
    i += 1;
  }

  return result;
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function inlineHtml(text) {
  let result = "";
  let i = 0;
  const value = String(text);

  while (i < value.length) {
    const logoTag = parseInlineLogo(value, i);
    if (logoTag) {
      const logo = resolveInlineLogo(logoTag.key, logoTag.source);
      result += `<img class="inlineLogo" src="${fileDataUri(logo.file)}" alt="${escapeHtml(logo.label)}">`;
      i += logoTag.length;
      continue;
    }

    if (value.startsWith("**", i)) {
      const end = value.indexOf("**", i + 2);
      if (end !== -1) {
        result += `<strong>${inlineHtml(value.slice(i + 2, end))}</strong>`;
        i = end + 2;
        continue;
      }
    }

    if (value[i] === "`") {
      const end = value.indexOf("`", i + 1);
      if (end !== -1) {
        result += `<span class="tag">${inlineHtml(value.slice(i + 1, end))}</span>`;
        i = end + 1;
        continue;
      }
    }

    const CO = alignTags.centerOpen, CC = alignTags.centerClose;
    const LO = alignTags.leftOpen, LC = alignTags.leftClose;
    const RO = alignTags.rightOpen, RC = alignTags.rightClose;

    if (value.startsWith(CO, i)) {
      const end = value.indexOf(CC, i + CO.length);
      if (end !== -1) {
        result += `<span class="center">${inlineHtml(value.slice(i + CO.length, end))}</span>`;
        i = end + CC.length;
        continue;
      }
    }

    if (value.startsWith(LO, i)) {
      const end = value.indexOf(LC, i + LO.length);
      if (end !== -1) {
        result += `<span class="left">${inlineHtml(value.slice(i + LO.length, end))}</span>`;
        i = end + LC.length;
        continue;
      }
    }

    if (value.startsWith(RO, i)) {
      const end = value.indexOf(RC, i + RO.length);
      if (end !== -1) {
        result += `<span class="right">${inlineHtml(value.slice(i + RO.length, end))}</span>`;
        i = end + RC.length;
        continue;
      }
    }

    if (value[i] === "[") {
      const textEnd = value.indexOf("]", i + 1);
      const urlStart = textEnd !== -1 ? value.indexOf("(", textEnd) : -1;
      const urlEnd = urlStart !== -1 ? value.indexOf(")", urlStart) : -1;
      if (textEnd !== -1 && urlStart === textEnd + 1 && urlEnd !== -1) {
        const label = inlineHtml(value.slice(i + 1, textEnd));
        const url = value.slice(urlStart + 1, urlEnd).replace(/"/g, "%22");
        result += `<a href="${escapeHtml(url)}">${label}</a>`;
        i = urlEnd + 1;
        continue;
      }
    }

    result += escapeHtml(value[i]);
    i += 1;
  }

  return result;
}

function renderContactLines(meta) {
  const lines = Array.isArray(meta.contacts) ? meta.contacts : [];
  const derived = [];
  if (meta.phone) derived.push(`电话：${meta.phone}`);
  if (meta.email) derived.push(`邮箱：[${meta.email}](mailto:${meta.email})`);
  if (meta.city) derived.push(`城市：${meta.city}`);
  const allLines = lines.length ? lines : [derived.join(" | ")].filter(Boolean);
  return allLines.map((line) => `\\contactLine{${inline(line)}}`).join("\n    ");
}

function renderBulletTreeLatex(items, depth = 1) {
  if (!items.length) return "";
  const lines = ["\\begin{itemize}"];
  for (const item of items) {
    lines.push(`  \\item ${inline(item.text)}`);
    if (item.children.length) lines.push(renderBulletTreeLatex(item.children, depth + 1));
  }
  lines.push("\\end{itemize}");
  return lines.join("\n");
}

function renderBulletsLatex(bullets) {
  return renderBulletTreeLatex(buildBulletTree(bullets));
}

function renderEntry(entry) {
  const tags = entry.tags.map((tag) => `~\\tagbox{${inline(tag)}}`).join("");
  const title = `${inline(entry.title)}${tags}`;
  const date = entry.date ? `\\tightdate{${inline(entry.date)}}` : "";
  const parts = [];

  if (entry.color) {
    const command = entry.color.type === "rgb" ? "\\omrColoredDatedEntryRgb" : "\\omrColoredDatedEntry";
    parts.push(`${command}{${entry.color.value}}{${title}}{${date}}`);
  } else if (entry.left && entry.center) {
    const cTags = (entry.center.tags || []).map((tag) => `~\\tagbox{${inline(tag)}}`).join("");
    const cText = `${inline(entry.center.text)}${cTags}`;
    parts.push(`\\datedsubsectionLC{${title}}{${inline(entry.left)}}{${cText}}{${date}}`);
  } else if (entry.left) {
    parts.push(`\\datedsubsectionL{${title}}{${inline(entry.left)}}{${date}}`);
  } else if (entry.center) {
    const cTags = (entry.center.tags || []).map((tag) => `~\\tagbox{${inline(tag)}}`).join("");
    const cText = `${inline(entry.center.text)}${cTags}`;
    parts.push(`\\datedsubsectionC{${title}}{${cText}}{${date}}`);
  } else {
    parts.push(`\\datedsubsection{${title}}{${date}}`);
  }

  for (const field of entry.fields) {
    parts.push(`\\fieldline{${inline(field.label)}}{${inline(field.value)}}`);
  }
  for (const paragraph of entry.paragraphs) {
    parts.push(inline(paragraph));
  }
  if (entry.bullets.length) {
    parts.push(renderBulletsLatex(entry.bullets));
  }

  return parts.join("\n\n");
}

function renderSections(sections) {
  return sections
    .map((section) => {
      const parts = [];
      for (let index = 0; index < section.blocks.length; index += 1) {
        const block = section.blocks[index];
        if (block.type === "bullet") {
          const bullets = [];
          while (index < section.blocks.length && section.blocks[index].type === "bullet") {
            bullets.push(section.blocks[index]);
            index += 1;
          }
          index -= 1;
          parts.push(renderBulletsLatex(bullets));
          continue;
        }
        parts.push((() => {
          if (block.type === "entry") return renderEntry(block);
          if (block.type === "divider") return "\\omrDivider";
          if (block.type === "heading" && block.level === 1) return `\\omrHeadingOne{${inline(block.text)}}`;
          if (block.type === "heading" && block.level === 4) return `\\omrHeadingFour{${inline(block.text)}}`;
          return inline(block.text);
        })());
      }
      const body = parts.join("\n\n");
      return `\\sectioncard{${inline(section.title)}}\n${body}`;
    })
    .join("\n\n");
}

function renderOverrides(overrides = {}) {
  const lines = [];
  const colors = overrides.colors || {};
  for (const [name, value] of Object.entries(colors)) {
    if (/^[A-Za-z][A-Za-z0-9]*$/.test(name) && /^\d{1,3},\d{1,3},\d{1,3}$/.test(String(value).replace(/\s/g, ""))) {
      lines.push(`\\definecolor{${name}}{RGB}{${String(value).replace(/\s/g, "")}}`);
    }
  }

  const lengths = overrides.lengths || {};
  for (const [name, value] of Object.entries(lengths)) {
    if (/^[A-Za-z][A-Za-z0-9]*$/.test(name) && /^[0-9.]+(mm|cm|pt|em|ex)$/.test(String(value))) {
      lines.push(`\\renewcommand{\\${name}}{${value}}`);
    }
  }

  const fonts = overrides.fonts || {};
  for (const [name, value] of Object.entries(fonts)) {
    if (/^[A-Za-z][A-Za-z0-9]*$/.test(name) && /^[^{}\\]+$/.test(String(value))) {
      lines.push(`\\renewcommand{\\${name}}{${String(value)}}`);
    }
  }

  const sizes = overrides.sizes || {};
  for (const [name, value] of Object.entries(sizes)) {
    if (/^[A-Za-z][A-Za-z0-9]*$/.test(name) && /^[0-9.]+pt$/.test(String(value))) {
      lines.push(`\\renewcommand{\\${name}}{${String(value)}}`);
    }
  }

  const options = overrides.options || {};
  for (const [name, value] of Object.entries(options)) {
    if (/^[A-Za-z][A-Za-z0-9]*$/.test(name) && /^[A-Za-z][A-Za-z0-9_-]*$/.test(String(value))) {
      lines.push(`\\renewcommand{\\${name}}{${String(value)}}`);
    }
  }

  return lines.join("\n");
}

function resolveTheme(theme, cwd, packageDir) {
  const themeName = theme || "classic";
  if (themeName.endsWith(".tex") || themeName.includes("/") || themeName.includes("\\")) {
    return path.resolve(cwd, themeName);
  }
  return path.join(packageDir, "src", "themes", `${themeName}.tex`);
}

function renderDocument(meta, sections, options = {}) {
  const cwd = options.cwd || process.cwd();
  const packageDir = options.packageRoot || packageRoot;
  const themePath = resolveTheme(meta.theme, cwd, packageDir);
  const overrides = renderOverrides(options.themeOverrides);
  const avatarValue = Array.isArray(meta.avatar) ? "" : meta.avatar;
  const avatar = avatarValue ? path.resolve(path.dirname(options.input || cwd), avatarValue) : "";
  const logoValue = meta.schoolLogo || meta["school-logo"] || meta.logo || "";
  const logo = resolveSchoolLogo(logoValue, {
    cwd,
    input: options.input || cwd,
    packageRoot: packageDir,
    custom: options.schoolLogos || {}
  }).file;
  const componentsDir = path.join(packageDir, "src", "components");
  setInlineLogoContext({
    mode: "latex",
    input: options.input || cwd,
    packageRoot: packageDir,
    custom: options.logos || {}
  });

  return `% Generated by Oh My Resume. Edit the Markdown source instead of this file.
\\documentclass{oh-my-resume}
\\input{${texPath(themePath)}}
${overrides}
\\input{${texPath(path.join(componentsDir, "inline.tex"))}}
\\input{${texPath(path.join(componentsDir, "tags.tex"))}}
\\input{${texPath(path.join(componentsDir, "section.tex"))}}
\\input{${texPath(path.join(componentsDir, "entry.tex"))}}
\\input{${texPath(path.join(componentsDir, "header.tex"))}}

\\omrApplyBaseStyles

\\begin{document}

\\omrApplyDocumentStyles

\\omrHeader{${inline(meta.name || "Your Name")}}{
    ${renderContactLines(meta)}
}{${escapeLatex(avatar ? texPath(avatar) : "")}}{${escapeLatex(logo ? texPath(logo) : "")}}

${renderSections(sections)}

\\end{document}
`;
}

function cssValue(config, group, name, fallback) {
  return (((config.theme || {})[group] || {})[name]) || fallback;
}

function rgbCss(value) {
  return `rgb(${String(value || "37,99,235").replace(/\s/g, "")})`;
}

function fileDataUri(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return "";
  const ext = path.extname(filePath).toLowerCase();
  const mime = ext === ".png" ? "image/png"
    : ext === ".webp" ? "image/webp"
      : ext === ".gif" ? "image/gif"
        : ext === ".svg" ? "image/svg+xml"
          : "image/jpeg";
  return `data:${mime};base64,${fs.readFileSync(filePath).toString("base64")}`;
}

function htmlStyleTokens(config = {}) {
  const accent = cssValue(config, "colors", "omrTagText", "37,99,235");
  const tagBg = cssValue(config, "colors", "omrTagBg", "232,241,255");
  const sectionBg = cssValue(config, "colors", "omrSectionBg", accent);
  return {
    colors: {
      accent: rgbCss(accent),
      tagBg: rgbCss(tagBg),
      sectionBg: rgbCss(sectionBg),
      classicBg: rgbCss(cssValue(config, "colors", "omrClassicBg", "242,242,242")),
      colorGrayBg: rgbCss(cssValue(config, "colors", "omrColorGrayBg", "243,244,246")),
      colorPinkBg: rgbCss(cssValue(config, "colors", "omrColorPinkBg", "255,239,239")),
      colorBlueBg: rgbCss(cssValue(config, "colors", "omrColorBlueBg", "232,241,255")),
      muted: "#4b5563",
      text: "#111827"
    },
    lengths: {
      pageLeft: cssValue(config, "lengths", "omrPageMarginLeft", "8mm"),
      pageRight: cssValue(config, "lengths", "omrPageMarginRight", "8mm"),
      pageTop: cssValue(config, "lengths", "omrPageMarginTop", "8mm"),
      pageBottom: cssValue(config, "lengths", "omrPageMarginBottom", "8mm"),
      photoWidth: cssValue(config, "lengths", "omrPhotoWidth", "2.35cm"),
      photoHeight: cssValue(config, "lengths", "omrPhotoHeight", "2.75cm"),
      logoHeight: cssValue(config, "lengths", "omrLogoHeight", "1.2cm"),
      inlineLogoHeight: cssValue(config, "lengths", "omrInlineLogoHeight", "1em"),
      headerGap: cssValue(config, "lengths", "omrHeaderGap", "7mm"),
      photoRightInset: cssValue(config, "lengths", "omrPhotoRightInset", "0mm"),
      headerNameGap: cssValue(config, "lengths", "omrHeaderNameGap", "0.41em"),
      headerLineGap: cssValue(config, "lengths", "omrHeaderLineGap", "0.1em"),
      nameMarginTop: cssValue(config, "lengths", "omrNameMarginTop", "0em"),
      nameMarginBottom: cssValue(config, "lengths", "omrNameMarginBottom", cssValue(config, "lengths", "omrHeaderNameGap", "0.41em")),
      contactMarginTop: cssValue(config, "lengths", "omrContactMarginTop", cssValue(config, "lengths", "omrHeaderLineGap", "0.1em")),
      contactMarginBottom: cssValue(config, "lengths", "omrContactMarginBottom", cssValue(config, "lengths", "omrHeaderLineGap", "0.1em")),
      logoMarginTop: cssValue(config, "lengths", "omrLogoMarginTop", "0mm"),
      logoMarginBottom: cssValue(config, "lengths", "omrLogoMarginBottom", "0mm"),
      titleBodyGap: cssValue(config, "lengths", "omrTitleBodyGap", "0.38em"),
      hOneBefore: cssValue(config, "lengths", "omrHeadingOneBefore", "0.42em"),
      hOneAfter: cssValue(config, "lengths", "omrHeadingOneAfter", "0.22em"),
      sectionBefore: cssValue(config, "lengths", "omrSectionBefore", "0.58em"),
      sectionAfter: cssValue(config, "lengths", "omrSectionAfter", "0.54em"),
      entryBefore: cssValue(config, "lengths", "omrEntryBefore", "0.23em"),
      entryAfter: cssValue(config, "lengths", "omrEntryAfter", "0.22em"),
      entryDateWidth: cssValue(config, "lengths", "omrEntryDateWidth", "39mm"),
      hFourBefore: cssValue(config, "lengths", "omrHeadingFourBefore", "0.35em"),
      hFourAfter: cssValue(config, "lengths", "omrHeadingFourAfter", "0.18em"),
      dividerGap: cssValue(config, "lengths", "omrDividerGap", "0.3em")
    },
    sizes: {
      body: cssValue(config, "sizes", "omrBodyFontSize", "11.2pt"),
      bodyLine: cssValue(config, "sizes", "omrBodyLineHeight", "14.5pt"),
      name: cssValue(config, "sizes", "omrNameFontSize", "16.9pt"),
      nameLine: cssValue(config, "sizes", "omrNameLineHeight", "19pt"),
      contact: cssValue(config, "sizes", "omrContactFontSize", "10pt"),
      contactLine: cssValue(config, "sizes", "omrContactLineHeight", "13pt"),
      hOne: cssValue(config, "sizes", "omrHOneFontSize", "16.9pt"),
      hOneLine: cssValue(config, "sizes", "omrHOneLineHeight", "19pt"),
      section: cssValue(config, "sizes", "omrSectionFontSize", "12.1pt"),
      sectionLine: cssValue(config, "sizes", "omrSectionLineHeight", "14.2pt"),
      entry: cssValue(config, "sizes", "omrEntryFontSize", "10.5pt"),
      entryLine: cssValue(config, "sizes", "omrEntryLineHeight", "13pt"),
      hFour: cssValue(config, "sizes", "omrHFourFontSize", "10pt"),
      hFourLine: cssValue(config, "sizes", "omrHFourLineHeight", "13pt")
    },
    fonts: {
      body: cssValue(config, "fonts", "omrCJKMainFont", "Kaiti SC")
    },
    options: {
      align: cssValue(config, "options", "omrHeaderAlign", "left"),
      sectionStyle: cssValue(config, "options", "sectionStyle", "classic")
    }
  };
}

function renderContactLinesHtml(meta) {
  const lines = Array.isArray(meta.contacts) ? meta.contacts : [];
  const derived = [];
  if (meta.phone) derived.push(`电话：${meta.phone}`);
  if (meta.email) derived.push(`邮箱：[${meta.email}](mailto:${meta.email})`);
  if (meta.city) derived.push(`城市：${meta.city}`);
  const allLines = lines.length ? lines : [derived.join(" | ")].filter(Boolean);
  return allLines.map((line) => `<div class="contact">${inlineHtml(line)}</div>`).join("\n");
}

function renderEntryHtml(entry) {
  const tags = entry.tags.map((tag) => `<span class="tag">${inlineHtml(tag)}</span>`).join("");
  const fields = entry.fields.map((field) => `<div class="field"><strong>${inlineHtml(field.label)}：</strong>${inlineHtml(field.value)}</div>`).join("\n");
  const paragraphs = entry.paragraphs.map((paragraph) => `<p>${inlineHtml(paragraph)}</p>`).join("\n");
  const bullets = entry.bullets.length
    ? renderBulletsHtml(entry.bullets)
    : "";
  const leftBlock = entry.left ? `<left>${inlineHtml(entry.left)}</left>` : "";
  const center = entry.center
    ? `<div class="entryCenter">${inlineHtml(entry.center.text)} ${(entry.center.tags || []).map((tag) => `<span class="tag">${inlineHtml(tag)}</span>`).join("")}</div>`
    : "";
  const colorClass = entry.color && entry.color.type === "named" ? ` color-${entry.color.value}` : "";
  const colorStyle = entry.color && entry.color.type === "rgb" ? ` style="background:rgb(${entry.color.value})"` : "";
  const colorWrapper = entry.color ? " colorEntry" : "";
  return `<article class="entry${colorWrapper}${colorClass}"${colorStyle}>
  <div class="entryHead">
    ${leftBlock}
    <h3>${inlineHtml(entry.title)}${tags}</h3>
    ${entry.date ? `<right>${inlineHtml(entry.date)}</right>` : ""}
  </div>
  ${center}
  ${fields}
  ${paragraphs}
  ${bullets}
</article>`;
}

function renderBulletTreeHtml(items) {
  if (!items.length) return "";
  return `<ul>\n${items.map((item) => {
    const children = item.children.length ? `\n${renderBulletTreeHtml(item.children)}` : "";
    return `  <li>${inlineHtml(item.text)}${children}</li>`;
  }).join("\n")}\n</ul>`;
}

function renderBulletsHtml(bullets) {
  return renderBulletTreeHtml(buildBulletTree(bullets));
}

function renderSectionsHtml(sections, tokens) {
  return sections.map((section) => {
    const parts = [];
    for (let index = 0; index < section.blocks.length; index += 1) {
      const block = section.blocks[index];
      if (block.type === "bullet") {
        const bullets = [];
        while (index < section.blocks.length && section.blocks[index].type === "bullet") {
          bullets.push(section.blocks[index]);
          index += 1;
        }
        index -= 1;
        parts.push(renderBulletsHtml(bullets));
        continue;
      }
      parts.push(block.type === "entry" ? renderEntryHtml(block)
        : block.type === "divider" ? '<hr class="divider">'
        : block.type === "heading" && block.level === 1 ? `<h1>${inlineHtml(block.text)}</h1>`
          : block.type === "heading" && block.level === 4 ? `<h4>${inlineHtml(block.text)}</h4>`
            : `<p>${inlineHtml(block.text)}</p>`);
    }
    const body = parts.join("\n");
    return `<section class="section">
  <h2 class="sectionTitle section-${escapeHtml(tokens.options.sectionStyle)}"><span>${inlineHtml(section.title)}</span></h2>
  ${body}
</section>`;
  }).join("\n");
}

function renderHtmlDocument(meta, sections, options = {}) {
  const config = options.config || {};
  const tokens = htmlStyleTokens(config);
  const avatarValue = Array.isArray(meta.avatar) ? "" : meta.avatar;
  const logoValue = meta.schoolLogo || meta["school-logo"] || meta.logo || "";
  const baseDir = path.dirname(options.input || options.cwd || process.cwd());
  setInlineLogoContext({
    mode: "html",
    input: options.input || options.cwd || process.cwd(),
    packageRoot: options.packageRoot || packageRoot,
    custom: options.logos || config.logos || {}
  });
  const avatar = fileDataUri(avatarValue ? path.resolve(baseDir, avatarValue) : "");
  const schoolLogo = resolveSchoolLogo(logoValue, {
    cwd: options.cwd,
    input: options.input || options.cwd || process.cwd(),
    packageRoot: options.packageRoot || packageRoot,
    custom: options.schoolLogos || config.schoolLogos || {}
  });
  const logo = fileDataUri(schoolLogo.file);
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(meta.name || "Resume")}</title>
  <style>
    @page { size: A4; margin: ${tokens.lengths.pageTop} ${tokens.lengths.pageRight} ${tokens.lengths.pageBottom} ${tokens.lengths.pageLeft}; }
    * { box-sizing: border-box; }
    body { margin: 0; background: #c8ccd3; color: ${tokens.colors.text}; font: ${tokens.sizes.body}/${tokens.sizes.bodyLine} "${escapeHtml(tokens.fonts.body)}", "PingFang SC", "Microsoft YaHei", serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page { position: relative; width: 210mm; min-height: 297mm; margin: 0 auto; padding: ${tokens.lengths.pageTop} ${tokens.lengths.pageRight} ${tokens.lengths.pageBottom} ${tokens.lengths.pageLeft}; background: white; }
    header { position: relative; margin-bottom: ${tokens.lengths.titleBodyGap}; }
    .logoWrap { position: absolute; left: -2mm; top: 50%; display: ${logo ? "flex" : "none"}; flex-direction: column; align-items: flex-start; padding-top: ${tokens.lengths.logoMarginTop}; padding-bottom: ${tokens.lengths.logoMarginBottom}; transform: translateY(-50%); }
    .logo { height: ${tokens.lengths.logoHeight}; max-width: 56mm; object-fit: contain; }
    .headerText { text-align: ${tokens.options.align === "center" ? "center" : "left"}; min-width: 0; }
    .name { margin: ${tokens.lengths.nameMarginTop} 0 ${tokens.lengths.nameMarginBottom}; font-size: ${tokens.sizes.name}; line-height: ${tokens.sizes.nameLine}; font-weight: 800; }
    .contactGroup { margin: ${tokens.lengths.contactMarginTop} 0 ${tokens.lengths.contactMarginBottom}; }
    .contact { margin: 0; color: ${tokens.colors.muted}; font-size: ${tokens.sizes.contact}; line-height: ${tokens.sizes.contactLine}; }
    .avatarWrap { position: absolute; right: ${tokens.lengths.photoRightInset}; top: 50%; display: ${avatar ? "flex" : "none"}; align-items: center; transform: translateY(-50%); }
    .avatar { width: ${tokens.lengths.photoWidth}; height: ${tokens.lengths.photoHeight}; object-fit: cover; }
    a { color: ${tokens.colors.accent}; text-decoration: none; }
    h1 { margin: ${tokens.lengths.hOneBefore} 0 ${tokens.lengths.hOneAfter}; font-size: ${tokens.sizes.hOne}; line-height: ${tokens.sizes.hOneLine}; font-weight: 800; }
    .sectionTitle { position: relative; margin: ${tokens.lengths.sectionBefore} 0 ${tokens.lengths.sectionAfter}; font-size: ${tokens.sizes.section}; line-height: ${tokens.sizes.sectionLine}; font-weight: 800; color: ${tokens.colors.sectionBg}; }
    .sectionTitle span { position: relative; z-index: 1; }
    .section-classic { padding: 2.5pt 0 2.5pt 12pt; color: ${tokens.colors.text}; background: ${tokens.colors.classicBg}; border-left: 3pt solid ${tokens.colors.sectionBg}; }
    .section-simple { padding: 0 0 2pt; border-bottom: 1.2pt solid ${tokens.colors.sectionBg}; }
    .section-minimal { display: flex; align-items: center; gap: 0.5em; }
    .section-minimal::after { content: ""; flex: 1; border-bottom: 1.2pt solid ${tokens.colors.sectionBg}; transform: translateY(0.08em); }
    .section-premium span { display: inline-flex; min-width: 18%; justify-content: center; padding: 1pt 8pt; background: ${tokens.colors.sectionBg}; color: white; }
    .section-premium::after { content: ""; position: absolute; left: 18%; right: 0; top: calc(50% + 1.5pt); height: 3pt; background: ${tokens.colors.sectionBg}; }
    .section-refined span { display: inline-flex; min-width: 20%; padding: 1pt 16pt 1pt 12pt; color: white; background: ${tokens.colors.sectionBg}; clip-path: polygon(0 0, calc(100% - 16pt) 0, 100% 100%, 0% 100%); }
    .section-refined::after { content: ""; position: absolute; left: 20%; right: 0; top: calc(50% + 2pt); height: 4pt; background: ${tokens.colors.sectionBg}; }
    .section-professional span { display: inline-flex; min-width: 16%; padding: 1pt 14pt 1pt 8pt; color: white; background: ${tokens.colors.sectionBg}; border-radius: 3pt 0 0 3pt; clip-path: polygon(0 0, calc(100% - 10pt) 0, 100% 50%, calc(100% - 10pt) 100%, 0 100%); }
    .section-professional::after { content: ""; position: absolute; left: 16%; right: 0; top: 50%; border-bottom: 1.2pt solid ${tokens.colors.sectionBg}; }
    h3 { margin: 0; font-size: ${tokens.sizes.entry}; line-height: ${tokens.sizes.entryLine}; font-weight: 800; }
    h4 { margin: ${tokens.lengths.hFourBefore} 0 ${tokens.lengths.hFourAfter}; font-size: ${tokens.sizes.hFour}; line-height: ${tokens.sizes.hFourLine}; font-weight: 800; }
    .entry { margin: ${tokens.lengths.entryBefore} 0 ${tokens.lengths.entryAfter}; }
    .color-gray { background: ${tokens.colors.colorGrayBg}; }
    .color-pink { background: ${tokens.colors.colorPinkBg}; }
    .color-blue { background: ${tokens.colors.colorBlueBg}; }
    .entryHead { display: flex; align-items: baseline; justify-content: space-between; gap: 16px; }
    right { flex: 0 0 ${tokens.lengths.entryDateWidth}; text-align: right; white-space: nowrap; color: ${tokens.colors.muted}; }
    left { color: ${tokens.colors.muted}; }
    .entryHead h3 { min-width: 0; flex: 1 1 auto; }
    .entryCenter, .left, .field, p { margin: 0.12em 0; }
    .left { text-align: left; }
    .right { text-align: right; }
    ul { margin: 0.16em 0 0.2em 1.15em; padding: 0; list-style-type: disc; }
    ul ul { margin-top: 0.06em; margin-bottom: 0.08em; margin-left: 1.05em; list-style-type: disc; }
    ul ul ul { margin-left: 0.95em; list-style-type: disc; }
    li { margin: 0.08em 0; }
    li li { margin: 0.04em 0; }
    .divider { height: 0; margin: ${tokens.lengths.dividerGap} 0; border: 0; border-top: 0.55pt solid #666b73; }
    .tag { display: inline-flex; align-items: center; margin-left: 0.34em; padding: 0 0.34em; border-radius: 3px; background: ${tokens.colors.tagBg}; color: ${tokens.colors.accent}; font-size: 1em; line-height: 1.12; font-weight: 700; vertical-align: baseline; }
    .inlineLogo { display: inline-block; width: auto; height: ${tokens.lengths.inlineLogoHeight}; margin-right: 0.12em; object-fit: contain; vertical-align: -0.14em; }
    @media screen { .page { box-shadow: 0 12px 36px rgba(15, 23, 42, 0.18); } }
    @media print { body { background: white; } .page { width: auto; min-height: auto; margin: 0; padding: 0; box-shadow: none; } }
  </style>
</head>
<body>
  <main class="page">
    <header>
      ${logo ? `<div class="logoWrap"><img class="logo" src="${logo}" alt=""></div>` : ""}
      <div class="headerText">
        <div class="name">${inlineHtml(meta.name || "Your Name")}</div>
        <div class="contactGroup">${renderContactLinesHtml(meta)}</div>
      </div>
      ${avatar ? `<div class="avatarWrap"><img class="avatar" src="${avatar}" alt=""></div>` : ""}
    </header>
    ${renderSectionsHtml(sections, tokens)}
  </main>
</body>
</html>`;
}

function buildHtmlResume(options = {}) {
  const cwd = options.cwd || process.cwd();
  const input = path.resolve(cwd, options.input || "examples/resume.md");
  const output = path.resolve(cwd, options.output || "build/resume.html");
  const config = options.config ? readJsonIfExists(path.resolve(cwd, options.config)) : {};
  const mdOpts = config.markdown || {};
  setAlignTags(mdOpts);
  const source = fs.readFileSync(input, "utf8");
  const [frontmatter, markdown] = parseFrontmatter(source);
  const meta = { ...(config.resume || {}), ...frontmatter };
  const sections = parseMarkdown(markdown, mdOpts);
  const html = renderHtmlDocument(meta, sections, {
    config,
    cwd,
    input,
    logos: config.logos || {},
    schoolLogos: config.schoolLogos || {}
  });
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, html, "utf8");
  return { input, output };
}

function readJsonIfExists(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return {};
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function buildResume(options = {}) {
  const cwd = options.cwd || process.cwd();
  const input = path.resolve(cwd, options.input || "examples/resume.md");
  const output = path.resolve(cwd, options.output || "build/resume.tex");
  const config = options.config ? readJsonIfExists(path.resolve(cwd, options.config)) : {};
  const mdOpts = config.markdown || {};
  setAlignTags(mdOpts);
  const source = fs.readFileSync(input, "utf8");
  const [frontmatter, markdown] = parseFrontmatter(source);
  const meta = { ...(config.resume || {}), ...frontmatter };
  if (options.theme) meta.theme = options.theme;
  const sections = parseMarkdown(markdown, mdOpts);
  const tex = renderDocument(meta, sections, {
    cwd,
    input,
    packageRoot: options.packageRoot || packageRoot,
    themeOverrides: config.theme || {},
    logos: config.logos || {},
    schoolLogos: config.schoolLogos || {}
  });

  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.copyFileSync(
    path.join(options.packageRoot || packageRoot, "src", "oh-my-resume.cls"),
    path.join(path.dirname(output), "oh-my-resume.cls")
  );
  fs.writeFileSync(output, tex);
  return { input, output };
}

function main() {
  const input = process.argv[2] || "examples/resume.md";
  const output = process.argv[3] || "build/resume.tex";
  const result = buildResume({ cwd: process.cwd(), input, output });
  console.log(`Generated ${path.relative(process.cwd(), result.output)} from ${path.relative(process.cwd(), result.input)}`);
}

if (require.main === module) {
  main();
}

module.exports = {
  buildResume,
  buildHtmlResume,
  parseFrontmatter,
  parseMarkdown,
  renderDocument,
  renderHtmlDocument,
  readBuiltInLogos,
  readBuiltInSchoolLogos,
  resolveSchoolLogo
};
