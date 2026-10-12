/*!
 * Media Wall for Squarespace 7.1 — v1.2.0
 * Columns of photos and videos that scroll on their own, in alternating
 * directions, built from native Squarespace content. Can sit above the site
 * header (an intro wall before the nav + hero) or inline in its own section.
 *
 * Sources (pick one or combine):
 *   A. Auto Layout list section with the anchor  media-wall
 *        one list item = one tile. Image = photo (or video poster).
 *        Video: a "video: https://…mp4" line in the Description, or an MP4
 *        uploaded as the item's button link (Link → File).
 *   B. Code block  <div data-media-wall data-sections="2" hidden></div>
 *        reads the list in its own section (if any) plus the N sections below:
 *        gallery sections, image blocks, gallery blocks, video blocks
 *        (uploaded Squarespace video) and code blocks holding a <video>.
 *
 * Repo: github.com/zsawtelle-lgtm/sqsp-media-wall
 */
(function () {
  'use strict';

  var VERSION = '1.2.0';

  var DEFAULTS = {
    anchor: 'media-wall',      // section anchor that marks the source list
    sections: 0,               // sections below the code block to read (0 = none)
    position: 'above-header',  // above-header | inline
    header: 'sticky',          // sticky | static | keep   (only with above-header)
    columns: 3,                // > 1024px
    columnsTablet: 3,          // 641–1024px
    columnsMobile: 2,          // ≤ 640px
    motion: 'step',            // step = hold, then glide one tile with an eased snap
                               // continuous = slow, constant drift
    stepHold: 1.6,             // step: seconds each column holds still
    stepDuration: 0.7,         // step: seconds the glide to the next tile takes
    stepStagger: 0.2,          // step: delay between columns, so they move in a cascade
    speed: 30,                 // continuous: pixels per second, every column
    speeds: '',                // advanced: per-column multipliers, e.g. "1,0.8,1.15"
    videoRate: 1,              // playback speed of the videos themselves (1 = normal)
    links: false,              // tiles open their link when clicked (off by default)
    linkTarget: 'same',        // same | new   (new = open links in a new tab)
    scrollIndicator: true,     // "Scroll" button at the bottom of the wall
    scrollLabel: 'Scroll',     // its text ('' = arrow only)
    scrollTo: '',              // CSS selector to scroll to ('' = just past the wall)
    direction: 'up',           // direction of column 1: up | down
    alternate: true,           // every other column goes the other way
    pauseOnHover: false,
    shuffle: false,
    hideSource: true,
    fallbackRatio: '4:5',      // used until a tile's real size is known
    label: 'Featured work'     // screen-reader name for the wall
  };

  /* ------------------------------------------------------------ Helpers */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function el(tag, cls) { var n = document.createElement(tag); if (cls) n.className = cls; return n; }
  function extend(t) {
    for (var i = 1; i < arguments.length; i++) {
      var s = arguments[i];
      if (s) for (var k in s) if (Object.prototype.hasOwnProperty.call(s, k) && s[k] !== undefined) t[k] = s[k];
    }
    return t;
  }
  function toBool(v) { return v === true || v === 'true' || v === '' || v === '1'; }
  function camel(s) { return s.replace(/-([a-z])/g, function (_, c) { return c.toUpperCase(); }); }

  function dataOptions(node) {
    var o = {};
    if (!node) return o;
    Array.prototype.forEach.call(node.attributes, function (a) {
      if (!/^data-/.test(a.name) || a.name === 'data-media-wall') return;
      var key = camel(a.name.slice(5));
      if (!(key in DEFAULTS)) return;
      var d = DEFAULTS[key];
      o[key] = typeof d === 'boolean' ? toBool(a.value) : typeof d === 'number' ? parseFloat(a.value) : a.value;
    });
    return o;
  }

  /* Squarespace lazy-loads images: the real URL lives in data-src / data-image. */
  function imageUrl(img) {
    if (!img) return '';
    var url = img.getAttribute('data-src') || img.getAttribute('data-image') || img.currentSrc || img.getAttribute('src') || '';
    if (!url && img.getAttribute('srcset')) url = img.getAttribute('srcset').split(',').pop().trim().split(' ')[0];
    if (/^data:/.test(url)) url = img.getAttribute('data-src') || img.getAttribute('data-image') || '';
    return url;
  }
  function isSqspCdn(url) { return /images\.squarespace-cdn\.com|static1\.squarespace\.com/.test(url); }
  function sized(url, w) { return isSqspCdn(url) ? url.split('?')[0] + '?format=' + w + 'w' : url; }
  function isVideoUrl(url) { return /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(url || ''); }

  /* Original upload size, so the tile keeps the uploaded aspect ratio
     (list sections crop the visible image, but publish the real size). */
  function dimsOf(img) {
    var d = img && img.getAttribute('data-image-dimensions');
    var m = d && /^(\d+)x(\d+)$/.exec(d);
    return m ? [parseInt(m[1], 10), parseInt(m[2], 10)] : null;
  }
  function ratioOf(str) {
    var m = /^(\d+(?:\.\d+)?)\s*[:x/]\s*(\d+(?:\.\d+)?)$/.exec(String(str || '').trim());
    return m ? parseFloat(m[1]) / parseFloat(m[2]) : 0;
  }

  /* "key: value" lines in a list description. */
  function metaFrom(node) {
    var meta = {};
    if (!node) return meta;
    var c = node.cloneNode(true);
    $$('br', c).forEach(function (br) { br.parentNode.replaceChild(document.createTextNode('\n'), br); });
    $$('p, li', c).forEach(function (p) { p.appendChild(document.createTextNode('\n')); });
    (c.textContent || '').split('\n').forEach(function (line) {
      var m = /^\s*(video|alt|poster|link)\s*:\s*(.+?)\s*$/i.exec(line);
      if (m) meta[m[1].toLowerCase()] = m[2];
    });
    $$('a[href]', node).forEach(function (a) {
      var h = a.getAttribute('href');
      if (isVideoUrl(h)) { if (!meta.video) meta.video = h; }
      else if (/^\s*link\s*:/i.test(a.parentNode ? a.parentNode.textContent : '')) meta.link = h;
    });
    return meta;
  }

  function isEditMode() {
    var b = document.body;
    return !!b && (b.classList.contains('sqs-edit-mode-active') || b.classList.contains('sqs-is-page-editing'));
  }

  /* ------------------------------------------------------ Source readers */
  function itemsFromList(list) {
    var rows = $$('.user-items-list-carousel__slide, .user-items-list-simple__item, .user-items-list-banner-slideshow__slide, li.list-item, .list-item', list);
    var seen = [];
    rows = rows.filter(function (r) {
      for (var i = 0; i < seen.length; i++) if (seen[i] === r || seen[i].contains(r)) return false;
      seen.push(r);
      return true;
    });
    var out = [];
    rows.forEach(function (row) {
      var img = $('img', row);
      var url = imageUrl(img);
      var meta = metaFrom($('.list-item-content__description', row));
      var btn = $('.list-item-content__button, .list-item-content__button-container a, a.sqs-button-element--primary', row);
      var href = btn && btn.getAttribute('href');
      var video = meta.video || (isVideoUrl(href) ? href : '');
      var link = meta.link || (href && !isVideoUrl(href) ? href : '');
      var dims = dimsOf(img);
      var titleEl = $('.list-item-content__title', row);
      var alt = meta.alt || (img && img.alt) || (titleEl ? titleEl.textContent.trim() : '');
      if (video) out.push({ type: 'video', url: video, poster: meta.poster || url, ratio: dims ? dims[0] / dims[1] : 0, alt: alt, link: link });
      else if (url) out.push({ type: 'image', url: url, ratio: dims ? dims[0] / dims[1] : 0, alt: alt, link: link, focal: img.getAttribute('data-image-focal-point') });
    });
    return out;
  }

  function itemsFromBlock(block) {
    if (block.classList.contains('sqs-block-image')) {
      var img = $('img', block);
      var url = imageUrl(img);
      if (!url) return [];
      var d = dimsOf(img);
      var a = img.closest('a[href]') || $('a[href]', block);
      return [{ type: 'image', url: url, ratio: d ? d[0] / d[1] : 0, alt: img.alt, link: a ? a.getAttribute('href') : '' }];
    }
    if (block.classList.contains('sqs-block-gallery')) return itemsFromGallery(block);
    var native = block.classList.contains('sqs-block-video') && $('.sqs-native-video[data-config-video]', block);
    if (native) {
      var cfg = {};
      try { cfg = JSON.parse(native.getAttribute('data-config-video')); } catch (e) { cfg = {}; }
      if (cfg.alexandriaUrl) {
        return [{
          type: 'hls',
          url: cfg.alexandriaUrl.replace('{variant}', 'playlist.m3u8'),
          poster: cfg.alexandriaUrl.replace('{variant}', 'thumbnail'),
          ratio: 0
        }];
      }
    }
    if (block.classList.contains('sqs-block-code')) {
      if ($('[data-media-wall]', block)) return [];
      var v = $('video', block);
      if (!v) return [];
      var src = v.getAttribute('src') || ($('source', v) && $('source', v).getAttribute('src'));
      var w = parseFloat(v.getAttribute('width')), h = parseFloat(v.getAttribute('height'));
      return src ? [{ type: 'video', url: src, poster: v.getAttribute('poster') || '', ratio: w && h ? w / h : 0 }] : [];
    }
    return [];
  }

  /* Any gallery layout: every image it publishes. */
  function itemsFromGallery(root) {
    var out = [];
    $$('img', root).forEach(function (img) {
      if (img.closest('.gallery-lightbox, .lightbox')) return;
      var url = imageUrl(img);
      if (!url || out.some(function (o) { return o.url === url; })) return;
      var d = dimsOf(img);
      var a = img.closest('a[href]');
      var href = a && a.getAttribute('href');
      if (href && (/^#/.test(href) || /lightbox/.test(a.className))) href = '';
      out.push({ type: 'image', url: url, ratio: d ? d[0] / d[1] : 0, alt: img.alt, link: href || '' });
    });
    return out;
  }

  function itemsFromSection(section) {
    if (section.classList.contains('gallery-section')) return itemsFromGallery(section);
    var list = $('.user-items-list', section);
    if (list) return itemsFromList(list);
    var blocks = $$('.sqs-block', section).map(function (b) {
      var r = b.getBoundingClientRect();
      return { b: b, top: Math.round(r.top), left: Math.round(r.left) };
    });
    blocks.sort(function (a, c) { return Math.abs(a.top - c.top) > 8 ? a.top - c.top : a.left - c.left; });
    var out = [];
    blocks.forEach(function (o) { out = out.concat(itemsFromBlock(o.b)); });
    return out;
  }

  function nextSections(section, count) {
    var out = [];
    var n = section.nextElementSibling;
    while (n && out.length < count) {
      if (n.tagName === 'SECTION' || n.classList.contains('page-section')) out.push(n);
      n = n.nextElementSibling;
    }
    return out;
  }

  function sectionOf(node) { return node.closest('section, .page-section') || node; }

  /* ------------------------------------------------------------- Video */
  var HLS_SRC = 'https://cdn.jsdelivr.net/npm/hls.js@1/dist/hls.min.js';
  var hlsLoading = null;
  function loadHls() {
    if (window.Hls) return Promise.resolve(window.Hls);
    if (!hlsLoading) {
      hlsLoading = new Promise(function (resolve, reject) {
        var sc = document.createElement('script');
        sc.src = HLS_SRC; sc.async = true;
        sc.onload = function () { resolve(window.Hls); };
        sc.onerror = reject;
        document.head.appendChild(sc);
      });
    }
    return hlsLoading;
  }
  /* Squarespace-hosted video is an encrypted HLS stream: hls.js first,
     native HLS only as the fallback (older iPhones without MediaSource). */
  function attachStream(v) {
    var url = v.getAttribute('data-hls');
    if (!url) return Promise.resolve();
    if (v._mwStream) return v._mwStream;
    var native = function () { if (v.canPlayType('application/vnd.apple.mpegurl')) v.src = url; };
    if (window.MediaSource || window.ManagedMediaSource) {
      v._mwStream = loadHls().then(function (Hls) {
        if (!Hls || !Hls.isSupported()) { native(); return; }
        var hls = new Hls({ capLevelToPlayerSize: true, maxBufferLength: 10 });
        hls.loadSource(url);
        hls.attachMedia(v);
        v._mwHls = hls;
      }).catch(native);
    } else { native(); v._mwStream = Promise.resolve(); }
    return v._mwStream;
  }
  function play(v) {
    attachStream(v).then(function () { var p = v.play(); if (p && p.catch) p.catch(function () {}); });
  }

  /* Video playback speed; browsers reset it on load, so set it again then. */
  function setRate(v, rate) {
    var r = parseFloat(rate);
    if (!(r > 0) || r === 1) return;
    v.defaultPlaybackRate = r;
    v.playbackRate = r;
    if (!v._mwRate) {
      v._mwRate = true;
      v.addEventListener('loadedmetadata', function () { v.playbackRate = v.defaultPlaybackRate; });
    }
  }

  /* ---------------------------------------------------------- Rendering */
  function Wall(o, items, root) {
    this.o = o;
    this.items = items;
    this.root = root;
    this.cols = [];
    this.colCount = 0;
    this.build();
  }

  Wall.prototype.columnsNow = function () {
    var w = window.innerWidth;
    var o = this.o;
    return Math.max(1, Math.round(w <= 640 ? o.columnsMobile : w <= 1024 ? o.columnsTablet : o.columns));
  };

  /* Keep the tile at the uploaded shape once the real size is known. */
  function sizeFromMedia(media, fig, it) {
    var done = function () {
      var w = media.videoWidth || media.naturalWidth, h = media.videoHeight || media.naturalHeight;
      if (!w || !h) return;
      var r = w / h;
      if (it) it.ratio = r;
      fig.style.aspectRatio = String(r);
    };
    media.addEventListener(media.tagName === 'VIDEO' ? 'loadedmetadata' : 'load', done);
  }

  Wall.prototype.tile = function (it) {
    var fig = el('figure', 'mw-tile');
    var r = it.ratio || ratioOf(this.o.fallbackRatio) || 0.8;
    fig.style.aspectRatio = String(r);
    var media;
    if (it.type === 'image') {
      media = el('img', 'mw-media');
      media.alt = it.alt || '';
      media.decoding = 'async';
      media.draggable = false;
      if (isSqspCdn(it.url)) {
        media.src = sized(it.url, 1000);
        media.srcset = [500, 750, 1000, 1500].map(function (w) { return sized(it.url, w) + ' ' + w + 'w'; }).join(', ');
        media.sizes = '(max-width: 640px) 50vw, 34vw';
      } else media.src = it.url;
    } else {
      media = el('video', 'mw-media');
      media.muted = true;
      media.defaultMuted = true;
      media.loop = true;
      media.playsInline = true;
      media.setAttribute('muted', '');
      media.setAttribute('playsinline', '');
      media.setAttribute('preload', 'metadata');
      media.setAttribute('aria-hidden', 'true');
      if (it.poster) media.poster = isSqspCdn(it.poster) ? sized(it.poster, 1000) : it.poster;
      if (it.type === 'hls') media.setAttribute('data-hls', it.url);
      else media.src = it.url;
      setRate(media, this.o.videoRate);
    }
    sizeFromMedia(media, fig, it);
    fig.appendChild(media);
    if (this.o.links && it.link) {
      var a = el('a', 'mw-link');
      a.href = it.link;
      if (this.o.linkTarget === 'new') { a.target = '_blank'; a.rel = 'noopener'; }
      a.setAttribute('aria-label', it.alt || 'Open');
      a.appendChild(fig);
      return a;
    }
    return fig;
  };

  /* Shortest-column first, so the columns end up about the same height. */
  Wall.prototype.distribute = function (n) {
    var fb = ratioOf(this.o.fallbackRatio) || 0.8;
    var heights = [], groups = [];
    for (var i = 0; i < n; i++) { heights.push(0); groups.push([]); }
    this.items.forEach(function (it) {
      var c = 0;
      for (var j = 1; j < n; j++) if (heights[j] < heights[c] - 0.01) c = j;
      groups[c].push(it);
      heights[c] += 1 / (it.ratio || fb);
    });
    return groups;
  };

  Wall.prototype.build = function () {
    var self = this, o = this.o;
    this.teardownColumns();
    var n = this.columnsNow();
    this.colCount = n;
    this.root.style.setProperty('--mw-cols', n);
    var grid = el('div', 'mw-grid');
    var speeds = String(o.speeds || '').split(',').map(parseFloat);
    this.distribute(n).forEach(function (group, i) {
      if (!group.length) return;
      var col = el('div', 'mw-col');
      var track = el('div', 'mw-track');
      var set = el('div', 'mw-set');
      group.forEach(function (it) { set.appendChild(self.tile(it)); });
      track.appendChild(set);
      col.appendChild(track);
      grid.appendChild(col);
      var up = (o.direction !== 'down');
      if (o.alternate && i % 2 === 1) up = !up;
      col.classList.add(up ? 'mw-up' : 'mw-down');
      self.cols.push({ col: col, track: track, set: set, base: group, up: up, offset: 0, mult: speeds[i] > 0 ? speeds[i] : 1,
                       next: Math.max(0, parseFloat(o.stepHold) || 0) + i * (parseFloat(o.stepStagger) || 0), anim: null });
    });
    var old = $('.mw-grid', this.root);
    if (old) this.root.replaceChild(grid, old); else this.root.insertBefore(grid, this.root.firstChild);
    this.fill();
    this.watchVideos();
    this.run();
  };

  /* Repeat each column's tiles until one set is taller than the wall, then
     add one more copy: the track scrolls by exactly one set (50%) and loops. */
  Wall.prototype.fill = function () {
    var self = this;
    var wallH = this.root.clientHeight || window.innerHeight;
    this.cols.forEach(function (c) {
      $$('.mw-set[aria-hidden]', c.track).forEach(function (n) { n.remove(); });
      $$('.mw-repeat', c.set).forEach(function (n) { n.remove(); });
      var guard = 0;
      while (c.set.offsetHeight < wallH + 40 && c.set.offsetHeight > 0 && guard++ < 12) {
        c.base.forEach(function (it) { var t = self.tile(it); t.classList.add('mw-repeat'); t.setAttribute('aria-hidden', 'true'); if (t.tagName === 'A') t.tabIndex = -1; c.set.appendChild(t); });
      }
      var copy = c.set.cloneNode(true);
      copy.setAttribute('aria-hidden', 'true');
      $$('a', copy).forEach(function (a) { a.tabIndex = -1; });
      $$('video', copy).forEach(function (v) {   // clones lose their properties
        v.muted = true; v.removeAttribute('src');
      });
      c.track.appendChild(copy);
      self.rewireClones(copy, c);
    });
    this.render();
  };

  Wall.prototype.topUp = function () {
    var wallH = this.root.clientHeight || window.innerHeight;
    var short = this.cols.some(function (c) { return c.set.offsetHeight < wallH + 40; });
    if (short) { this.fill(); this.watchVideos(); }
  };

  /* Cloned <video> nodes need their source and listeners set again. */
  Wall.prototype.rewireClones = function (copy, c) {
    var self = this;
    var origs = $$('video', c.set), clones = $$('video', copy);
    clones.forEach(function (v, i) {
      var src = origs[i];
      if (!src) return;
      if (src.getAttribute('data-hls')) v.setAttribute('data-hls', src.getAttribute('data-hls'));
      else if (src.getAttribute('src')) v.src = src.getAttribute('src');
      v.muted = true; v.loop = true; v.playsInline = true;
      setRate(v, self.o.videoRate);
    });
    $$('.mw-media', copy).forEach(function (m) { sizeFromMedia(m, m.parentNode, null); });
  };

  /* Motion: one requestAnimationFrame loop moves every column at the same
     px/s. The offset wraps at one set's height, so the loop is seamless and
     tiles that change size while loading never make a column jump. */
  Wall.prototype.render = function () {
    this.cols.forEach(function (c) {
      var h = c.set.offsetHeight;
      if (!h) return;
      c.offset = ((c.offset % h) + h) % h;
      var y = c.up ? -c.offset : c.offset - h;
      c.track.style.transform = 'translate3d(0,' + y.toFixed(2) + 'px,0)';
    });
  };

  Wall.prototype.run = function () {
    var self = this;
    if (this._raf) return;
    var last = 0;
    var tick = function (now) {
      self._raf = requestAnimationFrame(tick);
      var dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
      last = now;
      if (self.reduced || self.paused || !self.visible) return;
      self.clock = (self.clock || 0) + dt;   // wall's own clock: stops while paused or off screen
      if (self.o.motion === 'continuous') {
        var v = Math.max(0, self.o.speed);
        self.cols.forEach(function (c) { c.offset += v * c.mult * dt; });
      } else {
        self.cols.forEach(function (c) { self.step(c); });
      }
      self.render();
    };
    this.visible = true;
    if (window.IntersectionObserver && !this.vis) {
      this.vis = new IntersectionObserver(function (e) { self.visible = e[0].isIntersecting; });
      this.vis.observe(this.root);
    }
    if (this.o.pauseOnHover && !this._hover) {
      this._hover = true;
      this.root.addEventListener('mouseenter', function () { self.paused = true; });
      this.root.addEventListener('mouseleave', function () { self.paused = false; });
    }
    this._raf = requestAnimationFrame(tick);
  };

  /* Step motion: hold, then glide to the next tile edge (ease-in-out). */
  function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

  /* Offsets at which a tile edge sits exactly on the wall's top edge. */
  Wall.prototype.stops = function (c) {
    var h = c.set.offsetHeight, top0 = c.set.getBoundingClientRect().top;
    return Array.prototype.map.call(c.set.children, function (t) {
      var y = t.getBoundingClientRect().top - top0;
      return c.up ? y : (h - y) % h;
    });
  };

  Wall.prototype.step = function (c) {
    var o = this.o, now = this.clock;
    if (c.anim) {
      var t = Math.min(1, (now - c.anim.t0) / c.anim.dur);
      c.offset = c.anim.from + c.anim.dist * ease(t);
      if (t >= 1) { c.anim = null; c.next = now + Math.max(0, parseFloat(o.stepHold) || 0); }
      return;
    }
    if (now < c.next) return;
    var h = c.set.offsetHeight;
    if (!h) return;
    var cur = ((c.offset % h) + h) % h, dist = h;
    this.stops(c).forEach(function (s) {
      var d = ((s - cur) % h + h) % h;
      if (d > 2 && d < dist) dist = d;   // nearest edge ahead (skip the one we sit on)
    });
    c.anim = { from: cur, dist: dist, t0: now, dur: Math.max(0.1, parseFloat(o.stepDuration) || 0.7) };
  };

  Wall.prototype.setSpeed = function (px) {
    var n = parseFloat(px);
    if (n >= 0) this.o.speed = n;
  };
  Wall.prototype.setVideoRate = function (r) {
    this.o.videoRate = r;
    $$('video', this.root).forEach(function (v) { setRate(v, r); });
  };

  Wall.prototype.stop = function () {
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = null;
    if (this.vis) { this.vis.disconnect(); this.vis = null; }
  };

  /* Only videos on screen play. */
  Wall.prototype.watchVideos = function () {
    var self = this;
    if (this.io) this.io.disconnect();
    var vids = $$('video', this.root);
    if (!vids.length) return;
    if (!window.IntersectionObserver) { vids.forEach(play); return; }
    this.io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting && !self.reduced) play(e.target);
        else e.target.pause();
      });
    }, { rootMargin: '100px 0px' });
    vids.forEach(function (v) { self.io.observe(v); });
  };

  Wall.prototype.teardownColumns = function () {
    if (this.io) this.io.disconnect();
    $$('video', this.root).forEach(function (v) { if (v._mwHls) v._mwHls.destroy(); v.pause(); });
    this.cols = [];
  };

  /* ---------------------------------------------------------- Placement */
  function findHeader() {
    return $('#header') || $('header.header') || $('body > header, #siteWrapper > header');
  }

  function place(root, o, anchorSection) {
    var header = o.position === 'above-header' ? findHeader() : null;
    if (header && header.parentNode) {
      header.parentNode.insertBefore(root, header);
      root.classList.add('mw--above-header');
      document.body.classList.add('mw-above-header');
      if (o.header !== 'keep') document.body.classList.add('mw-header-' + (o.header === 'static' ? 'static' : 'sticky'));
      return true;
    }
    root.classList.add('mw--inline');
    var host = $('.content-wrapper > .content', anchorSection) || $('.content-wrapper', anchorSection) || anchorSection;
    host.appendChild(root);
    return false;
  }

  /* ---------------------------------------------------------- Bootstrap */
  var instances = [];

  function cfg() { return window.MediaWallConfig || {}; }

  function findTargets() {
    var g = extend({}, DEFAULTS, cfg());
    var targets = [], used = [];
    $$('[data-media-wall]').forEach(function (code) {
      if (code.closest('.mw')) return;
      var s = sectionOf(code);
      if (used.indexOf(s) > -1) return;
      used.push(s);
      targets.push({ section: s, code: code });
    });
    $$('[id^="' + g.anchor + '"]').forEach(function (n) {
      if (n.closest('.mw')) return;
      var s = sectionOf(n);
      if (used.indexOf(s) > -1) return;
      used.push(s);
      targets.push({ section: s, code: null });
    });
    return targets;
  }

  /* One-place settings in Design → Custom CSS, e.g.
       .mw { --mw-speed: 45; --mw-links: on; }
     Code-block data-* attributes still win over CSS. */
  var CSS_SETTINGS = [['motion', '--mw-motion'], ['stepHold', '--mw-step-hold'], ['stepDuration', '--mw-step-duration'],
                      ['stepStagger', '--mw-step-stagger'],
                      ['speed', '--mw-speed'], ['videoRate', '--mw-video-rate'], ['links', '--mw-links'],
                      ['linkTarget', '--mw-link-target'], ['scrollIndicator', '--mw-scroll-indicator'], ['scrollLabel', '--mw-scroll-label']];
  /* Read from the wall (.mw, or anything above it such as body) and from the
     source section (#media-wall), so either selector works in Custom CSS. */
  function applyCssSettings(o, root, data, section) {
    var styles = [getComputedStyle(root)];
    if (section) styles.push(getComputedStyle(section));
    CSS_SETTINGS.forEach(function (pair) {
      if (data[pair[0]] !== undefined) return;
      var v = '';
      styles.forEach(function (cs) { if (!v) v = (cs.getPropertyValue(pair[1]) || '').trim().replace(/^["']|["']$/g, ''); });
      var num = /^(-?[\d.]+)\s*(ms|s|px)?$/.exec(v);   // "1.6s", "600ms", "40px" → number
      if (num) v = String(num[2] === 'ms' ? parseFloat(num[1]) / 1000 : parseFloat(num[1]));
      if (!v) return;
      var d = DEFAULTS[pair[0]];
      o[pair[0]] = typeof d === 'boolean' ? /^(on|true|yes|1)$/i.test(v) : typeof d === 'number' ? parseFloat(v) : v;
    });
  }

  /* "Scroll" button: takes visitors past the wall to the nav + hero. */
  function addIndicator(root, o) {
    if (!o.scrollIndicator) return;
    var btn = el('button', 'mw-scroll');
    btn.type = 'button';
    btn.setAttribute('aria-label', o.scrollLabel || 'Scroll to content');
    btn.innerHTML = (o.scrollLabel ? '<span class="mw-scroll__label"></span>' : '') +
      '<span class="mw-scroll__icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v15M6 13l6 6 6-6"/></svg></span>';
    if (o.scrollLabel) $('.mw-scroll__label', btn).textContent = o.scrollLabel;
    btn.addEventListener('click', function () {
      var target = o.scrollTo ? $(o.scrollTo) : null;
      var y = target ? target.getBoundingClientRect().top + window.pageYOffset
                     : root.getBoundingClientRect().bottom + window.pageYOffset;
      var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: Math.round(y), behavior: reduce ? 'auto' : 'smooth' });
    });
    root.appendChild(btn);
    var onScroll = function () {
      var past = window.pageYOffset > Math.min(80, root.offsetHeight * 0.15);
      btn.classList.toggle('mw-scroll--hidden', past);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    root._mwUnscroll = function () { window.removeEventListener('scroll', onScroll); };
    onScroll();
  }

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }

  function build(t) {
    var section = t.section;
    var anchorId = section.id || (($('[id^="' + (cfg().anchor || DEFAULTS.anchor) + '"]', section) || {}).id) || '';
    var o = extend({}, DEFAULTS, cfg());
    if (anchorId && cfg().walls && cfg().walls[anchorId]) extend(o, cfg().walls[anchorId]);
    var data = dataOptions(t.code);
    extend(o, data);

    var items = [], hidden = [];
    var list = $('.user-items-list', section);
    if (list) items = items.concat(itemsFromList(list));
    var count = parseInt(o.sections, 10) || 0;
    if (count > 0) {
      var sources = nextSections(section, count);
      sources.forEach(function (s) { items = items.concat(itemsFromSection(s)); });
      if (o.hideSource) hidden = hidden.concat(sources);
    }
    if (!items.length) { if (window.console) console.warn('[Media Wall] No photos or videos found for', section); return; }
    if (o.shuffle) shuffle(items);

    var root = el('div', 'mw');
    root.setAttribute('role', 'region');
    root.setAttribute('aria-label', o.label || 'Featured work');
    if (o.pauseOnHover) root.classList.add('mw--pause-hover');
    var above = place(root, o, section);
    applyCssSettings(o, root, data, section);
    if (o.hideSource && (above || list)) hidden.push(above ? section : list);
    addIndicator(root, o);
    if (o.links) root.classList.add('mw--links');

    hidden.forEach(function (h) { h.classList.add('mw-source-hidden'); });
    var wall = new Wall(o, items, root);
    instances.push({ wall: wall, hidden: hidden });
    root.dispatchEvent(new CustomEvent('mw:ready', { bubbles: true, detail: { id: anchorId, items: items.length, options: o } }));
  }

  var resizeTimer = null;
  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      instances.forEach(function (inst) {
        var w = inst.wall;
        if (w.columnsNow() !== w.colCount) w.build(); else w.fill();
      });
    }, 200);
  }

  function setReduced(mq) {
    instances.forEach(function (inst) {
      inst.wall.reduced = mq.matches;
      if (mq.matches) $$('video', inst.wall.root).forEach(function (v) { v.pause(); });
      else inst.wall.watchVideos();
    });
  }

  function init() {
    if (isEditMode()) return;
    findTargets().forEach(function (t) {
      try { build(t); } catch (e) { if (window.console) console.warn('[Media Wall]', e); }
    });
    var mq = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq) setReduced(mq);
    /* sets grow as images and videos load: top them up so no gap shows */
    instances.forEach(function (inst) {
      if (window.ResizeObserver) {
        var t = null;
        var ro = new ResizeObserver(function () { clearTimeout(t); t = setTimeout(function () { inst.wall.topUp(); }, 150); });
        ro.observe(inst.wall.root);
        inst.wall.cols.forEach(function (c) { ro.observe(c.set); });
        inst.ro = ro;
      }
    });
  }

  function destroy() {
    instances.forEach(function (inst) {
      inst.wall.teardownColumns();
      inst.wall.stop();
      if (inst.ro) inst.ro.disconnect();
      inst.hidden.forEach(function (h) { h.classList.remove('mw-source-hidden'); });
      if (inst.wall.root._mwUnscroll) inst.wall.root._mwUnscroll();
      if (inst.wall.root.parentNode) inst.wall.root.parentNode.removeChild(inst.wall.root);
    });
    document.body.classList.remove('mw-above-header', 'mw-header-sticky', 'mw-header-static');
    instances = [];
  }

  /* Opening the Squarespace editor puts the source sections back. */
  function watchEditor() {
    if (!window.MutationObserver || !document.body) return;
    var editing = isEditMode();
    new MutationObserver(function () {
      var now = isEditMode();
      if (now === editing) return;
      editing = now;
      if (now) destroy(); else init();
    }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  }

  function start() {
    init();
    watchEditor();
    window.addEventListener('resize', onResize);
    var mq = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq && mq.addEventListener) mq.addEventListener('change', setReduced);
  }

  window.MediaWall = {
    version: VERSION, init: init, destroy: destroy,
    refresh: function () { destroy(); init(); },
    settings: function () { return instances.map(function (i) { return i.wall.o; }); },
    setSpeed: function (px) { instances.forEach(function (i) { i.wall.setSpeed(px); }); },
    setVideoRate: function (r) { instances.forEach(function (i) { i.wall.setVideoRate(r); }); }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
