\NeedsTeXFormat{LaTeX2e}
\ProvidesClass{oh-my-resume}[2026/07/01 Oh My Resume class]

\LoadClass[10pt]{article}

\RequirePackage{iftex}
\ifXeTeX\else
  \ClassError{oh-my-resume}{Oh My Resume requires XeLaTeX}{Use xelatex or latexmk -xelatex to build this resume.}
\fi

% Force driver at load time: geometry v6.0 defers driver detection to
% \begin{document}, which is AFTER \omrApplyLayout's \newgeometry call.
% Without a known driver the a4paper option is lost and the layout falls
% back to article's default letterpaper (observed: \paperwidth=614.295pt).
\PassOptionsToPackage{driver=xetex}{geometry}
\RequirePackage[a4paper, nohead, nofoot]{geometry}
\RequirePackage{fontspec}
\RequirePackage{xeCJK}
\RequirePackage{xcolor}
\RequirePackage{xifthen}
\RequirePackage{graphicx}
\RequirePackage{hyperref}
\RequirePackage{titlesec}
\RequirePackage{enumitem}
\RequirePackage[skins]{tcolorbox}
\RequirePackage{fontawesome5}
\RequirePackage{calc}
\RequirePackage{setspace}

\hypersetup{
  colorlinks=true,
  urlcolor=omrLinkColor,
  linkcolor=omrLinkColor
}
\urlstyle{tt}
\setlength{\parindent}{0pt}
\pagestyle{empty}

% Defaults are intentionally conservative. Themes can override them.
\definecolor{omrAccent}{RGB}{79,139,255}
\definecolor{omrTagBg}{RGB}{232,241,255}
\definecolor{omrTagText}{RGB}{79,139,255}
\definecolor{omrSectionBg}{RGB}{245,246,248}
\definecolor{omrSectionRule}{RGB}{30,35,45}
\definecolor{omrClassicBg}{RGB}{242,242,242}
\definecolor{omrTextMuted}{RGB}{75,85,99}
\definecolor{omrLinkColor}{RGB}{40,88,160}

\newcommand{\omrPageMarginLeft}{8mm}
\newcommand{\omrPageMarginRight}{8mm}
\newcommand{\omrPageMarginTop}{8mm}
\newcommand{\omrPageMarginBottom}{5mm}
\newcommand{\omrPhotoWidth}{2.35cm}
\newcommand{\omrPhotoHeight}{2.75cm}
\newcommand{\omrLogoHeight}{1.2cm}
\newcommand{\omrInlineLogoHeight}{1em}
\newlength{\omrSavedLineWidth}
\newcommand{\omrHeaderGap}{7mm}
\newcommand{\omrPhotoRightInset}{0mm}
\newcommand{\omrHeaderNameGap}{0.34em}
\newcommand{\omrHeaderLineGap}{0.06em}
\newcommand{\omrNameMarginTop}{0em}
\newcommand{\omrNameMarginBottom}{\omrHeaderNameGap}
\newcommand{\omrContactMarginTop}{\omrHeaderLineGap}
\newcommand{\omrContactMarginBottom}{\omrHeaderLineGap}
\newcommand{\omrLogoMarginTop}{0mm}
\newcommand{\omrLogoMarginBottom}{0mm}
\newcommand{\omrHeadingOneBefore}{0.35em}
\newcommand{\omrHeadingOneAfter}{0.18em}
\newcommand{\omrSectionBefore}{0.46em}
\newcommand{\omrTitleBodyGap}{0.32em}
\newcommand{\omrSectionAfter}{\omrTitleBodyGap}
\newcommand{\omrEntryBefore}{0.18em}
\newcommand{\omrEntryAfter}{0em}
\newcommand{\omrHeadingFourBefore}{0.35em}
\newcommand{\omrHeadingFourAfter}{0.18em}
\newcommand{\omrDividerGap}{0.3em}
\newcommand{\omrEntryDateWidth}{39mm}
\newcommand{\omrBodyFont}{TeX Gyre Termes}
\newcommand{\omrCJKMainFont}{Songti SC}
\newcommand{\omrBodyFontSize}{10pt}
\newcommand{\omrBodyLineHeight}{13pt}
\newcommand{\omrNameFontSize}{16.9pt}
\newcommand{\omrNameLineHeight}{19pt}
\newcommand{\omrContactFontSize}{10pt}
\newcommand{\omrContactLineHeight}{13pt}
\newcommand{\omrHOneFontSize}{16pt}
\newcommand{\omrHOneLineHeight}{19pt}
\newcommand{\omrSectionFontSize}{11.4pt}
\newcommand{\omrSectionLineHeight}{14.2pt}
\newcommand{\omrEntryFontSize}{10pt}
\newcommand{\omrEntryLineHeight}{13pt}
\newcommand{\omrHFourFontSize}{10pt}
\newcommand{\omrHFourLineHeight}{13pt}
\newcommand{\omrHeaderAlign}{center}
\newcommand{\sectionStyle}{classic}

