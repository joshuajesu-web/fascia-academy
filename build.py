#!/usr/bin/env python3
"""Static site builder for the course.

Reads content/site.json, content/home.md, content/about.md and
content/modules/*.json, writes a fully static site to dist/.
No server, no database, free to host.
"""
import hashlib
import html
import json
import re
import shutil
from pathlib import Path

import markdown

ROOT = Path(__file__).parent
CONTENT = ROOT / "content"
STATIC = ROOT / "static"
DIST = ROOT / "dist"

SITE = json.loads((CONTENT / "site.json").read_text())


def asset_version(name):
    """Short content hash, so browsers fetch a fresh copy whenever the file changes."""
    return hashlib.sha1((STATIC / name).read_bytes()).hexdigest()[:10]


def md(text):
    return markdown.markdown(text or "", extensions=["extra", "sane_lists", "smarty"])


def esc(text):
    return html.escape(text or "", quote=True)


def load_modules():
    modules = []
    for path in sorted((CONTENT / "modules").glob("*.json")):
        mod = json.loads(path.read_text())
        modules.append(mod)
    modules.sort(key=lambda m: m["module_number"])
    return modules


THREE = "https://cdn.jsdelivr.net/npm/three@0.160.0"


def section_of(mod):
    return next((s for s in SITE["sections"] if mod["module_number"] in s["modules"]), SITE["sections"][0])


def page(title, body, *, description="", path="", depth=0, body_class="", active="", head=""):
    """Wrap a page body in the shared layout. depth = number of path segments, for relative links."""
    base = "../" * depth
    full_title = f"{title} · {SITE['name']}" if title != SITE["name"] else f"{SITE['name']} · {SITE['title']}"
    links = [("about", "About", "index.html")] + [(s["slug"], s["nav"], f"{s['slug']}/index.html") for s in SITE["sections"]]
    nav = "".join(
        f'<a href="{base}{href}"{" aria-current=\"page\"" if key == active else ""}>{esc(label)}</a>' for key, label, href in links
    )
    desc = esc(description or SITE["description"])
    url = SITE["url"].rstrip("/") + "/" + path
    og_image = SITE["url"].rstrip("/") + "/static/og.png"
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{esc(full_title)}</title>
<meta name="description" content="{desc}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="{esc(SITE['name'])}">
<meta property="og:title" content="{esc(title)}">
<meta property="og:description" content="{desc}">
<meta property="og:url" content="{esc(url)}">
<meta property="og:image" content="{esc(og_image)}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="{base}static/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="{base}static/style.css?v={asset_version('style.css')}">
{head}
</head>
<body class="{body_class}">
<header class="nav">
  <a class="brand" href="{base}index.html"><span class="mark" aria-hidden="true"></span>{esc(SITE['name'])}</a>
  <nav>{nav}</nav>
</header>
<main>
{body}
</main>
<footer class="foot">
  <p><strong>{esc(SITE['name'])}</strong> is free, forever. Built by {esc(SITE['author'])}.</p>
  <p class="small">This course is education, not medical advice. If you have an injury or a medical condition, check with a qualified professional before starting a new training practice. Videos are embedded from their creators on YouTube; all credit and rights belong to them.</p>
</footer>
<script src="{base}static/app.js?v={asset_version('app.js')}"></script>
</body>
</html>
"""


def lesson_url(mod, lesson):
    return f"course/{mod['slug']}/{lesson['slug']}/index.html"


def video_embed(v):
    vid = esc(v["video_id"])
    params = ["rel=0", "modestbranding=1"]
    if v.get("start_s") is not None:
        params.append(f"start={int(v['start_s'])}")
    if v.get("end_s") is not None:
        params.append(f"end={int(v['end_s'])}")
    src = f"https://www.youtube-nocookie.com/embed/{vid}?{'&amp;'.join(params)}&amp;autoplay=1"
    clip = ""
    if v.get("start_s") is not None:
        s = int(v["start_s"])
        clip = f'<span class="clip">Clip from {s // 60}:{s % 60:02d}</span>'
    return f"""<figure class="video">
  <button class="yt" data-src="{src}" aria-label="Play: {esc(v['title'])}">
    <img src="https://i.ytimg.com/vi/{vid}/hqdefault.jpg" alt="" loading="lazy">
    <span class="play" aria-hidden="true"></span>
  </button>
  <figcaption><strong>{esc(v['title'])}</strong> <span class="by">— {esc(v['channel'])}</span>{clip}<br><span class="why">{esc(v.get('why', ''))}</span></figcaption>
