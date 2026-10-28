# sqsp-media-wall

Columns of photos and videos that scroll on their own, in alternating directions,
for **Squarespace 7.1**. Built from native content (Auto Layout list, gallery
sections, image / video blocks). Can sit **above the site header** as an intro wall,
or inline in its own section.

- 3 columns by default (2 on phones); column 1 and 3 go up, column 2 goes down
- Each tile keeps the **uploaded aspect ratio** (photos and videos)
- Video: MP4 via a `video:` line or button file link, uploaded Video blocks (HLS), or a `<video>` in a code block
- Only on-screen videos play; motion stops when the wall is off screen
- Step motion (hold, then glide one tile with an eased snap) or continuous drift; optional video playback speed
- Tile links, off by default
- Scroll button to the nav + hero
- Respects reduced-motion; restores the source sections when the editor opens

See **[docs/INSTALL.md](docs/INSTALL.md)**. Local demo: `npx serve .` → `/demo/`
(`?mode=a` = list method, default = code-block method, `&header=fixed`).

## CDN
```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/swtldesignco/sqsp-media-wall@1/src/media-wall.css">
<script defer src="https://cdn.jsdelivr.net/gh/swtldesignco/sqsp-media-wall@1/src/media-wall.js"></script>
```
`@1` needs a `v1.x.x` tag on the repo. Never use `@latest`.
