# Media Wall

Auto-scrolling 3-column photo + video wall, built from native Squarespace content.
Repo: <https://github.com/swtldesignco/sqsp-media-wall> · Version **1.2.0** · Status: **beta: tested on a mock 7.1 page only**

---

# Part 1 — Basic install

## Overview

- Columns of tiles move on their own. Column 1 and 3 go up, column 2 goes down.
- Each tile keeps the shape of the uploaded file (photo or video). The list section's
  image crop setting does not matter: the plugin reads the original upload size.
- Default placement is **above the site header**: the wall fills the first screen,
  and the nav + hero come up as the visitor scrolls.
- Only videos on screen play. All motion stops when the wall is off screen.
- Visitors with "reduce motion" turned on see a still wall.
- Two motion styles: **step** (default: each column holds, then glides one tile with an
  eased snap, in a cascade) or **continuous** (slow constant drift, one master speed).
- Optional video playback speed.
- Tile **links are off by default**; one switch turns them on.
- A **Scroll** button at the bottom of the wall takes visitors to the nav + hero,
  and fades out once they start scrolling.

Requires the **Core plan or higher** and **Fluid Engine**.

## Step 1 — Installation (homepage only)

Homepage → ⚙ Page Settings → Advanced → **Page Header Code Injection**. Paste
[`snippets/page-header-injection.html`](../snippets/page-header-injection.html):

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/swtldesignco/sqsp-media-wall@1/src/media-wall.css">
<script>
  window.MediaWallConfig = {
    position: 'above-header',
    header: 'sticky',
    columns: 3, columnsTablet: 3, columnsMobile: 2,
    motion: 'step',        // step | continuous
    stepHold: 1.6,         // step: seconds each column holds still
    stepDuration: 0.7,     // step: seconds the glide takes (lower = faster)
    stepStagger: 0.2,      // step: delay between columns
    speed: 30,             // continuous: px per second
    direction: 'up',
    alternate: true,
    videoRate: 1,
    links: false,
    scrollIndicator: true,
    scrollLabel: 'Scroll'
  };
</script>
<script defer src="https://cdn.jsdelivr.net/gh/swtldesignco/sqsp-media-wall@1/src/media-wall.js"></script>
```

Why page injection, not the sitewide footer: the wall moves the site header, so it
must load on the homepage only. If a site needs the wall on several pages, move the
snippet to the sitewide Footer and remove `position: 'above-header'` from it.

## Step 2 — Usage

| Method | Best for | Video |
|---|---|---|
| **A. Auto Layout list** | All tiles in one editing panel (recommended) | MP4 via `video:` line or button file link |
| **B. Code block + sections below** | List **plus** uploaded Video blocks, galleries, image blocks | Video blocks, `<video>` code blocks, and Method A video |

The source sections stay visible **in the editor** so they can be edited. The wall
only renders on the live site.

### Method A — Auto Layout list section

1. Put an **Auto Layout list section** at the top of the homepage. Any layout (Simple
   List is easiest to edit).
2. Section settings → **Anchor Link** → `media-wall`.
3. **One list item = one tile.** Add as many as you like; the plugin balances them
   across the columns by height.

| List item field | Becomes |
|---|---|
| Image | The photo, or the poster for a video tile |
| Description `video: https://…/clip.mp4` | Makes the tile a video |
| Button link → **File** → upload an MP4 | Also makes the tile a video (no URL to copy) |
| Description `alt: …` | Alt text (default: image alt, then title) |
| Button link → a page or URL | The tile's link (only used when links are on) |
| Description `link: /work/pluma` | Also the tile's link (use when the button holds a video file) |

Video tips: keep clips short, muted, and small (5–10 s, 720p, H.264 MP4, under
~8 MB). The **file-link** route is easiest: Squarespace hosts the MP4 and the link
points straight at it. Upload limit for files is set by Squarespace; check before
promising long clips.

### Method B — Code block + sections below

1. Add a **blank section** at the top of the homepage. Add a **Code Block** and paste
   [`snippets/code-block.html`](../snippets/code-block.html):

```html
<div data-media-wall data-sections="2" hidden></div>
```

2. `data-sections` = how many sections **below** feed the wall.
3. Each source section can be:
   - an **Auto Layout list section** (same rules as Method A)
   - a **gallery section** (any layout; every image becomes a tile)
   - a **blank Fluid Engine section** with **image blocks**, **gallery blocks**,
     **Video blocks** (uploaded Squarespace video) or code blocks holding
     `<video src="…mp4" muted loop playsinline></video>`.
     Blocks are read top to bottom, then left to right.
4. Tiles are added in source order, then balanced across columns.
5. Links (when on): an image block's **Clickthrough URL** and a gallery image's
   **Clickthrough link** become the tile's link. Lightbox links are ignored.

