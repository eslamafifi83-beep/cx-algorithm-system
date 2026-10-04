# Episode transcripts pipeline

How the transcripts, chapters, takeaways, guest quotes and resources for Episodes 01–08 were made (Oct 2026).
For a new episode, run the same steps. Local only: `scripts/` is in `.vercelignore` and never deployed.
Generated folders (`audio/`, `raw/`, `seg/`, `punct/`, `review/`, `drafts/`, `extras/`) and `.venv/` stay out of git.

## Setup (once per machine)

- NVIDIA GPU with CUDA. Python venv in this folder:
  `python -m venv .venv` then `.venv\Scripts\pip install faster-whisper "av<14" nvidia-cublas-cu12 nvidia-cudnn-cu12`
  (PyAV 14+ breaks faster-whisper here; pin `av<14`.)
- Node 18+.

## Steps

1. `node download.js` — reads the podcast feed (`lib/podcast-feed.js`), downloads the MP3s to `audio/`, writes `manifest.json`
   (title, number, Spotify id `sid`, guest, company, role). Add the guest/company/role for the new episode by hand.
2. `.venv\Scripts\python transcribe.py [n]` — faster-whisper large-v3 on CUDA → `raw/<n>.json`.
   **Never use `hotwords`** (it leaked name lists into the text and dropped minutes of audio).
   Uses `word_timestamps` and `hallucination_silence_threshold`.
3. `node prep.js` — splits each raw transcript into `seg/` chunks for the review agents.
4. Agents (one per episode, see `REVIEW-BRIEF.md` and `PUNCT-BRIEF.md`):
   review agents list name/term fixes into `review/<n>.json`; punctuation agents restore punctuation and
   capitals into `punct/<n>.json`. Punctuation is accepted per segment **only if the words are identical**.
5. `node build.js [n]` — merges raw + punct + review into `drafts/<n>.json`: removes doubled words at segment
   joins, applies **whole-word** fixes only, groups paragraphs, builds chapters.
6. `node make-review.js` — builds `transcript-review.html` from `review-template.html`; publish it as an
   artifact with a `db` collection `review` so the host can approve or comment per episode.
7. `node publish.js 09` — copies the APPROVED draft into `transcripts/<sid>.json` (paragraphs + chapters).
8. Notes agents (`NOTES-BRIEF.md`) write `extras/<n>.json`; `node merge-extras.js` adds 5–7 takeaways, the guest
   quote (must be the guest's exact words), and resources (each URL must load) to `transcripts/<sid>.json`.
   Never write "weekly".
9. Commit and push. The episode page shows the transcript, and the episode-meta cache key in the admin fill
   button (`/api/episode-meta?v=N`) may need a bump if old data sticks.

Paths in the scripts were written for the original session folder; adjust `REPO`/folder constants if needed.
