#!/usr/bin/env tsx
/**
 * Paraguay Law MCP -- Census Script (Golden Standard)
 *
 * Enumerates ALL Paraguayan legislation from BACN (bacn.gov.py)
 * by paginating through the AJAX listing endpoint.
 *
 * Writes data/census.json in golden standard format.
 *
 * Usage:
 *   npx tsx scripts/census.ts                    # Full census
 *   npx tsx scripts/census.ts --limit 50         # First 50 pages only
 *   npx tsx scripts/census.ts --start-page 100   # Resume from page 100
 *
 * Source: BACN (Biblioteca y Archivo Central del Congreso Nacional)
 *         https://www.bacn.gov.py/leyes-paraguayas
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, '../data');
const CENSUS_PATH = path.join(DATA_DIR, 'census.json');
const SEED_DIR = path.join(DATA_DIR, 'seed');

const PAGINATION_URL = 'https://www.bacn.gov.py/paginacion/leyes-paraguayas.php';
const USER_AGENT = 'paraguayan-law-mcp/1.0 (https://github.com/Ansvar-Systems/paraguayan-law-mcp; hello@ansvar.ai)';
const MIN_DELAY_MS = 500;

// ---------- interfaces ----------

interface CensusLaw {
  id: string;
  title: string;
  identifier: string;
  url: string;
  status: 'in_force' | 'amended' | 'repealed';
  category: 'act';
  classification: 'ingestable' | 'excluded' | 'inaccessible';
  ingested: boolean;
  provision_count: number;
  ingestion_date: string | null;
}

interface CensusOutput {
  schema_version: string;
  jurisdiction: string;
  jurisdiction_name: string;
  jurisdiction_code: string;
  source: string;
  portal: string;
  census_date: string;
  agent: string;
  summary: {
    total_laws: number;
    ingestable: number;
    ocr_needed: number;
    inaccessible: number;
    excluded: number;
  };
  laws: CensusLaw[];
}

interface CliArgs {
  limit: number | null;
  startPage: number;
}

// ---------- helpers ----------

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  let limit: number | null = null;
  let startPage = 1;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--limit' && args[i + 1]) {
      limit = Number.parseInt(args[++i], 10);
    } else if (args[i] === '--start-page' && args[i + 1]) {
      startPage = Number.parseInt(args[++i], 10);
    }
  }

  return { limit, startPage };
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&ordm;/g, 'º')
    .replace(/&ordf;/g, 'ª')
    .replace(/&ntilde;/g, 'ñ')
    .replace(/&Ntilde;/g, 'Ñ')
    .replace(/&aacute;/g, 'á')
    .replace(/&Aacute;/g, 'Á')
    .replace(/&eacute;/g, 'é')
    .replace(/&Eacute;/g, 'É')
    .replace(/&iacute;/g, 'í')
    .replace(/&Iacute;/g, 'Í')
    .replace(/&oacute;/g, 'ó')
    .replace(/&Oacute;/g, 'Ó')
    .replace(/&uacute;/g, 'ú')
    .replace(/&Uacute;/g, 'Ú')
    .replace(/&uuml;/g, 'ü')
    .replace(/&Uuml;/g, 'Ü')
    .replace(/&#(\d+);/g, (_m, dec: string) => {
      const code = Number.parseInt(dec, 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : _m;
    })
    .replace(/&#x([0-9a-fA-F]+);/g, (_m, hex: string) => {
      const code = Number.parseInt(hex, 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : _m;
    });
}

function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/**
 * Extract law entries from a pagination page HTML fragment.
 * Each entry has a link like: /leyes-paraguayas/ID/SLUG
 * and a title link with class "blog-entry-title-link".
 */
function parsePaginationPage(html: string): Array<{ bacnId: number; title: string; slug: string }> {
  const entries: Array<{ bacnId: number; title: string; slug: string }> = [];
  const seen = new Set<number>();

  // Match title links: <a href="...leyes-paraguayas/ID/SLUG..." class="blog-entry-title-link"...>TITLE</a>
  const linkRe = /href="https?:\/\/www\.bacn\.gov\.py\/leyes-paraguayas\/(\d+)\/([^"]+)"[^>]*class="blog-entry-title-link"[^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;

  while ((match = linkRe.exec(html)) !== null) {
    const bacnId = Number.parseInt(match[1], 10);
    if (!Number.isFinite(bacnId) || seen.has(bacnId)) continue;
    seen.add(bacnId);

    const slug = match[2].trim();
    const rawTitle = match[3].replace(/<[^>]+>/g, '').trim();
    const title = decodeHtmlEntities(rawTitle).replace(/\s+/g, ' ').trim();

    entries.push({ bacnId, title, slug });
  }

  return entries;
}

