

(function () {
  'use strict';

  var root = document.querySelector('[data-tool="sizing"]');
  if (!root) return;

  var DATA = JSON.parse(document.getElementById('sizing-data').textContent);
  var models = DATA.models;
  var outlets = DATA.outlets;

  var form = root.querySelector('form');
  var out = root.querySelector('[data-result]');

  
  function neededClass(acres, tasks) {
    var score = 0;
    if (acres >= 10) score += 2;
    else if (acres >= 3) score += 1;
    if (tasks.indexOf('loader') !== -1) score += 1;
    if (tasks.indexOf('hay') !== -1) score += 2;
    if (tasks.indexOf('land') !== -1) score += 1;
    if (tasks.indexOf('mowing') !== -1 && acres < 3) score -= 1;
    if (score >= 3) return 'compact';
    if (score >= 1) return 'compact';
    return 'sub-compact';
  }

  function scoreModel(m, params) {
    var s = 0;
    if (m.klass === params.klass) s += 30;

    params.tasks.forEach(function (t) {
      if (m.tasks.indexOf(t) !== -1) s += 12;
    });

    
    if (params.budget && typeof m.price === 'number') {
      if (m.price <= params.budget) s += 18;
      else if (m.price <= params.budget * 1.12) s += 6;
      else s -= 25;
    }

    if (params.tasks.indexOf('hay') !== -1 || params.tasks.indexOf('land') !== -1) {
      if (typeof m.lift === 'number') s += Math.min(12, Math.round(m.lift / 200));
    }
    if (params.tasks.indexOf('loader') !== -1) {
      if (typeof m.loader === 'number') s += Math.min(10, Math.round(m.loader / 150));
    }
    return s;
  }

  function money(v) {
    return '$' + v.toLocaleString('en-US');
  }

  
  function priceCell(m) {
    if (typeof m.price === 'number') {
      return money(m.price) + (m.price_year ? '<i> ' + m.price_year + '</i>' : '');
    }
    if (typeof m.price_last_known === 'number') {
      return money(m.price_last_known) + '<i> ' + (m.price_year || '') + ', last known</i>';
    }
    return 'Dealer quote<i> no list price</i>';
  }

  function spec(v, unit) {
    if (typeof v !== 'number') return 'n/a';
    return v.toLocaleString('en-US') + (unit ? '<i> ' + unit + '</i>' : '');
  }

  function card(m, best) {
    
    var el = document.createElement('a');
    el.className = 'pick' + (best ? ' is-best' : '');
    
    el.href = m.url || m.page || '#';
    if (m.url) el.rel = 'nofollow';
    el.innerHTML =
      '<div class="pick-head">' +
        '<span class="kick">' + (best ? 'Best match' : 'Also fits') + '</span>' +
        '<h3>' + m.brand + ' ' + m.name + '</h3>' +
      '</div>' +
      '<dl class="pick-specs">' +
        '<div><dt>Engine</dt><dd>' + spec(m.hp, 'hp') + '</dd></div>' +
        '<div><dt>PTO</dt><dd>' + spec(m.pto, 'hp') + '</dd></div>' +
        '<div><dt>3-point lift</dt><dd>' + spec(m.lift, 'lb') + '</dd></div>' +
        '<div><dt>Loader lift</dt><dd>' + spec(m.loader, 'lb') + '</dd></div>' +
        '<div><dt>List price</dt><dd>' + priceCell(m) + '</dd></div>' +
      '</dl>' +
      '<p>' + (m.note || '') + '</p>' +
      '<span class="pick-cta">' +
        (m.specs_source === 'manufacturer' ? 'See it at the manufacturer' : 'Open the spec sheet') +
      '</span>';

    if (m.page && m.url) {
      var inner = document.createElement('a');
      inner.className = 'pick-page';
      inner.href = m.page;
      inner.textContent = 'Read our ' + m.name + ' page';
      inner.addEventListener('click', function (e) { e.stopPropagation(); });
      var wrap = document.createElement('div');
      wrap.className = 'pick-wrap';
      wrap.appendChild(el);
      wrap.appendChild(inner);
      return wrap;
    }
    return el;
  }

  function outletsBlock() {
    var wrap = document.createElement('div');
    wrap.className = 'pick-outlets';
    var html = '<b>Where to go next</b><div class="outlet-row">';
    outlets.slice(0, 3).forEach(function (o) {
      var internal = o.url.charAt(0) === '/';
      html += '<a class="outlet"' + (internal ? '' : ' rel="sponsored nofollow"') +
              ' href="' + o.url + '">' +
                '<span>' + o.label + '</span><em>' + o.note + '</em>' +
              '</a>';
    });
    html += '</div><p class="fine">' + DATA.disclosure + '</p>';
    wrap.innerHTML = html;
    return wrap;
  }

  function render(params) {
    var ranked = models
      .filter(function (m) { return !m.unverified && typeof m.hp === 'number'; })
      .map(function (m) { return { m: m, s: scoreModel(m, params) }; })
      .sort(function (a, b) { return b.s - a.s; })
      .slice(0, 3);

    out.innerHTML = '';

    var head = document.createElement('div');
    head.className = 'result-head';
    head.innerHTML =
      '<span class="pill">Result</span>' +
      '<h2>You are looking at a <span class="dim">' + params.klass.replace('-', ' ') + '</span></h2>' +
      '<p class="lede">' + params.acres + ' acres and the jobs you picked put you in this class; ' +
      'below are the three machines that fit closest.</p>';
    out.appendChild(head);

    var grid = document.createElement('div');
    grid.className = 'picks';
    ranked.forEach(function (r, i) { grid.appendChild(card(r.m, i === 0)); });
    out.appendChild(grid);
    out.appendChild(outletsBlock());

    out.hidden = false;
    out.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var fd = new FormData(form);
    var tasks = fd.getAll('task');
    var acres = parseFloat(fd.get('acres') || '2');
    var budget = parseFloat(fd.get('budget') || '0') || null;

    render({
      acres: acres,
      tasks: tasks,
      budget: budget,
      klass: neededClass(acres, tasks)
    });
  });

  form.addEventListener('reset', function () {
    out.hidden = true;
    out.innerHTML = '';
  });
})();