## Customizations (per-instance attributes)

Priority, lowest to highest: plugin defaults → `window.MediaWallConfig` →
`MediaWallConfig.walls['anchor-id']` → code block `data-*` attributes.

| Setting (config) | Attribute | Default | Options | Description |
|---|---|---|---|---|
| `position` | `data-position` | `above-header` | `above-header` `inline` | Above the site header, or inside its own section |
| `header` | `data-header` | `sticky` | `sticky` `static` `keep` | Header after the wall: pins at the top once reached / scrolls away / left as the template sets it |
| `columns` | `data-columns` | `3` | number | Columns above 1024px |
| `columnsTablet` | `data-columns-tablet` | `3` | number | Columns 641–1024px |
| `columnsMobile` | `data-columns-mobile` | `2` | number | Columns ≤640px |
| `motion` | `data-motion` | `step` | `step` `continuous` | Step = hold, then glide one tile and snap to its edge. Continuous = constant drift |
| `stepHold` | `data-step-hold` | `1.6` | seconds | Step: time each column holds still |
| `stepDuration` | `data-step-duration` | `0.7` | seconds | Step: glide time. Lower = faster move |
| `stepStagger` | `data-step-stagger` | `0.2` | seconds | Step: delay between columns (cascade). `0` = all move together |
| `speed` | `data-speed` | `30` | px per second | Continuous: speed for the whole wall. 20 = slow drift, 30 = video reference, 60 = brisk |
| `speeds` | `data-speeds` | — | e.g. `1,0.8,1.15` | Advanced, leave empty: per-column multipliers of `speed` |
| `videoRate` | `data-video-rate` | `1` | `0.5`–`2` | Playback speed of the videos themselves (1 = normal) |
| `links` | `data-links` | `false` | `true` `false` | Tiles open their link when clicked. Off = nothing on the wall is clickable |
| `linkTarget` | `data-link-target` | `same` | `same` `new` | `new` opens links in a new tab |
| `scrollIndicator` | `data-scroll-indicator` | `true` | `true` `false` | Scroll button at the bottom of the wall |
| `scrollLabel` | `data-scroll-label` | `Scroll` | text, or empty for arrow only | Button text |
| `scrollTo` | `data-scroll-to` | — | CSS selector | Where the button goes. Empty = just past the wall (the nav) |
| `direction` | `data-direction` | `up` | `up` `down` | Direction of column 1 |
| `alternate` | `data-alternate` | `true` | `true` `false` | Every other column goes the other way |
| `pauseOnHover` | `data-pause-on-hover` | `false` | `true` `false` | Stop while the pointer is over the wall |
| `shuffle` | `data-shuffle` | `false` | `true` `false` | Random tile order on each visit |
| `sections` | `data-sections` | `0` | number | Sections below the code block to read |
| `hideSource` | `data-hide-source` | `true` | `true` `false` | Hide source sections on the live site |
| `fallbackRatio` | `data-fallback-ratio` | `4:5` | `w:h` | Tile shape until the real size loads (Video blocks) |
| `label` | `data-label` | `Featured work` | text | Screen-reader name |

### Settings in one place (Custom CSS)

These settings can also live in **Design → Custom CSS**, so the speed and link switch
sit with the rest of the wall's styling. Code-block `data-*` attributes still win.

Use the selector `.mw` or the source section's anchor `#media-wall`. Times can be
written `1.6`, `1.6s` or `1600ms`.

```css
.mw {
  --mw-motion: step;       /* step | continuous */
  --mw-step-hold: 1.6s;
  --mw-step-duration: 0.7s;
  --mw-step-stagger: 0.2s;
  --mw-speed: 30;          /* continuous only: px per second */
  --mw-video-rate: 1;      /* video playback speed */
  --mw-links: off;         /* on | off */
  --mw-link-target: same;  /* same | new */
  --mw-scroll-indicator: on;
  --mw-scroll-label: "Scroll";
}
```

## Per-site checklist

- [ ] Core plan or higher.
- [ ] Snippet in the **homepage** Page Header Code Injection (not sitewide).
- [ ] Source list has anchor `media-wall` (Method A), or code block `data-sections` count is right (Method B).
- [ ] Video MP4s are short, muted, H.264, small.
- [ ] Tested on the live site (`?noredirect`), not in the editor.
- [ ] Header sits directly under the wall and pins on scroll (sticky mode).
- [ ] No double gap above the hero (see Troubleshooting).
- [ ] Phone width: 2 columns, no sideways page scroll.
- [ ] Links: off unless the client wants clickable tiles; if on, every tile link goes somewhere real.
- [ ] Scroll button lands with the nav at the top of the screen.
- [ ] Handoff note: tell the client which list/sections feed the wall.

