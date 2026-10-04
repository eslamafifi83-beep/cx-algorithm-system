# Punctuation & capitalisation brief (one episode per worker)

A podcast transcript was produced automatically. Parts of it have no capital letters or punctuation.
Your only job is to restore **capitalisation and punctuation**. You must not change any word.

Show: **The CX Algorithm** podcast, hosted by **Dr Eslam Afifi**.

## Input
`seg/NN.txt`: one line per segment, `<index> [m:ss] text` (header lines start with `#`). Also read `notes/NN.txt` for the guest's name, company and the topic (for capitalising proper nouns).

## Output
Write exactly one file, `punct/NN.json`: a JSON array with **one entry for every segment, in order**:

```json
[ { "i": 0, "text": "Welcome to another episode of The CX Algorithm podcast." }, { "i": 1, "text": "..." } ]
```

## Rules (checked by a program; any segment that breaks them is thrown away)
- Change ONLY letter case and punctuation marks ( . , ? ! ; : — – - ' " ( ) ).
- Never add, remove, reorder, merge, split or respell a word. Keep filler words ("um", "you know", "like") and false starts exactly as they are. Keep repeated words.
- Keep every word in its own segment. A sentence may run across segment lines; end a segment without a full stop if the sentence continues.
- Capitalise: the first word of each sentence; "I"; names of people, companies, places, products and programmes; acronyms (CX, AI, ROI, NPS, UX, D2C, HR, CEO, MBA, IE).
- Leave segments that are already well punctuated unchanged.
- Don't fix misheard names (that's done elsewhere); just capitalise them.

Check before finishing: the file parses as JSON, has one entry per segment index, and for each segment
`text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()` is identical for your text and the original.
A quick way: write a small node script that loads both and compares, then fix any mismatch.

Reply with one line: how many segments you changed and confirmation that the check passed.
