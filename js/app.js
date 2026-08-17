

(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  

  function initReveal() {
    var items = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
    if (!items.length) return;

    if (reduced || !('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }

    document.querySelectorAll('.stagger').forEach(function (group) {
      Array.prototype.slice.call(group.querySelectorAll('.reveal')).forEach(function (el, i) {
        if (!el.dataset.delay) el.dataset.delay = String(Math.min(i, 3) * 45);
      });
    });

    var landed = !!(location.hash && location.hash.length > 1);

    function show(el, delay) {
      if (delay > 0) setTimeout(function () { el.classList.add('is-in'); }, delay);
      else el.classList.add('is-in');
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        show(el, landed ? 0 : parseInt(el.dataset.delay || '0', 10));
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px 240px 0px', threshold: 0 });

    items.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.bottom < 0) { el.classList.add('is-in'); return; }
      io.observe(el);
    });

    if (landed) {
      requestAnimationFrame(function () {
        items.forEach(function (el) {
          var r = el.getBoundingClientRect();
          if (r.bottom > 0 && r.top < window.innerHeight) {
            el.classList.add('is-in');
            io.unobserve(el);
          }
        });
        requestAnimationFrame(function () {
          document.documentElement.classList.remove('anchor-landing');
        });
      });
    }
  }

  

  function initHeroLines() {
    var blocks = document.querySelectorAll('.rise-lines');
    blocks.forEach(function (block) {
      if (reduced) { block.classList.add('is-in'); return; }
      block.querySelectorAll('.line > span').forEach(function (span, i) {
        span.style.transitionDelay = (60 + i * 110) + 'ms';
      });
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { block.classList.add('is-in'); });
      });
    });
  }

  

  function initCounters() {
    var nodes = document.querySelectorAll('[data-count]');
    if (!nodes.length) return;

    if (reduced || !('IntersectionObserver' in window)) return;

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        io.unobserve(el);

        var target = parseFloat(String(el.dataset.count).replace(/[^0-9.]/g, ''));
        if (!isFinite(target) || target === 0) return;

        var started = null;
        var dur = 900;
        function frame(ts) {
          if (started === null) started = ts;
          var t = Math.min(1, (ts - started) / dur);
          var eased = 1 - Math.pow(1 - t, 3);
          el.textContent = String(Math.round(target * eased));
          if (t < 1) requestAnimationFrame(frame);
          else el.textContent = el.dataset.count;
        }
        el.textContent = '0';
        requestAnimationFrame(frame);
      });
    }, { threshold: 0.4 });

    nodes.forEach(function (el) { io.observe(el); });
  }

  

  function initParallax() {
    var nodes = Array.prototype.slice.call(document.querySelectorAll('[data-parallax]'));
    if (!nodes.length || reduced) return;

    var ticking = false;

    function apply() {
      var vh = window.innerHeight;
      nodes.forEach(function (el) {
        var box = el.getBoundingClientRect();
        if (box.bottom < -200 || box.top > vh + 200) return;
        var k = parseFloat(el.dataset.parallax) || 0.15;
        var rel = (box.top + box.height / 2 - vh / 2) / vh;
        el.style.transform = 'translate3d(0,' + (rel * k * 100).toFixed(2) + 'px,0)';
      });
      ticking = false;
    }

    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(apply);
    }, { passive: true });

    window.addEventListener('resize', apply, { passive: true });
    apply();
  }

  

  function initBar() {
    var bar = document.querySelector('.bar');
    if (!bar) return;
    var last = 0;

    function sync() {
      var y = window.scrollY || 0;
      bar.classList.toggle('is-compact', y > 40);
      last = y;
    }

    bar.classList.add('no-anim');
    sync();
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { bar.classList.remove('no-anim'); });
    });

    window.addEventListener('scroll', sync, { passive: true });
  }

  

  function initNav() {
    var burger = document.querySelector('.burger');
    var nav = document.getElementById('site-nav');
    var scrim = document.querySelector('.nav-scrim');
    if (!burger || !nav || !scrim) return;

    function holdScroll(e) {
      if (nav.contains(e.target)) return;
      e.preventDefault();
    }

    function open() {
      nav.classList.add('is-open');
      burger.setAttribute('aria-expanded', 'true');
      burger.setAttribute('aria-label', 'Close menu');
      scrim.hidden = false;
      requestAnimationFrame(function () { scrim.classList.add('is-on'); });

      document.body.classList.add('nav-open');
      document.addEventListener('wheel', holdScroll, { passive: false });
      document.addEventListener('touchmove', holdScroll, { passive: false });

      var first = nav.querySelector('a');
      if (first) first.focus({ preventScroll: true });
    }

    function close() {
      nav.classList.remove('is-open');
      burger.setAttribute('aria-expanded', 'false');
      burger.setAttribute('aria-label', 'Open menu');
      scrim.classList.remove('is-on');
      document.body.classList.remove('nav-open');
      document.removeEventListener('wheel', holdScroll, { passive: false });
      document.removeEventListener('touchmove', holdScroll, { passive: false });
      setTimeout(function () { if (!nav.classList.contains('is-open')) scrim.hidden = true; }, 280);
    }

    burger.addEventListener('click', function () {
      if (nav.classList.contains('is-open')) close();
      else open();
    });

    scrim.addEventListener('click', close);

    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) close();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) {
        close();
        burger.focus({ preventScroll: true });
      }
    });

    window.matchMedia('(min-width: 1181px)').addEventListener('change', function (e) {
      if (e.matches) close();
    });
  }

  

  function initSelects() {
    var natives = Array.prototype.slice.call(document.querySelectorAll('select:not([data-native])'));
    if (!natives.length) return;

    natives.forEach(function (native) {
      if (native.dataset.enhanced) return;
      native.dataset.enhanced = '1';

      var wrap = document.createElement('div');
      wrap.className = 'sel';

      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'sel-btn';
      button.setAttribute('aria-haspopup', 'listbox');
      button.setAttribute('aria-expanded', 'false');

      var label = document.createElement('span');
      label.className = 'sel-value';
      button.appendChild(label);
      button.insertAdjacentHTML('beforeend',
        '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" ' +
        'stroke-width="1.8" aria-hidden="true"><path d="M2.5 4.5 6 8l3.5-3.5" ' +
        'stroke-linecap="round" stroke-linejoin="round"/></svg>');

      var list = document.createElement('div');
      list.className = 'sel-list';
      list.setAttribute('role', 'listbox');
      list.hidden = true;

      var options = Array.prototype.slice.call(native.options).map(function (opt, i) {
        var item = document.createElement('button');
        item.type = 'button';
        item.className = 'sel-opt';
        item.setAttribute('role', 'option');
        item.dataset.index = String(i);
        item.textContent = opt.textContent;
        list.appendChild(item);
        return item;
      });

      native.classList.add('sel-native');
      native.setAttribute('tabindex', '-1');
      native.setAttribute('aria-hidden', 'true');

      native.parentNode.insertBefore(wrap, native);
      wrap.appendChild(native);
      wrap.appendChild(button);
      wrap.appendChild(list);

      var active = native.selectedIndex;

      function paint() {
        label.textContent = native.options[native.selectedIndex].textContent;
        options.forEach(function (o, i) {
          var on = i === native.selectedIndex;
          o.setAttribute('aria-selected', on ? 'true' : 'false');
          o.classList.toggle('is-on', on);
          o.classList.toggle('is-active', i === active);
        });
      }

      function fit() {
        var below = window.innerHeight - button.getBoundingClientRect().bottom - 16;
        list.style.maxHeight = Math.max(120, Math.min(280, below)) + 'px';
        var sel = options[native.selectedIndex];
        if (sel) sel.scrollIntoView({ block: 'nearest' });
      }

      var closeTimer;
      
      var opened = false;

      function open() {
        clearTimeout(closeTimer);
        opened = true;
        active = native.selectedIndex;
        list.hidden = false;
        requestAnimationFrame(function () { list.classList.add('is-in'); });
        button.setAttribute('aria-expanded', 'true');
        wrap.classList.add('is-open');
        paint();

        var below = window.innerHeight - button.getBoundingClientRect().bottom - 16;
        if (below < 200) {
          button.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' });
          setTimeout(fit, reduced ? 0 : 340);
        } else {
          fit();
        }
      }

      function close(focusBack) {
        if (!opened) return;
        opened = false;
        list.classList.remove('is-in');
        button.setAttribute('aria-expanded', 'false');
        wrap.classList.remove('is-open');
        clearTimeout(closeTimer);
        closeTimer = setTimeout(function () { list.hidden = true; }, reduced ? 0 : 160);
        if (focusBack) button.focus({ preventScroll: true });
      }

      function choose(i) {
        native.selectedIndex = i;
        native.dispatchEvent(new Event('change', { bubbles: true }));
        paint();
        close(true);
      }

      function move(step) {
        if (!opened) { open(); return; }
        active = Math.max(0, Math.min(options.length - 1, active + step));
        options.forEach(function (o, i) { o.classList.toggle('is-active', i === active); });
        options[active].scrollIntoView({ block: 'nearest' });
      }

      button.addEventListener('click', function () {
        if (opened) close(false); else open();
      });

      options.forEach(function (o, i) {
        o.addEventListener('click', function () { choose(i); });
        o.addEventListener('mousemove', function () {
          active = i;
          options.forEach(function (x, j) { x.classList.toggle('is-active', j === i); });
        });
      });

      button.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
        else if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (opened) choose(active); else open();
        } else if (e.key === 'Escape') { close(true); }
        else if (e.key === 'Home') { e.preventDefault(); active = 0; move(0); }
        else if (e.key === 'End') { e.preventDefault(); active = options.length - 1; move(0); }
      });

      document.addEventListener('click', function (e) {
        if (!wrap.contains(e.target)) close(false);
      });

      native.addEventListener('change', paint);
      var form = native.closest('form');
      if (form) form.addEventListener('reset', function () { setTimeout(paint, 0); });

      paint();
    });
  }

  

  function initToc() {
    var toc = document.querySelector('[data-toc]');
    if (!toc) return;
    var links = Array.prototype.slice.call(toc.querySelectorAll('a[href^="#"]'));
    var fill = toc.querySelector('[data-toc-fill]');
    var targets = links.map(function (a) {
      return document.getElementById(decodeURIComponent(a.getAttribute('href').slice(1)));
    });
    if (!targets.some(Boolean)) return;

    var article = document.querySelector('.prose') || document.body;

    
    function paint() {
      var line = (document.querySelector('.bar') || {}).offsetHeight || 74;
      var current = 0;
      targets.forEach(function (el, i) {
        if (el && el.getBoundingClientRect().top - line - 12 <= 0) current = i;
      });
      links.forEach(function (a, i) { a.classList.toggle('is-on', i === current); });

      if (fill) {
        var box = article.getBoundingClientRect();
        var seen = -box.top + window.innerHeight * 0.35;
        var ratio = Math.max(0, Math.min(1, seen / Math.max(1, box.height)));
        fill.style.transform = 'scaleY(' + ratio.toFixed(4) + ')';
      }
    }

    var waiting = false;
    window.addEventListener('scroll', function () {
      if (waiting) return;
      waiting = true;
      requestAnimationFrame(function () { paint(); waiting = false; });
    }, { passive: true });
    window.addEventListener('resize', paint);
    paint();
  }

  

  function initToTop() {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'to-top';
    btn.setAttribute('aria-label', 'Back to top');
    btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" ' +
      'stroke="currentColor" stroke-width="1.9" aria-hidden="true">' +
      '<path d="M9 14.5V4M4.5 8.5 9 4l4.5 4.5" stroke-linecap="square"/></svg>' +
      '<span>Top</span>';
    document.body.appendChild(btn);

    btn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
      var first = document.querySelector('h1');
      if (first) { first.setAttribute('tabindex', '-1'); first.focus({ preventScroll: true }); }
    });

    var waiting = false;
    function check() {
      var show = window.scrollY > window.innerHeight * 1.2 &&
                 document.body.scrollHeight > window.innerHeight * 2.5;
      btn.classList.toggle('is-in', show);
    }
    window.addEventListener('scroll', function () {
      if (waiting) return;
      waiting = true;
      requestAnimationFrame(function () { check(); waiting = false; });
    }, { passive: true });
    check();
  }

  

  function initMore() {
    var toggle = document.querySelector('.more-toggle');
    var sheet = document.getElementById('nav-more');
    if (!toggle || !sheet) return;

    var wide = window.matchMedia('(min-width: 1181px)');
    var hoverable = window.matchMedia('(hover: hover)');
    var timer;

    function open() {
      clearTimeout(timer);
      sheet.classList.add('is-open');
      toggle.setAttribute('aria-expanded', 'true');
    }

    function close() {
      clearTimeout(timer);
      sheet.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
    }

    function closeSoon() {
      clearTimeout(timer);
      timer = setTimeout(close, 220);
    }

    toggle.addEventListener('click', function () {
      if (sheet.classList.contains('is-open')) close();
      else open();
    });

    var host = toggle.parentNode;
    host.addEventListener('mouseenter', function () {
      if (wide.matches && hoverable.matches) open();
    });
    host.addEventListener('mouseleave', function () {
      if (wide.matches && hoverable.matches) closeSoon();
    });

    document.addEventListener('click', function (e) {
      if (!host.contains(e.target)) close();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && sheet.classList.contains('is-open')) {
        close();
        toggle.focus({ preventScroll: true });
      }
    });

    host.addEventListener('focusout', function (e) {
      if (!host.contains(e.relatedTarget)) close();
    });

    wide.addEventListener('change', function (e) { if (!e.matches) close(); });
  }

  

  function initAnchors() {
    document.addEventListener('click', function (e) {
      var link = e.target.closest('a[href^="#"]');
      if (!link) return;
      var id = link.getAttribute('href');
      if (!id) return;
      if (id === '#') {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
        return;
      }
      var target = document.querySelector(id);
      if (!target) return;

      e.preventDefault();
      var bar = document.querySelector('.bar');
      var offset = (bar ? bar.offsetHeight : 0) + 16;
      var top = target.getBoundingClientRect().top + window.scrollY - offset;

      window.scrollTo({ top: top, behavior: reduced ? 'auto' : 'smooth' });
      history.replaceState(null, '', id);
      target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    });
  }

  

  function initTheme() {
    var btn = document.querySelector('.theme-toggle');
    if (!btn) return;
    var root = document.documentElement;
    var order = ['light', 'dark'];

    function current() {
      return root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    }

    function apply(mode) {
      root.setAttribute('data-theme', mode);
      try { localStorage.setItem('aj-theme', mode); } catch (e) {}
      btn.dataset.mode = mode;
      btn.title = 'Theme: ' + mode;
    }

    apply(current());

    btn.addEventListener('click', function () {
      apply(order[(order.indexOf(current()) + 1) % order.length]);
    });
  }

  
  function initPalettePicker() {
    var dock = document.querySelector('.palette-dock');
    if (!dock) return;
    var root = document.documentElement;

    if (location.search.indexOf('palette') !== -1) dock.hidden = false;

    document.addEventListener('keydown', function (e) {
      if (e.shiftKey && (e.key === 'P' || e.key === 'p')) dock.hidden = !dock.hidden;
    });

    dock.querySelectorAll('[data-palette-pick]').forEach(function (b) {
      b.addEventListener('click', function () {
        var name = b.dataset.palettePick;
        root.setAttribute('data-palette', name);
        try { localStorage.setItem('aj-palette', name); } catch (e) {}
        dock.querySelectorAll('button').forEach(function (x) { x.classList.toggle('is-on', x === b); });
      });
    });

    var saved = root.getAttribute('data-palette') || 'clay';
    var active = dock.querySelector('[data-palette-pick="' + saved + '"]');
    if (active) active.classList.add('is-on');
  }

  

  function initFaq() {
    var CLOSE_MS = 280;

    document.querySelectorAll('.faq details').forEach(function (d) {
      var summary = d.querySelector('summary');
      if (!summary) return;

      summary.addEventListener('click', function (e) {
        e.preventDefault();
        if (reduced) { d.open = !d.open; return; }

        if (!d.open) {
          d.classList.remove('is-closing');
          d.classList.add('is-collapsed');
          d.open = true;
          void d.offsetHeight;
          requestAnimationFrame(function () {
            d.classList.remove('is-collapsed');
          });
          return;
        }

        if (d.classList.contains('is-closing')) return;
        d.classList.add('is-closing');
        setTimeout(function () {
          d.open = false;
          d.classList.remove('is-closing');
        }, CLOSE_MS);
      });
    });
  }

  

  function initNudge() {
    var el = document.querySelector('.nudge');
    if (!el) return;

    var key = 'aj-nudge-' + (el.dataset.nudge || 'all');
    try {
      var until = parseInt(localStorage.getItem(key) || '0', 10);
      if (until && Date.now() < until) return;
    } catch (e) {}

    var shown = false;

    function show() {
      if (shown) return;
      shown = true;
      el.hidden = false;
      requestAnimationFrame(function () { el.classList.add('is-on'); });
    }

    function hide(remember) {
      el.classList.remove('is-on');
      setTimeout(function () { el.hidden = true; }, 420);
      if (remember) {
        try { localStorage.setItem(key, String(Date.now() + 24 * 60 * 60 * 1000)); } catch (e) {}
      }
    }

    var timer = setTimeout(show, 2200);

    el.querySelector('.nudge-close').addEventListener('click', function () {
      clearTimeout(timer);
      hide(true);
    });

    el.querySelector('.btn').addEventListener('click', function () { hide(true); });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !el.hidden) hide(true);
    });
  }

  

  function initHashLanding() {
    if (!location.hash || location.hash.length < 2) return;

    var id = location.hash.slice(1);

    function land(smooth) {
      var target = document.getElementById(id);
      if (!target) return false;
      var bar = document.querySelector('.bar');
      var offset = (bar ? bar.offsetHeight : 0) + 16;
      var top = target.getBoundingClientRect().top + window.scrollY - offset;
      if (Math.abs(top - window.scrollY) > 2) {
        window.scrollTo({ top: top, behavior: smooth && !reduced ? 'smooth' : 'auto' });
      }
      if (!target.classList.contains('is-target')) {
        target.classList.add('is-target');
        setTimeout(function () { target.classList.remove('is-target'); }, 2600);
      }
      return true;
    }

    if (!land(false)) return;
    window.addEventListener('load', function () { setTimeout(function () { land(false); }, 60); });
    setTimeout(function () { land(false); }, 700);
  }

  

  function initGalleries() {
    document.querySelectorAll('[data-gal]').forEach(function (gal) {
      var slides = Array.prototype.slice.call(gal.querySelectorAll('.gal-slide'));
      var dots = Array.prototype.slice.call(gal.querySelectorAll('.gal-dot'));
      if (slides.length < 2) return;

      var index = 0;
      var timer = null;
      var visible = false;
      var hovered = false;
      var STEP = 4200;

      function show(next) {
        index = (next + slides.length) % slides.length;
        slides.forEach(function (s, i) { s.classList.toggle('is-on', i === index); });
        dots.forEach(function (d, i) {
          d.classList.toggle('is-on', i === index);
          if (i === index) d.setAttribute('aria-selected', 'true');
          else d.removeAttribute('aria-selected');
        });
      }

      function play() {
        stop();
        if (reduced || !visible || hovered) return;
        timer = setInterval(function () { show(index + 1); }, STEP);
      }

      function stop() {
        if (timer) { clearInterval(timer); timer = null; }
      }

      gal.querySelector('.gal-nav.prev').addEventListener('click', function (e) {
        e.preventDefault();
        show(index - 1);
        play();
      });

      gal.querySelector('.gal-nav.next').addEventListener('click', function (e) {
        e.preventDefault();
        show(index + 1);
        play();
      });

      dots.forEach(function (d, i) {
        d.addEventListener('click', function (e) {
          e.preventDefault();
          show(i);
          play();
        });
      });

      gal.addEventListener('mouseenter', function () { hovered = true; stop(); });
      gal.addEventListener('mouseleave', function () { hovered = false; play(); });

      gal.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowLeft') { show(index - 1); play(); }
        if (e.key === 'ArrowRight') { show(index + 1); play(); }
      });

      
      var startX = null, startY = null, dragging = false, moved = false;

      
      var zone = gal.closest('.tile, .card-post') || gal;

      zone.addEventListener('pointerdown', function (e) {
        if (e.target.closest('.gal-nav, .gal-dot')) return;
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        startX = e.clientX;
        startY = e.clientY;
        dragging = true;
        moved = false;
        gal.classList.add('is-dragging');
      });

      zone.addEventListener('pointermove', function (e) {
        if (!dragging) return;
        if (Math.abs(e.clientX - startX) > 6) moved = true;
      });

      function endDrag(e) {
        if (!dragging) return;
        dragging = false;
        gal.classList.remove('is-dragging');
        var dx = e.clientX - startX;
        var dy = e.clientY - startY;
        if (Math.abs(dx) > 44 && Math.abs(dx) > Math.abs(dy)) show(index + (dx < 0 ? 1 : -1));
        startX = startY = null;
        play();
      }

      zone.addEventListener('pointerup', endDrag);
      zone.addEventListener('pointercancel', function () {
        dragging = false;
        gal.classList.remove('is-dragging');
        startX = startY = null;
        play();
      });
      zone.addEventListener('pointerleave', endDrag);

      zone.addEventListener('click', function (e) {
        if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; }
      }, true);

      zone.addEventListener('dragstart', function (e) { e.preventDefault(); });

      function loadRest() {
        gal.querySelectorAll('img[data-src]').forEach(function (img) {
          img.src = img.getAttribute('data-src');
          img.removeAttribute('data-src');
        });
      }

      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            visible = entry.isIntersecting;
            if (visible) loadRest();
            play();
          });
        }, { threshold: 0.25, rootMargin: '200px' }).observe(gal);
      } else {
        visible = true;
        loadRest();
        play();
      }

      ['pointerdown', 'keydown'].forEach(function (evt) {
        zone.addEventListener(evt, loadRest, { once: true });
      });
    });
  }

  function boot() {
    initReveal();
    initHeroLines();
    initCounters();
    initParallax();
    initBar();
    initNav();
    initMore();
    initSelects();
    initTheme();
    initFaq();
    initNudge();
    initPalettePicker();
    initAnchors();
    initHashLanding();
    initGalleries();
    initToc();
    initToTop();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();