</figure>"""


def render_lesson(mod, lesson, prev_l, next_l, idx):
    videos = "\n".join(video_embed(v) for v in lesson.get("videos", []))
    takeaways = "".join(f"<li>{esc(t)}</li>" for t in lesson.get("key_takeaways", []))
    sources = "".join(
        f'<li><a href="{esc(s["url"])}" rel="noopener" target="_blank">{esc(s["title"])}</a> <span class="kind">{esc(s.get("kind", ""))}</span></li>'
        for s in lesson.get("sources", [])
    )
    key = f"{mod['slug']}/{lesson['slug']}"
    sec = section_of(mod)

    def nav_link(target, label, cls):
        if not target:
            return f'<span class="{cls}"></span>'
        m, l = target
        return f'<a class="{cls}" href="../../../{lesson_url(m, l)}"><small>{label}</small>{esc(l["title"])}</a>'

    body = f"""
<article class="lesson" data-lesson="{esc(key)}">
  <div class="crumbs"><a href="../../../{sec['slug']}/index.html">{esc(sec['title'])}</a> / <a href="../index.html">Module {mod['module_number']}: {esc(mod['title'])}</a></div>
  <h1>{esc(lesson['title'])}</h1>
  <p class="meta">Lesson {idx + 1} · {int(lesson.get('duration_min', 10))} min</p>
  <p class="lede">{esc(lesson.get('summary', ''))}</p>
  {f'<section class="videos">{videos}</section>' if videos else ''}
  <div class="prose">{md(lesson['body_markdown'])}</div>
  {f'<aside class="takeaways"><h2>Key takeaways</h2><ul>{takeaways}</ul></aside>' if takeaways else ''}
  {f'<p class="evidence"><strong>The evidence:</strong> {esc(lesson["evidence_note"])}</p>' if lesson.get("evidence_note") else ''}
  <button class="done-btn" data-key="{esc(key)}">Mark lesson complete</button>
  {f'<details class="sources"><summary>Sources &amp; further reading</summary><ul>{sources}</ul></details>' if sources else ''}
  <nav class="pager">{nav_link(prev_l, '← Previous', 'prev')}{nav_link(next_l, 'Next →', 'next')}</nav>
</article>"""
    return page(lesson["title"], body, description=lesson.get("summary", ""), path=lesson_url(mod, lesson), depth=3, active=sec["slug"])


def render_module(mod):
    sec = section_of(mod)
    items = "".join(
        f"""<li><a href="{esc(l['slug'])}/index.html" data-key="{esc(mod['slug'])}/{esc(l['slug'])}">
  <span class="num">{i + 1:02d}</span>
  <span class="t"><strong>{esc(l['title'])}</strong><small>{esc(l.get('summary', ''))}</small></span>
  <span class="dur">{int(l.get('duration_min', 10))} min</span></a></li>"""
        for i, l in enumerate(mod["lessons"])
    )
    body = f"""
<section class="module-hero">
  <div class="crumbs"><a href="../../{sec['slug']}/index.html">{esc(sec['title'])}</a></div>
  <p class="eyebrow">Module {mod['module_number']}</p>
  <h1>{esc(mod['title'])}</h1>
  <p class="lede">{esc(mod['tagline'])}</p>
</section>
<div class="prose narrow">{md(mod['intro_markdown'])}</div>
<ol class="lesson-list">{items}</ol>"""
    return page(mod["title"], body, description=mod["tagline"], path=f"course/{mod['slug']}/index.html", depth=2, active=sec["slug"])


LINE_NAMES = [
    ("back", "Superficial Back Line"),
    ("front", "Superficial Front Line"),
    ("lateral", "Lateral Line"),
    ("spiral", "Spiral Line"),
    ("arm", "Arm Lines"),
]


def render_home():
    story = md((CONTENT / "home.md").read_text())
    legend = "".join(f'<button type="button" class="line-chip" data-line="{k}">{esc(label)}</button>' for k, label in LINE_NAMES)
    paths = "".join(
        f"""<a class="path" href="{esc(s['slug'])}/index.html">
  <span class="eyebrow">{esc(s['nav'])}</span>
  <h3>{esc(s['title'])} →</h3>
  <p>{esc(s['tagline'])}</p>
</a>"""
        for s in SITE["sections"]
    )
    head = f"""<script type="importmap">{{"imports":{{"three":"{THREE}/build/three.module.js","three/addons/":"{THREE}/examples/jsm/"}}}}</script>
<script type="module" src="static/hero3d.js?v={asset_version('hero3d.js')}"></script>"""
    body = f"""
