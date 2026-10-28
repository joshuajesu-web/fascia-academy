# Fascia Academy

A free course on fascia, elastic movement and how the greatest athletes really move.
Live at https://fascia-academy.netlify.app

## How it works

- `content/modules/*.json`: one file per module (lessons, embedded YouTube videos, sources).
- `content/site.json`: site name, headline, featured creators.
- `content/about.md`: Josh's story.
- `build.py` turns the content into a static site in `dist/`. Netlify runs it on every push.

```bash
pip install -r requirements.txt
python build.py
```

## Editorial files

- `QUESTIONS_FOR_JOSH.md`: open questions from the research agents.
- `FACT_CHECK_LOG.md`: every correction the fact-checking agents made.
