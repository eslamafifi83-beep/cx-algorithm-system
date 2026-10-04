# Episode page extras brief (one episode per writer)

The CX Algorithm podcast (host: Dr Eslam Afifi) has an approved transcript for each episode. You will write the
missing parts of the episode's web page from it. Everything you write is published on thecxalgorithm.com, so it
must be accurate to what was actually said.

## Input
- `drafts/NN.json`: the approved transcript: `paragraphs: [{t (seconds), speaker, text}]` ("Eslam" is the host; the other name is the guest), plus `chapters`.
- `notes/NN.txt`: the episode's own notes from the podcast feed (written by the host), for names, spellings and framing.

## Output
Write exactly one file, `extras/NN.json` (valid JSON, UTF-8):

```json
{
  "takeaways": ["Why ease of doing business is the foundation, not a nice-to-have", "..."],
  "quote": { "text": "the guest's exact words", "t": 812 },
  "resources": [ { "label": "Erik Brynjolfsson's research on AI and productivity", "url": "https://...", "note": "Mentioned when..." } ]
}
```

### takeaways ("What you'll learn" on the page)
- 5 to 7 items, each one line (max ~14 words), specific to THIS conversation: an idea, argument, example or method the guest or host actually explains. No generic filler ("the importance of CX").
- Phrase them the way the feed notes do, e.g. "Why X ...", "How to ...", "What ... looks like in practice". British spelling (optimisation, centred, behaviour). Never the word "weekly". No emojis, no trailing full stops.
- If the feed notes already contain a "what you'll learn" list, still write your own list from the transcript (it is used only where the feed has none), but keep it consistent with the feed's framing.

### quote (the guest pull-quote card)
- One memorable line said by the GUEST (not the host), 12 to 40 words, that captures the episode's big idea and stands on its own.
- It MUST be an exact contiguous excerpt of one of the guest's paragraphs in `drafts/NN.json` (you may only drop leading/trailing filler words like "So," "And," "I think" and capitalise the first letter; do not change, add or remove any word in the middle). Avoid lines with obvious transcription errors.
- `t` = that paragraph's `t`.

### resources ("Resources mentioned")
- 0 to 6 items: books, research, studies, frameworks, people's work, organisations, tools or programmes that are actually named or clearly referenced in the conversation and that a listener might want to look up. Include the guest's company. Do not invent things that weren't mentioned.
- `label`: what it is, in plain words. `note`: one short line on where/why it came up (max ~16 words).
- `url`: ONLY if you are certain of the canonical address (an organisation's official home page, a well-known Wikipedia article, an official product page). Otherwise omit `url` entirely. Never guess deep links, DOIs or article URLs. Every URL will be checked and dropped if it doesn't load.

Check before finishing: the file parses as JSON; the quote's text appears in the guest's paragraph at `t` (compare lower-cased, punctuation-stripped); takeaways count is 5–7. Reply with one line listing the quote and the resource labels.
