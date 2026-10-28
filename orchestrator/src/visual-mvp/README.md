# VP-007 local MVP

This is an explicit **rules-mode** file pipeline, not an LLM service or a general Agent platform. It reads the existing Day9 files and VP-006 Asset Contract v0.1 catalog. It does not download/index new material or start inference models.

From `orchestrator/`:

```bash
# New output directory: plan → match → finalize → render → mix both gains → gate → at most one safe repair per rule → recheck
npm run mvp:visual -- --out orchestrator/output/day9-vp007-new-run

# Re-evaluate an existing result; reuses verified evidence and only repairs safe faults if needed
npm run mvp:visual -- --quality-only

# Unit tests
npm run test:visual-mvp

# Optional isolated media-repair integration test, after producing the default Day9 output
node --import tsx src/visual-mvp/quality-smoke.ts
```

Paths passed to `--out` and config inputs are relative to the repository root. Completed media is never overwritten by a fresh normal build. `--resume` continues interrupted, incomplete output only if its protected input hashes remain unchanged. Internal `--repair-render` / `--repair-audio` modes are called by the gate; they retain the serialized brief/proposal, verify asset/meaning/time identities and keep before-repair media/config evidence.

`orchestrator/config/visual-mvp.json` holds business inputs and thresholds. `core.ts` has no fixed episode offsets or shot numbers: it ranks contiguous windows, parses supported action/advice grammar, matches observed metadata facts and resolves source intervals from existing facts/usableSegments. The current grammar/templates are deliberately narrow. Unsupported content or unavailable permitted assets produces a gap, never an unrelated card.

Three role boundaries are actual serialized JSON reads: `visual-brief.json` → `asset-proposal.json` → `timeline.json`. The renderer stages assets by SHA, reads the generated timeline, and receives titles/audio/subtitles from that data. The original catalog and schemas are not rewritten; pending review is not formal-library approval.

The environment currently has no configured callable LLM/vision endpoint. `modelUsed=null` and `mode=rules` remain in outputs. Existing catalog visual facts retain their historical analysis provenance. Interactive Codex preview inspection is not counted as automated model inference.

`quality-rules.json` defines VQ-01–08. `quality.ts` separates deterministic evidence from unperformed model/human checks. `quality-run.ts` compares actual encoded transition frames against same-clock hard-cut controls, measures the known template's pixel bounds, and records optional safe repairs. Each rule has at most one automatic attempt per output. Asset replacement, semantic changes and licensing gaps go to the manual gate. `NOT_EVALUATED` never counts as PASS.

The gate uses installed Remotion/FFmpeg and the existing schema files. The v0.1 schema validator uses the installed experiment AJV6 for the current common draft-07 keyword subset; this is not full support for future draft-2020 features. No dependency installation or upgrade is needed in the existing workspace.

No automatic publishing is implemented or authorized. All results are private audition artifacts; BGM rights and AI disclosure review remain separate from decorative badge switches.
