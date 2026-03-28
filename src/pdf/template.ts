export interface ReportMeta {
  title: string
  student: string
  studentId?: string
  course: string
  instructor?: string
  university?: string
  targets: Array<{ url: string; domain: string }>
  timestamp: string
  logoPath?: string
  language?: string
}

// Map natural language names to BCP 47 locale codes for date formatting
const languageLocales: Record<string, string> = {
  english: 'en-US',
  polish: 'pl-PL',
  french: 'fr-FR',
  german: 'de-DE',
  spanish: 'es-ES',
  italian: 'it-IT',
  portuguese: 'pt-PT',
  dutch: 'nl-NL',
  czech: 'cs-CZ',
  slovak: 'sk-SK',
  russian: 'ru-RU',
  ukrainian: 'uk-UA',
}

function resolveLocale(language?: string): string {
  if (!language) return 'en-US'
  return languageLocales[language.toLowerCase()] ?? 'en-US'
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

function buildTitlePage(meta: ReportMeta, logoDataUri?: string): string {
  const date = new Date(meta.timestamp).toLocaleDateString(
    resolveLocale(meta.language),
    {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    },
  )

  return `
<div class="title-page">
  ${logoDataUri ? `<img class="tp-logo" src="${logoDataUri}" alt="logo" />` : ''}
  ${meta.university ? `<p class="tp-university">${meta.university}</p>` : ''}
  ${meta.course ? `<p class="tp-course">${meta.course}</p>` : ''}
  <h1 class="tp-title">${meta.title}</h1>
  <div class="tp-meta">
    <p>${meta.student}${meta.studentId ? ` &nbsp;·&nbsp; ${meta.studentId}` : ''}</p>
    ${meta.instructor ? `<p>${meta.instructor}</p>` : ''}
    <p>${date}</p>
  </div>
</div>`
}

function buildToc(
  bodyHtml: string,
  tocHeading: string,
): { toc: string; bodyWithIds: string } {
  const entries: { level: number; text: string; id: string }[] = []
  const idCounts: Record<string, number> = {}

  const bodyWithIds = bodyHtml.replace(
    /<(h[234])(.*?)>([\s\S]*?)<\/h[234]>/gi,
    (_match, tag, attrs, inner) => {
      const text = inner.replace(/<[^>]+>/g, '').trim()
      const base = slugify(text) || 'section'
      idCounts[base] = (idCounts[base] ?? 0) + 1
      const id = idCounts[base] === 1 ? base : `${base}-${idCounts[base]}`
      const level = parseInt(tag[1])
      entries.push({ level, text, id })
      return `<${tag}${attrs} id="${id}">${inner}</${tag}>`
    },
  )

  if (entries.length === 0) return { toc: '', bodyWithIds }

  const indentClass: Record<number, string> = {
    2: '',
    3: 'toc-sub',
    4: 'toc-sub2',
  }
  const items = entries
    .map(
      ({ level, text, id }) =>
        `<li class="${indentClass[level] ?? 'toc-sub2'}"><a href="#${id}">${text}</a></li>`,
    )
    .join('\n')

  const toc = `
<div class="toc">
  <h2 class="toc-heading">${tocHeading}</h2>
  <ul>${items}</ul>
</div>
<div class="page-break"></div>`

  return { toc, bodyWithIds }
}

export function buildHtmlDocument(
  meta: ReportMeta,
  bodyHtml: string,
  tocHeading: string,
  logoDataUri?: string,
): string {
  const titlePage = buildTitlePage(meta, logoDataUri)
  const { toc, bodyWithIds } = buildToc(bodyHtml, tocHeading)

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${meta.title}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'Times New Roman', Times, serif;
    font-size: 12pt;
    line-height: 1.6;
    color: #111;
  }

  /* ── Title page ── */
  .title-page {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 90vh;
    text-align: center;
    page-break-after: always;
    padding: 2em;
  }
  .tp-logo {
    max-height: 80px;
    max-width: 240px;
    object-fit: contain;
    margin-bottom: 1.5em;
  }
  .tp-university {
    font-size: 13pt;
    font-weight: 600;
    margin-bottom: 0.4em;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .tp-course {
    font-size: 11pt;
    color: #555;
    margin-bottom: 2em;
  }
  .tp-title {
    font-size: 24pt;
    font-weight: 700;
    line-height: 1.3;
    margin-bottom: 1em;
  }
  .tp-meta {
    font-size: 11pt;
    line-height: 2;
    color: #333;
  }

  /* ── TOC ── */
  .toc {
    page-break-after: always;
    padding-top: 1em;
  }
  .toc-heading {
    font-size: 16pt;
    margin-bottom: 1em;
  }
  .toc ul {
    list-style: none;
    padding-left: 0;
    line-height: 2;
  }
  .toc li a {
    color: #111;
    text-decoration: none;
  }
  .toc .toc-sub {
    padding-left: 2em;
    font-size: 10.5pt;
  }
  .toc .toc-sub2 {
    padding-left: 4em;
    font-size: 10pt;
  }

  /* ── Page break utility ── */
  .page-break { page-break-after: always; }

  /* ── Body content ── */
  h1 { font-size: 22pt; margin-top: 1em; margin-bottom: 0.5em; }
  h2 { font-size: 16pt; margin-top: 1.8em; margin-bottom: 0.5em; page-break-after: avoid; }
  h3 { font-size: 13pt; margin-top: 1.2em; margin-bottom: 0.4em; page-break-after: avoid; }
  h4 { font-size: 12pt; margin-top: 0.8em; margin-bottom: 0.3em; page-break-after: avoid; }

  p { margin-bottom: 0.6em; }
  ul, ol { margin-bottom: 0.6em; padding-left: 1.5em; }
  li { margin-bottom: 0.2em; }
  strong { font-weight: 600; }

  pre, code {
    font-family: 'Courier New', Courier, monospace;
    font-size: 10pt;
    font-weight: 600;
  }
  pre {
    background: #f7f7f7;
    border: 1px solid #ddd;
    border-radius: 3px;
    padding: 10px 12px;
    margin-bottom: 0.8em;
    page-break-inside: avoid;
    white-space: pre-wrap;
    word-wrap: break-word;
  }
  code {
    background: #f0f0f0;
    padding: 1px 4px;
    border-radius: 2px;
  }
  pre code { background: none; padding: 0; }

  blockquote {
    border-left: 3px solid #c00;
    padding-left: 12px;
    color: #900;
    margin-bottom: 0.6em;
  }

  table {
    border-collapse: collapse;
    width: 100%;
    margin: 0.8em 0;
    font-size: 10pt;
    page-break-inside: avoid;
  }
  th, td {
    border: 1px solid #bbb;
    padding: 5px 8px;
    text-align: left;
    word-break: break-word;
  }
  th { background: #f0f0f0; font-weight: 600; }
  tr:nth-child(even) td { background: #fafafa; }

  hr { display: none; }
  a { color: #1a5276; text-decoration: underline; }
  img { max-width: 100%; }
</style>
</head>
<body>
${titlePage}
${toc}
${bodyWithIds}
</body>
</html>`
}
