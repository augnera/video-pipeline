# Asset / AssetMatch Contract v0.1

Internal JSON files only. `asset-v0.1.schema.json` validates asset identity, origin, measured media metadata, rights evidence and actual frame analysis. `asset-match-v0.1.schema.json` links reusable asset IDs to projects/episodes/shots. Day9 business fields belong only in matches or sample timelines. Unknown data remains null/empty; image duration/fps and video segments are null/empty.

`sourceType` preserves original acquisition: downloaded stock remains `web_stock`. A SHA-256 identifies the same bytes; duplicate bytes are reused through one asset ID. Perceptually similar encodes are not automatically deduplicated. `description/actions/analysis.facts` describe observed content. `mood/analysis.inferences` are interpretations, explicitly marked as such. Every analysis stores model/time and hashed input frames. Current PoC uses the Codex session's actual image-view capability; this is not an unattended HTTP video-understanding service.

License status requires item-specific evidence; it never derives from site name. Individual creator is null if not exposed; publisher is not author. `generation` retains available model/prompt/parameters, without inventing seeds or versions.

The catalog is experimental staging. `pending_human` cannot enter a formal library; `formal_library_eligible()` also requires verified local-use license scope. This helper does not authorize publication. Match `proposed` is not human approval; `rejected` preserves the negative match reason. A missing asset is a separate gap, never a fabricated asset entry.

Validation uses already-installed Python `jsonschema` (no dependency installation). It adds bounds/reference/SHA-dedup checks beyond JSON Schema.

```bash
python3 orchestrator/contracts/validate_assets.py orchestrator/output/day9-vp006-poc/asset-catalog.json orchestrator/output/day9-vp006-poc/asset-matches.json
python3 -m unittest discover -s orchestrator/contracts -p 'test_contracts.py' -v
```

Real examples: `orchestrator/output/day9-vp006-poc/asset-catalog.json` and `asset-matches.json`. Separate discovery gaps include absent user video; no placeholder Asset is invented.
