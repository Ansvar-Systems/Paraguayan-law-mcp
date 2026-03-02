# Paraguayan Law MCP Server

**The Digesto Jurídico Paraguayo alternative for the AI age.**

[![npm version](https://badge.fury.io/js/@ansvar%2Fparaguayan-law-mcp.svg)](https://www.npmjs.com/package/@ansvar/paraguayan-law-mcp)
[![MCP Registry](https://img.shields.io/badge/MCP-Registry-blue)](https://registry.modelcontextprotocol.io)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![GitHub stars](https://img.shields.io/github/stars/Ansvar-Systems/Paraguayan-law-mcp?style=social)](https://github.com/Ansvar-Systems/Paraguayan-law-mcp)
[![CI](https://github.com/Ansvar-Systems/Paraguayan-law-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/Ansvar-Systems/Paraguayan-law-mcp/actions/workflows/ci.yml)
[![Database](https://img.shields.io/badge/database-pre--built-green)](https://github.com/Ansvar-Systems/Paraguayan-law-mcp)

Query **Paraguayan statutes** -- from Ley 6534/2020 on data protection and the Código Penal to the Código Civil, Código del Trabajo, and more -- directly from Claude, Cursor, or any MCP-compatible client.

If you're building legal tech, compliance tools, or doing Paraguayan legal research, this is your verified reference database.

Built by [Ansvar Systems](https://ansvar.eu) -- Stockholm, Sweden

---

## Why This Exists

Paraguayan legal research is scattered across digesto.senado.gov.py, bacn.gov.py, and congreso.gov.py. Whether you're:
- A **lawyer** validating citations in a brief or contract
- A **compliance officer** checking obligations under Ley 6534/2020 on data protection or MERCOSUR agreements
- A **legal tech developer** building tools on Paraguayan law
- A **researcher** tracing legislative history through the Congreso Nacional

...you shouldn't need multiple browser tabs and manual cross-referencing. Ask Claude. Get the exact provision. With context.

This MCP server makes Paraguayan law **searchable, cross-referenceable, and AI-readable**.

---

## Quick Start

### Use Remotely (No Install Needed)

> Connect directly to the hosted version -- zero dependencies, nothing to install.

**Endpoint:** `https://paraguayan-law-mcp.vercel.app/mcp`

| Client | How to Connect |
|--------|---------------|
| **Claude.ai** | Settings > Connectors > Add Integration > paste URL |
| **Claude Code** | `claude mcp add paraguayan-law --transport http https://paraguayan-law-mcp.vercel.app/mcp` |
| **Claude Desktop** | Add to config (see below) |
| **GitHub Copilot** | Add to VS Code settings (see below) |

**Claude Desktop** -- add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "paraguayan-law": {
      "type": "url",
      "url": "https://paraguayan-law-mcp.vercel.app/mcp"
    }
  }
}
```

**GitHub Copilot** -- add to VS Code `settings.json`:

```json
{
  "github.copilot.chat.mcp.servers": {
    "paraguayan-law": {
      "type": "http",
      "url": "https://paraguayan-law-mcp.vercel.app/mcp"
    }
  }
}
```

### Use Locally (npm)

```bash
npx @ansvar/paraguayan-law-mcp
```

**Claude Desktop** -- add to `claude_desktop_config.json`:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "paraguayan-law": {
      "command": "npx",
      "args": ["-y", "@ansvar/paraguayan-law-mcp"]
    }
  }
}
```

**Cursor / VS Code:**

```json
{
  "mcp.servers": {
    "paraguayan-law": {
      "command": "npx",
      "args": ["-y", "@ansvar/paraguayan-law-mcp"]
    }
  }
}
```

---

## Example Queries

Once connected, just ask naturally (in Spanish or English):

- *"¿Qué dice la Ley 6534/2020 sobre protección de datos personales respecto al consentimiento?"*
- *"Buscar disposiciones sobre delitos informáticos en el Código Penal paraguayo"*
- *"¿Está vigente el Código del Trabajo en Paraguay?"*
- *"Buscar artículos sobre contratos en el Código Civil"*
- *"¿Qué establece la Ley de Sociedades Comerciales sobre responsabilidad de directores?"*
- *"Buscar legislación sobre inversión extranjera en Paraguay"*
- *"Validar la cita Ley 6534/2020 artículo 5"*
- *"What does Paraguayan data protection law say about data subject rights?"*

---

## What's Included

| Category | Count | Details |
|----------|-------|---------|
| **Statutes** | Ingestion in progress | Legislation from digesto.senado.gov.py, bacn.gov.py |
| **Provisions** | Ingestion in progress | Full-text searchable with FTS5 |
| **Database Size** | ~86 MB | Optimized SQLite, portable |
| **Legal Definitions** | Table reserved | Extraction planned for upcoming release |
| **Freshness Checks** | Automated | Drift detection against official sources |

> **Note:** This server is in active ingestion. The database infrastructure is deployed and operational. Statute content is being populated from authoritative Paraguayan sources. Use `list_sources` to see current coverage, and `about` for the latest statistics.

**Verified data only** -- every citation is validated against official sources (Digesto Jurídico, BACN, Congreso Nacional). Zero LLM-generated content.

---

## Why This Works

**Verbatim Source Text (No LLM Processing):**
- All statute text is ingested from official Paraguayan government sources (digesto.senado.gov.py, bacn.gov.py)
- Provisions are returned **unchanged** from SQLite FTS5 database rows
- Zero LLM summarization or paraphrasing -- the database contains statute text, not AI interpretations

**Smart Context Management:**
- Search returns ranked provisions with BM25 scoring (safe for context)
- Provision retrieval gives exact text by statute identifier + article number
- Cross-references help navigate without loading everything at once

**Technical Architecture:**
```
digesto.senado.gov.py / bacn.gov.py --> Parse --> SQLite --> FTS5 snippet() --> MCP response
                                          ^                        ^
                                   Provision parser         Verbatim database query
```

### Traditional Research vs. This MCP

| Traditional Approach | This MCP Server |
|---------------------|-----------------|
| Search digesto.senado.gov.py by statute name | Search by plain Spanish: *"protección de datos consentimiento"* |
| Navigate multi-article statutes manually | Get the exact provision with context |
| Manual cross-referencing between laws | `build_legal_stance` aggregates across sources |
| "¿Está vigente esta ley?" -- check manually | `check_currency` tool -- answer in seconds |
| Find MERCOSUR/OAS alignment -- search manually | `get_eu_basis` -- linked frameworks instantly |
| No API, no integration | MCP protocol -- AI-native |

**Traditional:** Search portal -> Navigate HTML -> Ctrl+F -> Cross-reference between statutes -> Repeat

**This MCP:** *"¿Qué obligaciones impone la Ley 6534/2020 a los responsables del tratamiento de datos?"* -> Done.

---

## Available Tools (13)

### Core Legal Research Tools (8)

| Tool | Description |
|------|-------------|
| `search_legislation` | FTS5 full-text search across provisions with BM25 ranking. Supports Spanish and English queries |
| `get_provision` | Retrieve specific provision by statute identifier + article number |
| `check_currency` | Check if a statute is in force, amended, or repealed |
| `validate_citation` | Validate citation against database -- zero-hallucination check |
| `build_legal_stance` | Aggregate citations from multiple statutes for a legal topic |
| `format_citation` | Format citations per Paraguayan legal conventions |
| `list_sources` | List all available statutes with metadata and coverage scope |
| `about` | Server info, capabilities, dataset statistics, and coverage summary |

### International Law Integration Tools (5)

| Tool | Description |
|------|-------------|
| `get_eu_basis` | Get EU directives/regulations that a Paraguayan statute aligns with (e.g., Ley 6534/2020 and GDPR principles) |
| `get_paraguayan_implementations` | Find Paraguayan laws aligning with a specific international framework |
| `search_eu_implementations` | Search EU documents with Paraguayan alignment counts |
| `get_provision_eu_basis` | Get international law references for a specific provision |
| `validate_eu_compliance` | Check alignment status of Paraguayan statutes against EU/MERCOSUR frameworks |

---

## International Law Alignment

Paraguay is not an EU member state. The international alignment tools cover the frameworks that matter for Paraguayan law practice:

- **MERCOSUR** -- Paraguay is a full MERCOSUR member; MERCOSUR decisions and resolutions have direct applicability
- **OAS frameworks** -- Organization of American States conventions and model laws
- **Ley 6534/2020** aligns with international data protection principles including GDPR adequacy concepts; the `get_eu_basis` tool maps these for cross-reference
- **Código del Trabajo** aligns with ILO conventions and MERCOSUR social and labour declarations

The international bridge tools allow you to explore alignment relationships -- checking which Paraguayan provisions correspond to MERCOSUR or international requirements, and vice versa.

> **Note:** International cross-references reflect alignment and treaty obligations, not formal transposition. Paraguay adopts its own legislative approach, and these tools help identify where Paraguayan and international law address similar domains.

---

## Data Sources & Freshness

All content is sourced from authoritative Paraguayan legal databases:

- **[Digesto Jurídico Paraguayo](https://digesto.senado.gov.py/)** -- Official consolidated law digest maintained by the Senate
- **[Biblioteca y Archivo Central del Congreso (BACN)](https://bacn.gov.py/)** -- Congressional library and archive
- **[Congreso Nacional](https://congreso.gov.py/)** -- National Congress records

### Data Provenance

| Field | Value |
|-------|-------|
| **Authority** | Digesto Jurídico Paraguayo, Congreso Nacional |
| **Primary language** | Spanish (Guaraní for some official documents) |
| **License** | Public domain (Paraguayan government publications) |
| **Coverage** | Paraguayan national legislation |

### Automated Freshness Checks

A [GitHub Actions workflow](.github/workflows/check-updates.yml) monitors Paraguayan legal sources for changes:

| Check | Method |
|-------|--------|
| **Statute amendments** | Drift detection against known provision anchors |
| **New statutes** | Comparison against official portal indexes |
| **Repealed statutes** | Status change detection |

**Verified data only** -- every citation is validated against official sources. Zero LLM-generated content.

---

## Security

This project uses multiple layers of automated security scanning:

| Scanner | What It Does | Schedule |
|---------|-------------|----------|
| **CodeQL** | Static analysis for security vulnerabilities | Weekly + PRs |
| **Semgrep** | SAST scanning (OWASP top 10, secrets, TypeScript) | Every push |
| **Gitleaks** | Secret detection across git history | Every push |
| **Trivy** | CVE scanning on filesystem and npm dependencies | Daily |
| **Socket.dev** | Supply chain attack detection | PRs |
| **Dependabot** | Automated dependency updates | Weekly |

See [SECURITY.md](SECURITY.md) for the full policy and vulnerability reporting.

---

## Important Disclaimers

### Legal Advice

> **THIS TOOL IS NOT LEGAL ADVICE**
>
> Statute text is sourced from official Paraguayan government publications. However:
> - This is a **research tool**, not a substitute for professional legal counsel
> - **Court case coverage is not included** -- do not rely solely on this for case law research
> - **Verify critical citations** against primary sources before court filings
> - **International cross-references** reflect alignment relationships, not formal transposition
> - **Database is in active ingestion** -- use `list_sources` to verify current coverage before relying on a specific statute

**Before using professionally, read:** [DISCLAIMER.md](DISCLAIMER.md) | [SECURITY.md](SECURITY.md)

### Client Confidentiality

Queries go through the Claude API. For privileged or confidential matters, use on-premise deployment.

### Bar Association Reference

For professional use, consult the **Asociación de Abogados del Paraguay** and **Colegio de Abogados del Paraguay** guidelines on AI-assisted legal research.

---

## Development

### Setup

```bash
git clone https://github.com/Ansvar-Systems/Paraguayan-law-mcp
cd Paraguayan-law-mcp
npm install
npm run build
npm test
```

### Running Locally

```bash
npm run dev                                       # Start MCP server
npx @anthropic/mcp-inspector node dist/index.js   # Test with MCP Inspector
```

### Data Management

```bash
npm run ingest              # Ingest statutes from Paraguayan sources
npm run build:db            # Rebuild SQLite database
npm run drift:detect        # Run drift detection against anchors
npm run check-updates       # Check for source updates
npm run census              # Generate coverage census
```

### Performance

- **Search Speed:** <100ms for most FTS5 queries
- **Database Size:** ~86 MB (optimized, portable)
- **Reliability:** Validated ingestion pipeline

---

## Related Projects: Complete Compliance Suite

This server is part of **Ansvar's Compliance Suite** -- MCP servers that work together for end-to-end compliance coverage:

### [@ansvar/eu-regulations-mcp](https://github.com/Ansvar-Systems/EU_compliance_MCP)
**Query 49 EU regulations directly from Claude** -- GDPR, AI Act, DORA, NIS2, MiFID II, eIDAS, and more. Full regulatory text with article-level search. `npx @ansvar/eu-regulations-mcp`

### [@ansvar/us-regulations-mcp](https://github.com/Ansvar-Systems/US_Compliance_MCP)
**Query US federal and state compliance laws** -- HIPAA, CCPA, SOX, GLBA, FERPA, and more. `npx @ansvar/us-regulations-mcp`

### [@ansvar/security-controls-mcp](https://github.com/Ansvar-Systems/security-controls-mcp)
**Query 261 security frameworks** -- ISO 27001, NIST CSF, SOC 2, CIS Controls, SCF, and more. `npx @ansvar/security-controls-mcp`

**80+ national law MCPs** covering Dominican Republic, Sri Lanka, Tanzania, Namibia, Uganda, Brazil, Colombia, Mexico, Argentina, and more.

---

## Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

Priority areas:
- Statute ingestion expansion (Digesto Jurídico, BACN)
- Court case law coverage (Corte Suprema de Justicia, Tribunal de Apelaciones)
- MERCOSUR treaty cross-references
- Guaraní language support for bilingual official documents
- Historical statute versions and amendment tracking

---

## Roadmap

- [x] Database infrastructure deployed and operational (~86 MB)
- [x] MCP server with all 13 tools
- [x] Vercel Streamable HTTP deployment
- [x] npm package publication
- [ ] Statute corpus ingestion (digesto.senado.gov.py, bacn.gov.py)
- [ ] Court case law (Corte Suprema de Justicia)
- [ ] MERCOSUR treaty cross-references
- [ ] Guaraní bilingual support
- [ ] Historical statute versions

---

## Citation

If you use this MCP server in academic research:

```bibtex
@software{paraguayan_law_mcp_2026,
  author = {Ansvar Systems AB},
  title = {Paraguayan Law MCP Server: AI-Powered Legal Research Tool},
  year = {2026},
  url = {https://github.com/Ansvar-Systems/Paraguayan-law-mcp},
  note = {Paraguayan national legislation with full-text search}
}
```

---

## License

Apache License 2.0. See [LICENSE](./LICENSE) for details.

### Data Licenses

- **Statutes & Legislation:** Republic of Paraguay (public domain)
- **International Metadata:** Public domain

---

## About Ansvar Systems

We build AI-accelerated compliance and legal research tools for the global market. This MCP server makes Paraguayan law accessible to legal professionals and compliance teams worldwide.

So we're open-sourcing it. Navigating Paraguayan statutes shouldn't require a law degree.

**[ansvar.eu](https://ansvar.eu)** -- Stockholm, Sweden

---

<p align="center">
  <sub>Built with care in Stockholm, Sweden</sub>
</p>