---

# Part 2 — Styling

Add to **Design → Custom CSS** as its own numbered section
([`snippets/custom-css-examples.css`](../snippets/custom-css-examples.css)):

| Variable | Default | Description |
|---|---|---|
| `--mw-height` | `100svh` (`100vh` fallback) | Wall height |
| `--mw-gap` | `12px` | Space between tiles and columns |
| `--mw-padding` | `12px` | Space at left/right edge |
| `--mw-radius` | `0px` | Tile corners |
| `--mw-bg` | `var(--siteBackgroundColor)` | Wall background |
| `--mw-fade` | `0px` | Soft fade at top and bottom |
| `--mw-hover-scale` | `1.03` | Zoom on hover (links on only) |
| `--mw-scroll-bottom` | `28px` | Scroll button distance from the bottom |
| `--mw-scroll-color` | `#fff` | Scroll button text/arrow |
| `--mw-scroll-bg` | `rgba(17,17,17,.55)` | Scroll button fill (blurred glass) |
| `--mw-scroll-bg-hover` | `rgba(17,17,17,.75)` | Scroll button fill on hover |

Targeting: `.mw` (every wall), `.mw--above-header`, `.mw--inline`, `.mw-col.mw-up`,
`.mw-col.mw-down`, `.mw-tile`, `.mw-media`, `.mw-link`, `.mw-scroll`,
`.mw-scroll__label`, `.mw-scroll__icon`. The scroll button uses the site font from
Site Styles; only size, case and spacing are set by the plugin.

---

# Part 3 — For developers

```
div.mw[role=region]            ← inserted before #header (or inside the section)
  div.mw-grid                  ← CSS grid, --mw-cols columns
    div.mw-col.mw-up|mw-down
      div.mw-track             ← moved with translate3d by one rAF loop
        div.mw-set             ← tiles (+ .mw-repeat copies until taller than the wall)
        div.mw-set[aria-hidden]← one clone; offset wraps at one set's height
          (a.mw-link)              ← only when links are on and the tile has one
            figure.mw-tile[style=aspect-ratio]
              img.mw-media | video.mw-media
  button.mw-scroll               ← scroll indicator (.mw-scroll--hidden after scrolling)
```

Body classes while active: `mw-above-header`, `mw-header-sticky` | `mw-header-static`.

Events and functions:

| Name | Description |
|---|---|
| `mw:ready` (event, bubbles) | `detail: { id, items, options }` |
| `MediaWall.refresh()` | Rebuild every wall |
| `MediaWall.destroy()` / `init()` | Remove / build |
| `MediaWall.settings()` | The settings each wall is actually using (check that Custom CSS was read) |
| `MediaWall.setSpeed(px)` | Change the continuous speed live (handy for tuning in the console) |
| `MediaWall.setVideoRate(r)` | Change video playback speed live |
| `MediaWall.version` | `1.2.0` |

---

# Part 4 — Support

## Troubleshooting

- **Custom CSS setting has no effect:** run `MediaWall.settings()` in the browser
  console on the live page. If the value is not there, check the selector is `.mw` or
  `#media-wall`, and that a code-block `data-*` attribute is not setting the same value.
  Continuous settings (`--mw-speed`) do nothing while `motion` is `step`.

- **Wall doesn't show:** check the anchor is exactly `media-wall`, and you are on the
  live site, not the editor.
- **Double gap above the hero:** with a *transparent* or *fixed* header, Squarespace adds
  top padding to the first section to clear the header. Once the wall pushes the
  header into the page flow that padding is no longer needed. Fix: turn off the
  transparent header on the homepage, or remove the padding for that section in
  Custom CSS.
- **Video tile stays a still image:** the URL must end in `.mp4`/`.webm`/`.mov`/`.m4v`.
  YouTube/Vimeo links are not supported in the wall.
- **Video tile wrong shape for a moment:** uploaded Video blocks don't publish their
  size; the tile uses `fallbackRatio` until the video loads, then corrects.

## Deployed on

- Mock 7.1 page only (`demo/index.html`).
- swtldesignco.com staging test page (v1.1.1, Oct 2026).

## Open items

- Not yet tested on a live Squarespace site. Verify `#header` placement with each
  header style (default, fixed "basic", fixed "scroll back", transparent).
- Confirm list sections publish `data-image-dimensions` on the live markup (the mock
  assumes they do; if not, tiles correct their shape when the image loads).
- Confirm the file-link MP4 URL format (`/s/…mp4`) and the Squarespace file upload limit.
- Repo needs creating, then a `v1.0.0` tag, before the `@1` CDN URLs resolve.
