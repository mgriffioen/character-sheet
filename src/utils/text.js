// Convert the HTML snippets D&D Beyond ships in descriptions into safe plain
// text with sensible line breaks. We deliberately strip all tags rather than
// render imported HTML, to avoid injecting untrusted markup into the page.
export function htmlToText(html) {
  if (!html) return ''
  let s = String(html)
  // Turn common block/line elements into newlines before stripping tags.
  s = s
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/\s*(p|div|li|tr|h[1-6])\s*>/gi, '\n')
    .replace(/<\s*li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, '')
  // Decode a few common entities.
  s = s
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&rsquo;/gi, '’')
    .replace(/&lsquo;/gi, '‘')
    .replace(/&rdquo;/gi, '”')
    .replace(/&ldquo;/gi, '“')
    .replace(/&mdash;/gi, '—')
    .replace(/&times;/gi, '×')
  // Collapse excess whitespace/newlines.
  return s
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\s+|\s+$/g, '')
}

// Split plain text into paragraphs for rendering.
export function toParagraphs(text) {
  return htmlToText(text)
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
}

export function relativeTime(ts) {
  const diff = Date.now() - ts
  const s = Math.floor(diff / 1000)
  if (s < 5) return 'just now'
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return new Date(ts).toLocaleDateString()
}
