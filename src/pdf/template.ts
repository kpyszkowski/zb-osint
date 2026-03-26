export interface ReportMeta {
  title: string
  student: string
  studentId?: string
  course: string
  instructor?: string
  university?: string
  domain: string
  timestamp: string
  target: string
}

export function buildHtmlDocument(_meta: ReportMeta, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'Times New Roman', Times, serif;
    font-size: 12pt;
    line-height: 1.6;
    color: #111;
  }

  h1 { font-size: 22pt; margin-top: 1em; margin-bottom: 0.5em; }
  h2 { font-size: 16pt; margin-top: 1.5em; margin-bottom: 0.5em; page-break-after: avoid; }
  h3 { font-size: 13pt; margin-top: 1em; margin-bottom: 0.4em; page-break-after: avoid; }
  h4 { font-size: 12pt; margin-top: 0.8em; margin-bottom: 0.3em; page-break-after: avoid; }

  p { margin-bottom: 0.6em; }
  ul, ol { margin-bottom: 0.6em; padding-left: 1.5em; }
  li { margin-bottom: 0.2em; }
  strong { font-weight: 600; }

  pre, code {
    font-family: 'Courier New', Courier, monospace;
    font-size: 8.5pt;
  }
  pre {
    background: #f7f7f7;
    border: 1px solid #ddd;
    border-radius: 3px;
    padding: 10px 12px;
    overflow-x: auto;
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
  }
  th, td {
    border: 1px solid #bbb;
    padding: 5px 8px;
    text-align: left;
    word-break: break-word;
  }
  th { background: #f0f0f0; font-weight: 600; }

  hr { border: none; border-top: 1px solid #ccc; margin: 1.5em 0; }

  a { color: #1a5276; text-decoration: underline; }

  img { max-width: 100%; }
</style>
</head>
<body>
${bodyHtml}
</body>
</html>`
}
