

(function () {
  'use strict';

  var root = document.querySelector('[data-tool="greenhouse"]');
  if (!root) return;

  var DATA = JSON.parse(document.getElementById('greenhouse-data').textContent);
  var form = root.querySelector('form');
  var out = root.querySelector('[data-result]');

  function pickCovering(snow, preferred) {
    var byId = DATA.coverings.filter(function (c) { return c.id === preferred; })[0];
    if (byId && byId.max_snow >= snow) return { covering: byId, upgraded: false };
    var fit = DATA.coverings.filter(function (c) { return c.max_snow >= snow; })
      .sort(function (a, b) { return a.price_sqft - b.price_sqft; })[0];
    return { covering: fit || DATA.coverings[DATA.coverings.length - 1], upgraded: true };
  }

  function trussSpacing(snow) {
    var row = DATA.spacing.filter(function (s) { return snow <= s.max_snow; })[0];
    return row ? row.feet : 2;
  }

  function stat(label, value, unit) {
    return '<div class="pick-stat"><span>' + label + '</span><b>' + value +
      (unit ? '<i>' + unit + '</i>' : '') + '</b></div>';
  }

  function render(p) {
    var area = p.length * p.width;
    var chosen = pickCovering(p.snow, p.covering);
    var c = chosen.covering;
    var spacing = trussSpacing(p.snow);
    var trusses = Math.ceil(p.length / spacing) + 1;

    var cover = area * 1.45 + p.width * p.height * 2;
    var cost = Math.round(cover * c.price_sqft + area * DATA.frame_per_sqft + DATA.door_kit + (p.vent ? DATA.vent_kit : 0));

    out.innerHTML = '';

    var head = document.createElement('div');
    head.className = 'result-head';
    head.innerHTML =
      '<span class="pill">Result</span>' +
      '<h2>' + c.label + ' <span class="dim">at ' + spacing + ' ft truss spacing</span></h2>' +
      '<p class="lede">' + (chosen.upgraded
        ? 'Your snow load is above what the covering you picked is rated for, so this is the cheapest option that actually holds it.'
        : 'The covering you picked is rated above your snow load, so it stays.') + '</p>';
    out.appendChild(head);

    var grid = document.createElement('div');
    grid.className = 'stat-row';
    grid.innerHTML =
      stat('Floor area', area.toLocaleString('en-US'), ' sq ft') +
      stat('Covering', Math.round(cover).toLocaleString('en-US'), ' sq ft') +
      stat('Trusses', trusses, '') +
      stat('Service life', c.life, '') +
      stat('Materials, ballpark', '$' + cost.toLocaleString('en-US'), '');
    out.appendChild(grid);

    var outlets = document.createElement('div');
    outlets.className = 'pick-outlets';
    var html = '<b>Where to go next</b><div class="outlet-row">';
    DATA.outlets.slice(0, 3).forEach(function (o) {
      var internal = o.url.charAt(0) === '/';
      html += '<a class="outlet"' + (internal ? '' : ' rel="sponsored nofollow"') +
              ' href="' + o.url + '">' +
              '<span>' + o.label + '</span><em>' + o.note + '</em></a>';
    });
    html += '</div><p class="fine">' + DATA.disclosure + '</p>';
    outlets.innerHTML = html;
    out.appendChild(outlets);

    out.hidden = false;
    out.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var fd = new FormData(form);
    render({
      length: parseFloat(fd.get('length')) || 24,
      width: parseFloat(fd.get('width')) || 12,
      height: parseFloat(fd.get('height')) || 7,
      snow: parseFloat(fd.get('snow')) || 20,
      covering: fd.get('covering'),
      vent: fd.get('vent') === 'on'
    });
  });

  form.addEventListener('reset', function () { out.hidden = true; out.innerHTML = ''; });
})();