<section class="landing">
  <div class="landing-copy">
    <p class="eyebrow">{esc(SITE['name'])} · A free course</p>
    <h1>{esc(SITE['title'])}</h1>
    <p class="lede">{esc(SITE['subtitle'])}</p>
    <div class="legend" aria-label="Fascial lines shown on the figure">
      <span class="legend-label">The fascial lines</span>
      {legend}
    </div>
    <a class="scroll-cue" href="#story">Read the story ↓</a>
  </div>
  <div id="body3d" class="body3d" data-model="static/models/body.glb" role="img"
       aria-label="A rotating 3D human figure with the main fascial lines traced over the body">
    <img class="poster" src="static/body-poster.png" alt="">
  </div>
</section>

<article id="story" class="story">{story}</article>

<section class="paths">
  <h2>Train the connections</h2>
  <p class="lede">The course is free. Pick a path.</p>
  <div class="path-row">{paths}</div>
</section>
"""
    return page(SITE["name"], body, path="index.html", depth=0, body_class="home", active="about", head=head)


def render_section(sec, modules):
    mods = [m for m in modules if m["module_number"] in sec["modules"]]
    total = sum(len(m["lessons"]) for m in mods)
    cards = "".join(
        f"""<a class="card" href="../course/{esc(m['slug'])}/index.html" data-module="{esc(m['slug'])}" data-count="{len(m['lessons'])}">
  <span class="eyebrow">Module {m['module_number']}</span>
  <h3>{esc(m['title'])}</h3>
  <p>{esc(m['tagline'])}</p>
  <span class="foot-row"><span>{len(m['lessons'])} lessons</span><span class="progress"><i></i></span></span>
</a>"""
        for m in mods
    )
    body = f"""
<section class="module-hero">
  <p class="eyebrow">{esc(SITE['name'])}</p>
  <h1>{esc(sec['title'])}</h1>
  <p class="lede">{esc(sec['tagline'])}</p>
</section>
<section class="modules">
  <p class="overall">Your progress: <span id="overall">0</span> of {total} lessons</p>
  <div class="grid">{cards or '<p class="overall">These modules are being written right now. Check back soon.</p>'}</div>
</section>
{render_creators() if sec.get("creators") else ""}
"""
    return page(sec["title"], body, description=sec["tagline"], path=f"{sec['slug']}/index.html", depth=1, active=sec["slug"])


def render_creators():
    creators = SITE.get("creators", [])
    if not creators:
        return ""
    cards = "".join(
        f"""<div class="creator">
  <span class="eyebrow">{esc(c.get('who', ''))}</span>
  <h3>{esc(c['name'])}</h3>
  <p>{esc(c['about'])}</p>
  {''.join(f'<a href="{esc(l["url"])}" target="_blank" rel="noopener">{esc(l["label"])} ↗</a>' for l in c.get('links', []))}
</div>"""
        for c in creators
    )
    return f"""<section class="creators">
  <h2>Learn from the source</h2>
  <p>This course stands on the work of these coaches. Follow them, watch their full videos, support what they do.</p>
  <div class="creator-row">{cards}</div>
</section>"""


def render_story():
    text = (CONTENT / "about.md").read_text()
    body = f'<article class="lesson about"><div class="prose">{md(text)}</div></article>'
    return page("Josh's story", body, description="Why I built a free course on fascia.", path="story/index.html", depth=1, active="about")


def write(rel, content):
    out = DIST / rel
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(content)


def main():
    if DIST.exists():
        shutil.rmtree(DIST)
    shutil.copytree(STATIC, DIST / "static")
    modules = load_modules()

    flat = [(m, l) for m in modules for l in m["lessons"]]
    for i, (m, l) in enumerate(flat):
        prev_l = flat[i - 1] if i > 0 else None
        next_l = flat[i + 1] if i + 1 < len(flat) else None
        idx = m["lessons"].index(l)
        write(lesson_url(m, l), render_lesson(m, l, prev_l, next_l, idx))
    for m in modules:
        write(f"course/{m['slug']}/index.html", render_module(m))
    for sec in SITE["sections"]:
        write(f"{sec['slug']}/index.html", render_section(sec, modules))
    write("index.html", render_home())
    write("story/index.html", render_story())
    write("404.html", page("Not found", '<section class="module-hero"><h1>Lost the line.</h1><p class="lede"><a href="/">Back to the start</a></p></section>'))
    print(f"Built {len(modules)} modules, {len(flat)} lessons -> {DIST}")


if __name__ == "__main__":
    main()
