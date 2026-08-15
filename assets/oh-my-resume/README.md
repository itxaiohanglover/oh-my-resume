# Oh My Resume CLI Asset

This directory is bundled inside the `oh-my-resume` Skill.

Agents should call:

```bash
node assets/oh-my-resume/scripts/cli.js doctor
node assets/oh-my-resume/scripts/cli.js init .
node assets/oh-my-resume/scripts/cli.js pdf resume.md
node assets/oh-my-resume/scripts/cli.js html resume.md
node assets/oh-my-resume/scripts/cli.js html-pdf resume.md
node assets/oh-my-resume/scripts/cli.js debug resume.md
```

Users normally interact with the Skill, not this internal package.

## Inline company logos

Use a bundled logo in any Markdown text:

```md
### <logo>alibaba</logo> Alibaba Cloud <right>2026</right>
```

Custom PNG/JPG files can be used directly with
`<logo src="logos/company.png">Company</logo>`, or registered under the top-level
`logos` object in `omr.config.json`. The debug Style Settings page lists all
built-in and registered keys.

## Windows first-run setup

Run the Windows setup helper before first PDF generation:

```bat
install.bat
```

For PowerShell or CI usage:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\install.ps1 -PersistUserEnv -VerifyPdf
```

The script checks Node.js, XeLaTeX from MiKTeX or TeX Live, latexmk, and Strawberry Perl when needed, then runs `node scripts\cli.js doctor`.
