

(function () {
  'use strict';

  var root = document.querySelector('[data-tool="lighting"]');
  if (!root) return;

  var DATA = JSON.parse(document.getElementById('lighting-data').textContent);
  var form = root.querySelector('form');
  var out = root.querySelector('[data-result]');

  var SQFT_TO_SQM = 0.092903;

  function pick(list, id, fallbackIndex) {
    return list.filter(function (x) { return x.id === id; })[0] || list[fallbackIndex || 0];
  }

  function stat(label, value, unit) {
    return '<div class="pick-stat"><span>' + label + '</span><b>' + value +
      (unit ? '<i>' + unit + '</i>' : '') + '</b></div>';
  }

  function render(p) {
    var crop = pick(DATA.crops, p.crop, 0);
    var fixture = pick(DATA.fixtures, p.fixture, 0);
    var util = pick(DATA.utilisation, p.space, 0);

    var hours = p.hours || crop.hours;
    var area = Math.max(1, p.width * p.length) * SQFT_TO_SQM;

    function ppfdFor(dli) { return (dli * 1e6) / (hours * 3600); }

    var ppfdMin = ppfdFor(crop.dli_min);
    var ppfdOk = ppfdFor(crop.dli_ok);

    var ppfNeeded = (ppfdOk * area) / util.factor;
    var ppfPerFixture = fixture.efficacy * fixture.watt;
    var fixtures = Math.max(1, Math.ceil(ppfNeeded / ppfPerFixture));

    var watts = fixtures * fixture.watt;
    var kwhMonth = (watts / 1000) * hours * 30;
    var costMonth = kwhMonth * (p.price || DATA.default_kwh_price);

    var ppfActual = fixtures * ppfPerFixture * util.factor;
    var ppfdActual = ppfActual / area;
    var dliActual = (ppfdActual * hours * 3600) / 1e6;

    out.innerHTML = '';

    var head = document.createElement('div');
    head.className = 'result-head';
    head.innerHTML =
      '<span class="pill">Result</span>' +
      '<h2>' + fixtures + ' fixture' + (fixtures > 1 ? 's' : '') +
      ' <span class="dim">for ' + Math.round(p.width * p.length) + ' sq ft of ' + crop.label.toLowerCase() + '</span></h2>' +
      '<p class="lede">That lands you at about ' + Math.round(dliActual) + ' mol per square metre per day at ' +
      hours + ' hours of light — the target band for this crop is ' + crop.dli_min + ' to ' + crop.dli_ok +
      '. Watts are the result of this calculation, never the input.</p>';
    out.appendChild(head);

    var grid = document.createElement('div');
    grid.className = 'stat-row';
    grid.innerHTML =
      stat('Daily light integral', Math.round(dliActual), ' mol/m²') +
      stat('Light at canopy', Math.round(ppfdActual), ' µmol/m²/s') +
      stat('Draw', watts, ' W') +
      stat('Electricity', '$' + costMonth.toFixed(0), ' /mo');
    out.appendChild(grid);

    var over = dliActual > crop.dli_ok * 1.25;
    var state = over ? 'is-tight' : dliActual >= crop.dli_ok ? 'is-ok' : dliActual >= crop.dli_min ? 'is-ok' : 'is-no';
    var stateLabel = over ? 'Above target' : dliActual >= crop.dli_ok ? 'On target' : dliActual >= crop.dli_min ? 'Lean' : 'Short';
    var overNote = over
      ? ' One fixture already overshoots this area — dim it, raise it, or run a shorter photoperiod ' +
        'rather than paying for light the crop cannot use.'
      : '';

    var detail = document.createElement('div');
    detail.className = 'match-list';
    detail.innerHTML =
      '<div class="match ' + state + '">' +
        '<div class="match-top"><b>Where you land</b><span class="match-verdict">' + stateLabel + '</span></div>' +
        '<p>Target band ' + crop.dli_min + '-' + crop.dli_ok + ' mol/m²/day. Needed ' +
        Math.round(ppfdOk) + ' µmol/m²/s at the canopy, minimum useful is ' + Math.round(ppfdMin) + '.' + overNote + '</p>' +
        '<span class="match-meta">' + fixture.label + ' · ' + fixture.efficacy +
        ' µmol/J · ' + fixture.watt + ' W each</span>' +
      '</div>' +
      '<div class="match">' +
        '<div class="match-top"><b>Losses to the room</b><span class="match-verdict">' +
        Math.round((1 - util.factor) * 100) + '%</span></div>' +
        '<p>' + util.label + '. Light that misses the canopy is paid for and not used — reflective walls are ' +
        'cheaper than another fixture.</p>' +
        '<span class="match-meta">' + Math.round(ppfNeeded) + ' µmol/s needed out of the fixtures</span>' +
      '</div>' +
      '<div class="match">' +
        '<div class="match-top"><b>Photoperiod</b><span class="match-verdict">' + hours + ' h</span></div>' +
        '<p>The same fixtures give a different daily total on a different schedule: an hour more light is ' +
        'the cheapest way to add ' + (ppfdActual * 3600 / 1e6).toFixed(1) + ' mol per day here.</p>' +
        '<span class="match-meta">' + Math.round(kwhMonth) + ' kWh per month at this schedule</span>' +
      '</div>';
    out.appendChild(detail);

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
      width: parseFloat(fd.get('width')) || 4,
      length: parseFloat(fd.get('length')) || 4,
      crop: fd.get('crop'),
      fixture: fd.get('fixture'),
      space: fd.get('space'),
      hours: parseFloat(fd.get('hours')) || 0,
      price: parseFloat(fd.get('price')) || 0,
    });
  });

  form.addEventListener('reset', function () { out.hidden = true; out.innerHTML = ''; });
})();