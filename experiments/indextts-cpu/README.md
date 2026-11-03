# IndexTTS2 CPU execution

Reuses existing pinned IndexTTS2 weights, speaker/emotion references, approved rhythm adapter and finite-logit observer. No GPU endpoint is started; GPU/Wan STOP records remain in place. No model-source, shared-environment, dependency or driver changes.

The production defaults select CPU/FP32. The existing CLI calls `orchestrator/src/production/voice-runtime.py` → `cpu-voice.py` → this runner with a JSON request. Set machine paths through ignored `orchestrator/config/production.local.json` or the documented TTS environment variables. CPU requests do not depend on the historical episode's configuration; unknown/GPU execution fails closed without fallback.

Actual first short trial (completed; do not rerun):

```bash
python3 experiments/indextts-cpu/run.py --out orchestrator/output/indextts-cpu/20261103-short-01
```

Actual complete-narration run for the current episode (check its exit/validation before reuse; do not repeat):

```bash
python3 experiments/indextts-cpu/run.py \
  --episode orchestrator/output/ai-programming-20261102/preparation/script.normalized.json \
  --out orchestrator/output/ai-programming-20261102/tts-cpu-full-20261103
```

The legacy `--episode` convenience selector is scoped to this episode and its external-audio shot9. Generic production uses `--request`, not the episode selector. Each output directory is single-use; rerunning refuses overwrite. The production adapter additionally verifies input/config/source fingerprint and output SHA before reusing completed work. Started/failed attempts require review; no automatic retry or GPU fallback.

- Child uses existing TTS venv, explicit CPU/FP32, `CUDA_VISIBLE_DEVICES=-1`, local-only weights, no acceleration/compile/custom CUDA kernels/QwenEmotion. A CUDA-enabled wheel name does not mean execution on GPU.
- Reuses the distinct-callable CUDA init denial from the existing recovery CPU guard; does not edit Dynamo/PyTorch internals. Audits six model modules' parameter/buffer devices, saves initialization/guard results.
- 8 CPU threads, child nice10, at least40GiB available RAM, sampled child RSS cap32GiB. Short run timeout600s; full narration/production default3600s. Logs CPU process RSS every5s. Sampled RSS is not exact OS high-water mark.
- Verifies source revision,14 model asset hashes, references and adapter. One synthesis call, unbuffered stdout/stderr and fsynced stages; failure preserves STOP and artifacts.
- Seed42, emotion0.6, beam3, top_p0.8/top_k30, temperature0.8, repetition10.0/max_mel1500 unchanged. Voice text always comes from frozen source/rhythm; ASR never rewrites it.
- Outputs audio, validation, actual rhythm audit, device audit, guard results, run/exit and full logs. `executed-run.py` beside the historical short/full output preserves the exact started source when later wiring changes are made.
- No Windows GPU telemetry process starts: that would query the stopped GPU. CPU process/RAM only.
- WAV numeric/software decode and text/boundary checks do not certify voice similarity/naturalness or GPU hardware health. Holder listening required. No automatic publishing or video render.

Local reference audio/weights and generated audio remain ignored private files; no upload or commit.
