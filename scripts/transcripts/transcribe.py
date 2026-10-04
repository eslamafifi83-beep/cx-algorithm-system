"""Transcribe each episode MP3 (manifest.json) with faster-whisper large-v3 on the GPU.
Writes raw/<n>.json: {n, sid, title, guest, language, duration, segments:[{start,end,text}]}.
Already-finished episodes are skipped, so it can be re-run after an interruption."""
import json
import os
import sys
import time

# The CUDA libraries come from the nvidia-* pip packages; make Windows find their DLLs.
NV = os.path.join(sys.prefix, "Lib", "site-packages", "nvidia")
for sub in ("cublas", "cudnn", "cuda_nvrtc"):
    d = os.path.join(NV, sub, "bin")
    if os.path.isdir(d):
        os.add_dll_directory(d)
        os.environ["PATH"] = d + os.pathsep + os.environ.get("PATH", "")

from faster_whisper import WhisperModel  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
os.makedirs(os.path.join(HERE, "raw"), exist_ok=True)
manifest = json.load(open(os.path.join(HERE, "manifest.json"), encoding="utf-8"))
only = set(sys.argv[1:])  # optional: episode numbers to (re)do

t0 = time.time()
model = WhisperModel("large-v3", device="cuda", compute_type="float16")
print(f"model loaded in {time.time() - t0:.0f}s", flush=True)

for ep in sorted(manifest, key=lambda e: e["n"]):
    if only and str(ep["n"]) not in only:
        continue
    out = os.path.join(HERE, "raw", f"{ep['n']:02d}.json")
    if os.path.exists(out) and not only:
        print(f"EP{ep['n']:02d} already done", flush=True)
        continue
    names = ["Eslam Afifi", "The CX Algorithm"] + [x for x in (ep.get("guest"), ep.get("company")) if x]
    # The guest's first name alone is how the host usually addresses them
    if ep.get("guest"):
        first = [w for w in ep["guest"].replace("(", " ").replace(")", " ").split() if w not in ("Dr", "Prof", "Dr.", "Prof.")]
        if first:
            names.append(first[0])
    prompt = (f"Welcome to The CX Algorithm, the podcast hosted by Dr Eslam Afifi. "
              f"Today's guest is {ep.get('guest') or 'a CX leader'}{', ' + ep['role'] if ep.get('role') else ''}"
              f"{' at ' + ep['company'] if ep.get('company') else ''}. We talk about customer experience, CX, data and AI.")
    t = time.time()
    # No `hotwords`: they leaked into the output as name lists in place of real speech (first run).
    # The prompt only steers the opening; name spellings are fixed in review instead.
    segments, info = model.transcribe(
        ep["file"], language="en", beam_size=5, vad_filter=True,
        vad_parameters={"min_silence_duration_ms": 500},
        initial_prompt=prompt,
        condition_on_previous_text=False,
        word_timestamps=True, hallucination_silence_threshold=2.0,
    )
    segs = [{"start": round(s.start, 2), "end": round(s.end, 2), "text": s.text.strip()} for s in segments]
    json.dump({"n": ep["n"], "sid": ep.get("sid"), "title": ep["title"], "guest": ep.get("guest"),
               "language": info.language, "duration": round(info.duration, 1), "segments": segs},
              open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    words = sum(len(s["text"].split()) for s in segs)
    print(f"EP{ep['n']:02d} done: {len(segs)} segments, {words} words, audio {info.duration / 60:.0f} min in {time.time() - t:.0f}s", flush=True)

print(f"all done in {(time.time() - t0) / 60:.1f} min", flush=True)
