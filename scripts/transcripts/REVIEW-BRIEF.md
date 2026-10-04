# Transcript review brief (one episode per reviewer)

You are preparing a podcast transcript for the host to approve before it is published on the show's website.
The transcript was produced automatically (Whisper large-v3). Your job is to annotate it, NOT to rewrite it.

Show: **The CX Algorithm** podcast, hosted by **Dr Eslam Afifi** (customer experience, data and AI).

## Input
- `seg/NN.txt`: one line per segment: `<index> [m:ss] text`. Header lines start with `#`.
- The episode's own notes from the podcast feed are given in your task message (for names, topics and spellings).

## Output
Write **exactly one file**, `review/NN.json` (UTF-8, valid JSON), with this shape:

```json
{
  "guestShortName": "Kate",
  "turns": [ { "from": 0, "speaker": "host" }, { "from": 14, "speaker": "guest" } ],
  "fixes": [ { "from": "Islam Afifi", "to": "Eslam Afifi", "why": "host's name" } ],
  "chapters": [ { "t": 0, "title": "Welcome and introductions" } ],
  "unsure": [ { "i": 123, "text": "the exact words", "why": "possibly misheard: 'servicescape'?" } ],
  "notes": "One or two sentences for the host, if anything needs their attention."
}
```

### turns (who is speaking)
- `speaker` is `"host"` (Dr Eslam Afifi) or `"guest"`. List an entry only where the speaker CHANGES, using the index of the first segment the new speaker says. Start with index 0.
- The host opens and closes the show, introduces the guest, asks the questions and makes short reactions; the guest gives the long answers. Read for meaning (questions vs answers, "you"/"I" references, someone thanking the other by name).
- If one segment holds both voices, give it to whoever says most of it.
- Be careful and consistent: a wrong speaker label is very visible to readers.
- If an episode has more than one guest or a different structure, say so in `notes` and use "guest" for all guests.

### fixes (misheard names and terms only)
- ONLY for clearly misheard proper nouns or technical terms: names of people, companies, places, the show ("The CX Algorithm"), acronyms (CX, NPS, AI). Use the feed notes to check spellings.
- `from` must be an exact, case-sensitive substring that appears in the transcript; it is replaced everywhere. Keep each `from` specific enough not to hit other words (e.g. "Islam Afifi", not "Islam").
- Never fix grammar, filler words, false starts or style. Never paraphrase. When unsure, use `unsure` instead.

### chapters
- 5 to 9 chapters covering the whole episode. `t` = the start time in seconds of the segment where the topic begins (convert the [m:ss] stamp; the first chapter is t = 0).
- Titles: 3–7 words, sentence case, specific to what is discussed (e.g. "Why friction can be good design"), no clickbait, no emojis, never the word "weekly".

### unsure
- Machine-transcription glitches: a phrase repeated over and over, a segment that doesn't fit the conversation at all, or a list of names nobody would say. Flag each with its segment index (they are cut or re-checked before publishing).
- Words that look misheard but you can't confirm, anything that could embarrass the host or guest if published (e.g. a phone number or email read out, a remark about a named third party), and anything that sounds like it should be cut. Give the segment index and exact words.

Finally, reply with a 2–3 line summary: number of speaker turns, fixes, chapters and unsure items.