/**
 * Extract the law number from the title (e.g. "Ley Nº 7614/2025" -> "7614/2025").
 */
function extractLawNumber(title: string): string {
  const m = title.match(/Ley\s+(?:N[ºo°]?\s*)?(\d[\d./]*)/i);
  return m?.[1] ?? '';
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchPage(page: number): Promise<string> {
  await sleep(MIN_DELAY_MS);

  const body = `action=ajax&page=${page}`;
  const response = await fetch(PAGINATION_URL, {
    method: 'POST',
    headers: {
      'User-Agent': USER_AGENT,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'text/html, */*',
    },
    body,
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for page ${page}`);
  }

  return response.text();
}

// ---------- main ----------

async function main(): Promise<void> {
  const args = parseArgs();

  console.log('Paraguay Law MCP -- Census');
  console.log('=========================\n');
  console.log('  Source:    BACN (bacn.gov.py)');
  console.log('  Method:   AJAX pagination endpoint');
  console.log(`  Start:    page ${args.startPage}`);
  if (args.limit) console.log(`  Limit:    ${args.limit} pages`);
  console.log('');

  const allLaws: CensusLaw[] = [];
  const seenIds = new Set<number>();
  let page = args.startPage;
  let emptyPages = 0;
  const maxEmptyPages = 3;

  // Cross-reference with existing seed files
  const existingSeedIds = new Set<string>();
  if (fs.existsSync(SEED_DIR)) {
    for (const f of fs.readdirSync(SEED_DIR)) {
      if (f.endsWith('.json')) {
        existingSeedIds.add(f.replace('.json', ''));
      }
    }
  }

  while (true) {
    if (args.limit && (page - args.startPage) >= args.limit) {
      console.log(`  Reached page limit (${args.limit} pages).`);
      break;
    }

    process.stdout.write(`  Page ${page}...`);

    try {
      const html = await fetchPage(page);
      const entries = parsePaginationPage(html);

      if (entries.length === 0) {
        emptyPages++;
        console.log(` empty (${emptyPages}/${maxEmptyPages})`);
        if (emptyPages >= maxEmptyPages) {
          console.log('  Reached end of pagination.');
          break;
        }
        page++;
        continue;
      }

      emptyPages = 0;
      let newCount = 0;

      for (const entry of entries) {
        if (seenIds.has(entry.bacnId)) continue;
        seenIds.add(entry.bacnId);
        newCount++;

        const lawNum = extractLawNumber(entry.title);
        const id = `py-ley-${entry.bacnId}`;

        allLaws.push({
          id,
          title: entry.title,
          identifier: lawNum ? `Ley N° ${lawNum}` : `BACN-${entry.bacnId}`,
          url: `https://www.bacn.gov.py/leyes-paraguayas/${entry.bacnId}/${entry.slug}`,
          status: 'in_force',
          category: 'act',
          classification: 'ingestable',
          ingested: existingSeedIds.has(id),
          provision_count: 0,
          ingestion_date: null,
        });
      }

      console.log(` ${entries.length} entries (${newCount} new, cumulative ${allLaws.length})`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.log(` ERROR: ${msg.slice(0, 120)}`);
      emptyPages++;
      if (emptyPages >= maxEmptyPages) break;
    }

    page++;
  }

  // Build census output
  const census: CensusOutput = {
    schema_version: '2.0',
    jurisdiction: 'Paraguay',
    jurisdiction_name: 'Republic of Paraguay',
    jurisdiction_code: 'PY',
    source: 'bacn.gov.py',
    portal: 'BACN (Biblioteca y Archivo Central del Congreso Nacional)',
    census_date: new Date().toISOString(),
    agent: 'paraguayan-law-mcp/census.ts',
    summary: {
      total_laws: allLaws.length,
      ingestable: allLaws.filter(l => l.classification === 'ingestable').length,
      ocr_needed: 0,
      inaccessible: allLaws.filter(l => l.classification === 'inaccessible').length,
      excluded: allLaws.filter(l => l.classification === 'excluded').length,
    },
    laws: allLaws,
  };

  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(CENSUS_PATH, JSON.stringify(census, null, 2) + '\n');

  console.log(`\n${'='.repeat(50)}`);
  console.log('CENSUS COMPLETE');
  console.log('='.repeat(50));
  console.log(`  Total laws discovered:  ${allLaws.length}`);
  console.log(`  Ingestable:             ${census.summary.ingestable}`);
  console.log(`  Inaccessible:           ${census.summary.inaccessible}`);
  console.log(`  Excluded:               ${census.summary.excluded}`);
  console.log(`  Pages scanned:          ${page - args.startPage}`);
  console.log(`\n  Output: ${CENSUS_PATH}`);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
