#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const packageRoot = path.resolve(__dirname, "..");

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
      const parsedHeading = parseEntryHeading(line.slice(4).trim());
      entry = {
        type: "entry",
        title: parsedHeading.title,
        date: parsedHeading.date,
        tags: parsedHeading.tags,
        center: parsedHeading.center,
        fields: [],
        bullets: [],
        paragraphs: []
      };
      ensureSection().blocks.push(entry);
      continue;
    }

    const bullet = line.match(/^[-*]\s+(.*)$/);
    if (bullet) {
      if (!entry) {
        ensureSection().blocks.push({ type: "bullet", text: bullet[1].trim() });
      } else {
        entry.bullets.push(bullet[1].trim());
      }
      continue;
    }

    const field = line.match(/^([^:：]+)[:：]\s*(.*)$/);
    if (field && entry) {
      const label = field[1].trim();
      const key = normalizeFieldName(label);
      const value = field[2].trim();
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

function parseEntryHeading(value) {
  let title = String(value);
  let date = "";
  const tags = [];
  let center = "";

  // Extract <center> block first
  title = title.replace(/<center>(.*?)<\/center>/gi, (_, content) => {
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

  title = title.replace(/<time>(.*?)<\/time>/gi, (_, content) => {
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
    center: center ? { text: center, tags: centerTags } : null
  };
}

function normalizeFieldName(value) {
  return String(value).trim().toLowerCase();
}

function splitList(value) {
  return value
    .split(/[,，、|]/)
    .map((item) => item.trim())
    .filter(Boolean);
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

    if (value.startsWith("<center>", i)) {
      const end = value.indexOf("</center>", i + 8);
      if (end !== -1) {
        result += `\\omrCenter{${inline(value.slice(i + 8, end))}}`;
        i = end + 9;
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

function renderContactLines(meta) {
  const lines = Array.isArray(meta.contacts) ? meta.contacts : [];
  const derived = [];
  if (meta.phone) derived.push(`电话：${meta.phone}`);
  if (meta.email) derived.push(`邮箱：[${meta.email}](mailto:${meta.email})`);
  if (meta.city) derived.push(`城市：${meta.city}`);
  const allLines = lines.length ? lines : [derived.join(" | ")].filter(Boolean);
  return allLines.map((line) => `\\contactLine{${inline(line)}}`).join("\n    ");
}

function renderEntry(entry) {
  const tags = entry.tags.map((tag) => `~\\tagbox{${inline(tag)}}`).join("");
  const title = `${inline(entry.title)}${tags}`;
  const date = entry.date ? `\\tightdate{${inline(entry.date)}}` : "";
  const parts = [];

  if (entry.center) {
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
    parts.push("\\begin{itemize}");
    for (const bullet of entry.bullets) {
      parts.push(`  \\item ${inline(bullet)}`);
    }
    parts.push("\\end{itemize}");
  }

  return parts.join("\n\n");
}

function renderSections(sections) {
  return sections
    .map((section) => {
      const body = section.blocks
        .map((block) => {
          if (block.type === "entry") return renderEntry(block);
          if (block.type === "bullet") return `\\begin{itemize}\n  \\item ${inline(block.text)}\n\\end{itemize}`;
          if (block.type === "heading" && block.level === 1) return `\\omrHeadingOne{${inline(block.text)}}`;
          if (block.type === "heading" && block.level === 4) return `\\omrHeadingFour{${inline(block.text)}}`;
          return inline(block.text);
        })
        .join("\n\n");
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
  const logoValue = meta.logo || "";
  const logo = logoValue ? path.resolve(path.dirname(options.input || cwd), logoValue) : "";
  const componentsDir = path.join(packageDir, "src", "components");

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

function readJsonIfExists(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return {};
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function buildResume(options = {}) {
  const cwd = options.cwd || process.cwd();
  const input = path.resolve(cwd, options.input || "examples/resume.md");
  const output = path.resolve(cwd, options.output || "build/resume.tex");
  const config = options.config ? readJsonIfExists(path.resolve(cwd, options.config)) : {};
  const source = fs.readFileSync(input, "utf8");
  const [frontmatter, markdown] = parseFrontmatter(source);
  const meta = { ...(config.resume || {}), ...frontmatter };
  if (options.theme) meta.theme = options.theme;
  const sections = parseMarkdown(markdown, config.markdown || {});
  const tex = renderDocument(meta, sections, {
    cwd,
    input,
    packageRoot: options.packageRoot || packageRoot,
    themeOverrides: config.theme || {}
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
  parseFrontmatter,
  parseMarkdown,
  renderDocument
};
