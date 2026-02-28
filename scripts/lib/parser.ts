/**
 * Parser for Paraguayan legislation pages from BACN (bacn.gov.py).
 *
 * Input: raw HTML of an individual law page from bacn.gov.py
 * Output: seed JSON-compatible structure with provisions and definitions
 *
 * Page structure:
 *   - Title in <h1 class="entry-title">
 *   - Metadata in <li><strong>Fecha de Promulgacion:</strong> DD-MM-YYYY</li>
 *   - Law text in <div class="entry-content"> after the metadata/download section
 *   - Articles as "Articulo N°.-" in <p> or <strong> tags
 */

export interface ActIndexEntry {
  id: string;
  title: string;
  titleEn: string;
  shortName: string;
  status: 'in_force' | 'amended' | 'repealed' | 'not_yet_in_force';
  issuedDate: string;
  inForceDate: string;
  url: string;
  description?: string;
  aknYear?: string;
  aknNumber?: string;
}

export interface ParsedProvision {
  provision_ref: string;
  chapter?: string;
  section: string;
  title: string;
  content: string;
}

export interface ParsedDefinition {
  term: string;
  definition: string;
  source_provision?: string;
}

export interface ParsedAct {
  id: string;
  type: 'statute';
  title: string;
  title_en: string;
  short_name: string;
  status: string;
  issued_date: string;
  in_force_date: string;
  url: string;
  description?: string;
  provisions: ParsedProvision[];
  definitions: ParsedDefinition[];
}

// ---------- HTML entity handling ----------

const ENTITY_MAP: Record<string, string> = {
  nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'",
  aacute: 'á', Aacute: 'Á', eacute: 'é', Eacute: 'É',
  iacute: 'í', Iacute: 'Í', oacute: 'ó', Oacute: 'Ó',
  uacute: 'ú', Uacute: 'Ú', ntilde: 'ñ', Ntilde: 'Ñ',
  uuml: 'ü', Uuml: 'Ü', ordm: 'º', ordf: 'ª',
  laquo: '«', raquo: '»', iexcl: '¡', iquest: '¿',
  ccedil: 'ç', Ccedil: 'Ç', copy: '©', reg: '®',
  trade: '™', mdash: '—', ndash: '–', ldquo: '\u201C',
  rdquo: '\u201D', lsquo: '\u2018', rsquo: '\u2019',
  deg: '°', middot: '·', bull: '•',
};

function decodeHtmlEntities(input: string): string {
  return input.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (_m, entity: string) => {
    if (entity.startsWith('#x') || entity.startsWith('#X')) {
      const code = Number.parseInt(entity.slice(2), 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : _m;
    }
    if (entity.startsWith('#')) {
      const code = Number.parseInt(entity.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : _m;
    }
    return ENTITY_MAP[entity] ?? _m;
  });
}

function stripTagsPreserveBreaks(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li[^>]*>/gi, '\n- ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');
}

function normalizeWhitespace(input: string): string {
  return input
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ---------- Article regex ----------

// Matches "Artículo N°.-" or "Art. N.-" or "Artículo N.-" patterns
// Captures: [1] = article number (possibly with bis/ter/etc), [2] = optional title after the delimiter
const ARTICLE_HEADING_RE = /(?:^|\n)\s*(?:Art[ií]culo|Art\.?)\s+((?:\d+\s*(?:º|°)?(?:\s*(?:bis|ter|qu[áa]ter|quater|quinquies|sexies))?|[ÚU]NICO))\s*[.°º]*[-.:–]?\s*([^\n]*)/gimu;

const CHAPTER_RE = /(?:^|\n)\s*((?:CAP[ÍI]TULO|T[ÍI]TULO)\s+[IVXLC0-9A-Z]+[^\n]*)/gimu;

// ---------- Content extraction ----------

function extractEntryContent(html: string): string {
  // Look for the entry-content div
  const startMarker = html.indexOf('<div class="entry-content">');
  if (startMarker === -1) return html;

  // Find the closing </article> or </div> that corresponds
  const endMarker = html.indexOf('<footer class="entry-footer">', startMarker);
  if (endMarker === -1) {
    return html.slice(startMarker);
  }
  return html.slice(startMarker, endMarker);
}

function extractMetadata(html: string): { promulgationDate: string; publicationDate: string } {
  let promulgationDate = '';
  let publicationDate = '';

  const promMatch = html.match(/Fecha de Promulgaci[oó]n:\s*<\/strong>\s*(\d{2}-\d{2}-\d{4})/i);
  if (promMatch) {
    const parts = promMatch[1].split('-');
    promulgationDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
  }

  const pubMatch = html.match(/Fecha de Publicaci[oó]n:\s*<\/strong>\s*(\d{2}-\d{2}-\d{4})/i);
  if (pubMatch) {
    const parts = pubMatch[1].split('-');
    publicationDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
  }

  return { promulgationDate, publicationDate };
}

// ---------- Chapter tracking ----------

function collectChapterAnchors(text: string): Array<{ index: number; chapter: string }> {
  const anchors: Array<{ index: number; chapter: string }> = [];
  let match: RegExpExecArray | null;
  const re = new RegExp(CHAPTER_RE.source, CHAPTER_RE.flags);
  while ((match = re.exec(text)) !== null) {
    const chapter = normalizeWhitespace(match[1]);
    anchors.push({ index: match.index, chapter });
  }
  return anchors;
}

function nearestChapter(
  anchors: Array<{ index: number; chapter: string }>,
  atIndex: number,
): string | undefined {
  let found: string | undefined;
  for (const a of anchors) {
    if (a.index <= atIndex) {
      found = a.chapter;
    } else {
      break;
    }
  }
  return found;
}

function buildProvisionRef(section: string): string {
  const normalized = section
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[º°]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '');
  return `art${normalized}`;
}

