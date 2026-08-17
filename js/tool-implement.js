

(function () {
  'use strict';

  var root = document.querySelector('[data-tool="implement"]');
  if (!root) return;

  var DATA = JSON.parse(document.getElementById('implement-data').textContent);
  var form = root.querySelector('form');
  var out = root.querySelector('[data-result]');

  var VERDICT = {
    ok: { label: 'Runs it', cls: 'is-ok' },
    tight: { label: 'Tight', cls: 'is-tight' },
    no: { label: 'Too much', cls: 'is-no' },
  };

  function fitsHitch(item, cat) {
    return item.cat.map(String).indexOf(String(cat)) !== -1;
  }

  function verdict(item, pto, cat) {
    if (!item.pto_min) return fitsHitch(item, cat) ? 'ok' : 'no';
    if (!fitsHitch(item, cat)) return 'no';
    if (pto >= item.pto_ok) return 'ok';
    if (pto >= item.pto_min) return 'tight';
    return 'no';
  }

  function reason(item, pto, v) {
    if (v === 'no' && !fitsHitch(item, currentCat)) {
      return 'Hitch category does not match — the pins and lower links are a different size.';
    }
    if (!item.pto_min) return 'No PTO drive: the limit here is weight and lift capacity, ' + item.weight + ' lb.';
    if (v === 'ok') return 'Comfortable: needs ' + item.pto_ok + ' hp at the PTO, you have ' + pto + '.';
    if (v === 'tight') return 'Works in light going: the minimum is ' + item.pto_min + ' hp, comfortable is ' + item.pto_ok + '.';
    return 'Short by ' + Math.round(item.pto_min - pto) + ' hp at the PTO.';
  }

  var currentCat = '1';

  function stat(label, value, unit) {
    return '<div class="pick-stat"><span>' + label + '</span><b>' + value +
      (unit ? '<i>' + unit + '</i>' : '') + '</b></div>';
  }

  function render(p) {
    currentCat = p.cat;
    var jobs = p.jobs.length ? p.jobs : DATA.jobs.map(function (j) { return j.id; });

    var list = DATA.implements
      .filter(function (i) { return jobs.indexOf(i.job) !== -1; })
      .map(function (i) { return { item: i, v: verdict(i, p.pto, p.cat) }; });

    var order = { ok: 0, tight: 1, no: 2 };
    list.sort(function (a, b) {
      if (order[a.v] !== order[b.v]) return order[a.v] - order[b.v];
      return (b.item.pto_ok || 0) - (a.item.pto_ok || 0);
    });

    var fits = list.filter(function (r) { return r.v === 'ok'; }).length;
    var tight = list.filter(function (r) { return r.v === 'tight'; }).length;

    out.innerHTML = '';

    var head = document.createElement('div');
    head.className = 'result-head';
    head.innerHTML =
      '<span class="pill">Result</span>' +
      '<h2>' + fits + ' of ' + list.length + ' <span class="dim">run comfortably on ' + p.pto + ' PTO hp</span></h2>' +
      '<p class="lede">' + (tight ? tight + ' more will work but with no margin — in wet grass or heavy soil they will pull the engine down. ' : '') +
      'Engine horsepower is always higher than PTO horsepower; implements are rated against the PTO figure.</p>';
    out.appendChild(head);

    var grid = document.createElement('div');
    grid.className = 'stat-row';
    grid.innerHTML =
      stat('PTO horsepower', p.pto, ' hp') +
      stat('Hitch', 'Cat ' + p.cat, '') +
      stat('Runs comfortably', fits, '') +
      stat('Tight', tight, '');
    out.appendChild(grid);

    var table = document.createElement('div');
    table.className = 'match-list';
    var html = '';
    list.forEach(function (r) {
      var v = VERDICT[r.v];
      html +=
        '<div class="match ' + v.cls + '">' +
        '<div class="match-top"><b>' + r.item.label + '</b><span class="match-verdict">' + v.label + '</span></div>' +
        '<p>' + reason(r.item, p.pto, r.v) + '</p>' +
        '<span class="match-meta">' +
        (r.item.pto_min ? r.item.pto_min + '-' + r.item.pto_ok + ' hp at PTO · ' : 'no PTO drive · ') +
        'Cat ' + r.item.cat.join('/') + ' · ' + r.item.weight + ' lb</span>' +
        '</div>';
    });
    table.innerHTML = html;
    out.appendChild(table);

    var outlets = document.createElement('div');
    outlets.className = 'pick-outlets';
    var oh = '<b>Where to go next</b><div class="outlet-row">';
    DATA.outlets.slice(0, 3).forEach(function (o) {
      var internal = o.url.charAt(0) === '/';
      oh += '<a class="outlet"' + (internal ? '' : ' rel="sponsored nofollow"') +
              ' href="' + o.url + '">' +
              '<span>' + o.label + '</span><em>' + o.note + '</em></a>';
    });
    oh += '</div><p class="fine">' + DATA.disclosure + '</p>';
    outlets.innerHTML = oh;
    out.appendChild(outlets);

    out.hidden = false;
    out.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var fd = new FormData(form);
    render({
      pto: parseFloat(fd.get('pto')) || 20,
      cat: fd.get('cat') || '1',
      jobs: fd.getAll('jobs'),
    });
  });

  form.addEventListener('reset', function () { out.hidden = true; out.innerHTML = ''; });
})();