# Coverage Index -- PY Law MCP

> Auto-generated from census data. Do not edit manually.
> Generated: 2026-02-28

## Source

| Field | Value |
|-------|-------|
| Authority | BACN (Biblioteca y Archivo Central del Congreso Nacional) |
| Portal | [bacn.gov.py](https://www.bacn.gov.py/leyes-paraguayas) |
| License | Government Open Data |
| Census date | 2026-02-28 |

## Summary

| Metric | Count |
|--------|-------|
| Total laws enumerated | 6,983 |
| Ingestable | 6,983 |
| Ingested | 600 |
| Excluded | 0 |
| Provisions extracted | 5,433 |
| Definitions extracted | 161 |
| **Coverage** | **8.6%** |

## Notes

- Census covers the full BACN corpus (6,983 laws discovered via paginated AJAX endpoint)
- First 600 laws ingested for initial database build (most recent laws first)
- Parser handles "Articulo N" format with chapter/title tracking
- Spanish-language articles parsed with accent and entity decoding
- Full ingestion of remaining 6,383 laws can be done with `npm run ingest`
- Resume support: re-running ingest skips already-processed laws
