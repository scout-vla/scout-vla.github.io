# Project Page

Source for an anonymized research project page, deployed with GitHub Pages.

See [AGENTS.md](AGENTS.md) for the contribution, anonymity and deployment rules.

## Run locally

The site is static (Bulma + jQuery). It needs no Node.js, build step, or
dependencies. From the repository root:

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000. Any static file server works; opening
`index.html` directly also mostly works, but a server matches how GitHub Pages
serves the site (videos in particular).

## Layout

```
index.html                  the whole page
static/css/index.css        site styles (Bulma is vendored in static/css/)
static/js/index.js          carousel, task tabs, video sync
static/images/              figures
static/videos/<task>/       <method>.mp4 + <method>.jpg poster
scripts/encode-videos.sh    re-encode raw videos for the web
.github/workflows/pages.yml anonymity scan on PRs, deploy on merge to main
```

Reusable template components (navbar, author blocks, extra buttons, slider,
two-column media, ...) stay in `index.html` with the Bulma `is-hidden` class.
Remove the class to show one.

## Videos

Raw videos are not committed. To re-encode them (requires `ffmpeg`):

```bash
scripts/encode-videos.sh /path/to/raw-videos
```

The raw folder holds one sub-folder per task with one file per method; the
script maps them to `static/videos/<task>/<method>.mp4`. Output is 1920x1080,
30 fps H.264 (CRF 18) with HDR converted to SDR, audio removed, and all metadata
(including GPS location) stripped.

## Anonymity check

Before opening a PR:

```bash
.github/scripts/stage-site.sh && .github/scripts/anon-scan.sh
```

This copies only the published files (`index.html`, `static/`) to `_site/` and
fails on identity terms from the local, gitignored `.anon-denylist`, on email
addresses, and on camera metadata in media files. CI runs the same check with
the `ANON_DENYLIST` repository secret.

# Website License
This website is adapted from the [Nerfies website](https://nerfies.github.io) ([source](https://github.com/nerfies/nerfies.github.io)).

<a rel="license" href="http://creativecommons.org/licenses/by-sa/4.0/"><img alt="Creative Commons License" style="border-width:0" src="https://i.creativecommons.org/l/by-sa/4.0/88x31.png" /></a><br />This work is licensed under a <a rel="license" href="http://creativecommons.org/licenses/by-sa/4.0/">Creative Commons Attribution-ShareAlike 4.0 International License</a>.