\newcommand{\omrApplyLayout}{%
  % NOTE: this macro is invoked in the preamble (before \begin{document}).
  % geometry v6.0's \newgeometry resets the paper size to the class default
  % (letterpaper) when called in the preamble, silently discarding a4paper.
  % \geometry in the preamble merges options instead, preserving a4paper.
  \geometry{
    left=\omrPageMarginLeft,
    right=\omrPageMarginRight,
    top=\omrPageMarginTop,
    bottom=\omrPageMarginBottom,
    nohead,
    nofoot
  }%
}

\newcommand{\omrApplyFonts}{%
  \IfFontExistsTF{\omrBodyFont}{\setmainfont[AutoFakeBold=2]{\omrBodyFont}}{%
    \IfFontExistsTF{Times New Roman}{\setmainfont[AutoFakeBold=2]{Times New Roman}}{}%
  }%
  \IfFontExistsTF{\omrCJKMainFont}{\setCJKmainfont[AutoFakeBold=2]{\omrCJKMainFont}}{%
    \IfFontExistsTF{Noto Serif CJK SC}{\setCJKmainfont[AutoFakeBold=2]{Noto Serif CJK SC}}{%
      \IfFontExistsTF{Songti SC}{\setCJKmainfont[AutoFakeBold=2]{Songti SC}}{%
        \IfFontExistsTF{PingFang SC}{\setCJKmainfont[AutoFakeBold=2]{PingFang SC}}{%
          \IfFontExistsTF{FandolSong-Regular}{\setCJKmainfont[AutoFakeBold=2]{FandolSong-Regular}}{}%
        }%
      }%
    }%
  }%
}

\newcommand{\omrApplyBaseStyles}{%
  \omrApplyLayout
  \omrApplyFonts
  \setlist{noitemsep, topsep=0pt, partopsep=0pt, parsep=0pt}
  \setlist[itemize]{topsep=1pt, partopsep=0pt, parsep=1.2pt, itemsep=1.2pt, label=\textbullet}
  \setlist[itemize,1]{leftmargin=1.4pc, label=\textbullet}
  \setlist[itemize,2]{leftmargin=1.2pc, topsep=0.4pt, parsep=0.4pt, itemsep=0.4pt, label=\textbullet}
  \setlist[itemize,3]{leftmargin=1pc, topsep=0.2pt, parsep=0.2pt, itemsep=0.2pt, label=\textbullet}
  \setlist[enumerate]{topsep=0pt, partopsep=0pt, parsep=0pt, itemsep=0pt, leftmargin=1.5pc}
  \titleformat{\section}{\normalsize\bfseries\raggedright}{}{0em}{}
  \titlespacing*{\section}{0cm}{*0.9}{*0.25}
  \titleformat{\subsection}{\normalsize\bfseries\raggedright}{}{0em}{}
  \titlespacing*{\subsection}{0cm}{0pt}{0pt}
}

\newcommand{\omrApplyDocumentStyles}{%
  \fontsize{\omrBodyFontSize}{\omrBodyLineHeight}\selectfont
}

\endinput