// ---------- Provision parsing ----------

function parseProvisionsFromHtml(html: string): ParsedProvision[] {
  const entryContent = extractEntryContent(html);
  const decoded = decodeHtmlEntities(entryContent);
  const plain = normalizeWhitespace(stripTagsPreserveBreaks(decoded));

  const chapters = collectChapterAnchors(plain);

  const matches: Array<{
    start: number;
    end: number;
    section: string;
    headingTail: string;
  }> = [];

  const re = new RegExp(ARTICLE_HEADING_RE.source, ARTICLE_HEADING_RE.flags);
  let m: RegExpExecArray | null;
  while ((m = re.exec(plain)) !== null) {
    const full = m[0];
    const articleIdx = full.search(/Art[ií]culo|Art\.?/i);
    const start = m.index + Math.max(articleIdx, 0);
    const end = m.index + full.length;
    const section = m[1].replace(/[º°]/g, '').replace(/\s+/g, ' ').trim();
    const headingTail = (m[2] ?? '').trim();
    matches.push({ start, end, section, headingTail });
  }

  const provisions: ParsedProvision[] = [];
  for (let i = 0; i < matches.length; i++) {
    const current = matches[i];
    const nextStart = i + 1 < matches.length ? matches[i + 1].start : plain.length;
    const rawContent = plain.slice(current.end, nextStart).trim();

    if (rawContent.length < 4) continue;

    const title = current.headingTail.length > 0
      ? `Artículo ${current.section}. ${current.headingTail}`
      : `Artículo ${current.section}`;

    const content = rawContent
      .replace(/\n{2,}/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .trim();

    const provisionRef = buildProvisionRef(current.section);
    const chapter = nearestChapter(chapters, current.start);

    provisions.push({
      provision_ref: provisionRef,
      chapter,
      section: current.section,
      title,
      content,
    });
  }

  // Deduplicate by provision_ref, keeping the longest content
  const deduped = new Map<string, ParsedProvision>();
  for (const p of provisions) {
    const existing = deduped.get(p.provision_ref);
    if (!existing || p.content.length > existing.content.length) {
      deduped.set(p.provision_ref, p);
    }
  }

  const parsed = Array.from(deduped.values());
  if (parsed.length > 0) {
    return parsed;
  }

  // Fallback: if no articles found, create a single full-text provision
  const fallbackContent = plain
    .replace(/\n{2,}/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .trim();

  if (fallbackContent.length < 80) {
    return [];
  }

  return [
    {
      provision_ref: 'artfull',
      section: 'full',
      title: 'Texto completo',
      content: fallbackContent,
    },
  ];
}

// ---------- Definition extraction ----------

function extractDefinitions(provisions: ParsedProvision[]): ParsedDefinition[] {
  const definitions: ParsedDefinition[] = [];

  for (const provision of provisions) {
    const text = provision.content;
    const titleLower = provision.title.toLowerCase();
    const contentLower = text.toLowerCase();

    const isDefinitionsArticle = titleLower.includes('definici')
      || contentLower.includes('se define')
      || contentLower.includes('se entender')
      || contentLower.includes('para los efectos de')
      || contentLower.includes('a los efectos de');

    if (!isDefinitionsArticle) continue;

    const normalized = text.replace(/\n/g, ' ');

    // Pattern: a) Term: definition ... b) Term: definition ...
    const letterPattern = /\b([a-z])\)\s*([^:;]{2,120}):\s*([\s\S]*?)(?=\b[a-z]\)\s*[^:;]{2,120}:|$)/gi;
    let m: RegExpExecArray | null;
    while ((m = letterPattern.exec(normalized)) !== null) {
      const term = normalizeWhitespace(m[2]);
      const definition = normalizeWhitespace(m[3]).replace(/[.;:]$/, '').trim();

      if (term.length < 2 || term.length > 160) continue;
      if (definition.length < 8) continue;

      definitions.push({
        term,
        definition,
        source_provision: provision.provision_ref,
      });
    }

    // Pattern: N. Term: definition or N) Term: definition
    const numberPattern = /(?:^|\n)\s*(\d+)[.)]\s*([^:;]{2,120}):\s*([\s\S]*?)(?=(?:^|\n)\s*\d+[.)]\s*[^:;]{2,120}:|$)/gim;
    while ((m = numberPattern.exec(normalized)) !== null) {
      const term = normalizeWhitespace(m[2]);
      const definition = normalizeWhitespace(m[3]).replace(/[.;:]$/, '').trim();

      if (term.length < 2 || term.length > 160) continue;
      if (definition.length < 8) continue;

      definitions.push({
        term,
        definition,
        source_provision: provision.provision_ref,
      });
    }
  }

  const unique = new Map<string, ParsedDefinition>();
  for (const d of definitions) {
    const key = `${d.source_provision}:${d.term.toLowerCase()}`;
    if (!unique.has(key)) unique.set(key, d);
  }
  return Array.from(unique.values());
}

// ---------- Main parser export ----------

export function parseParaguayLawHtml(html: string, act: ActIndexEntry): ParsedAct {
  const metadata = extractMetadata(html);
  const provisions = parseProvisionsFromHtml(html);
  const definitions = extractDefinitions(provisions);

  return {
    id: act.id,
    type: 'statute',
    title: act.title,
    title_en: act.titleEn || act.title,
    short_name: act.shortName,
    status: act.status,
    issued_date: metadata.promulgationDate || act.issuedDate || '',
    in_force_date: metadata.publicationDate || act.inForceDate || '',
    url: act.url,
    description: act.description,
    provisions,
    definitions,
  };
}

// Legacy alias for backwards compatibility with ingest.ts
export { parseParaguayLawHtml as parseHtml };
