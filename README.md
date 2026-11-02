# Fascia Academy

A free course on fascia, elastic movement and how the greatest athletes really move.
Live at https://fascia-academy.netlify.app

## How it works

- `content/modules/*.json`: one file per module (lessons, embedded YouTube videos, sources).
- `content/site.json`: site name, title, the Fascia Theory / Fascia Training sections and which modules each holds, featured creators.
- `content/home.md`: the story on the homepage (About).
- `content/about.md`: Josh's story (served at `/story/`).
- `static/hero3d.js`: the rotating, see-through 3D figure with the fascial lines and nervous system (Three.js). The body is the CC0 "3D Male Base Mesh" by orange-juice-games (`static/models/body.glb`, via github.com/BoQsc/Godot-Male-Base-Mesh), smoothed in the browser with three-subdivide.
- `build.py` turns the content into a static site in `dist/`. Netlify runs it on every push.

```bash
pip install -r requirements.txt
python build.py
```

## Editorial files

- `QUESTIONS_FOR_JOSH.md`: open questions from the research agents.
- `FACT_CHECK_LOG.md`: every correction the fact-checking agents made.
