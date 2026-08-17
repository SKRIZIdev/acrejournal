

(function () {
  'use strict';

  var root = document.querySelector('[data-tool="usedvalue"]');
  if (!root) return;

  var DATA = JSON.parse(document.getElementById('usedvalue-data').textContent);
  var form = root.querySelector('form');
  var out = root.querySelector('[data-result]');

  function depreciation(years) {
    var rows = DATA.depreciation;
    if (years <= rows[0].years) return rows[0].factor;
    for (var i = 1; i < rows.length; i++) {
      if (years <= rows[i].years) {
        var a = rows[i - 1], b = rows[i];
        var k = (years - a.years) / (b.years - a.years);
        return a.factor + (b.factor - a.factor) * k;
      }
    }
    return rows[rows.length - 1].factor;
  }

  function stat(label, value, unit) {
    return '<div class="pick-stat"><span>' + label + '</span><b>' + value +
      (unit ? '<i>' + unit + '</i>' : '') + '</b></div>';
  }

  function render(p) {
    var klass = DATA.classes.filter(function (c) { return c.id === p.klass; })[0] || DATA.classes[1];
    var cond = DATA.condition.filter(function (c) { return c.id === p.condition; })[0] || DATA.condition[1];

    var expected = p.years * DATA.hours_norm_per_year;
    var extra = Math.max(0, p.hours - expected);
    var hoursFactor = Math.max(0.55, 1 - (extra / 100) * DATA.hours_penalty_per_100);

    var fair = Math.round(klass.base * depreciation(p.years) * hoursFactor * cond.factor);
    var low = Math.round(fair * 0.9);
    var high = Math.round(fair * 1.1);

    out.innerHTML = '';

    var head = document.createElement('div');
    head.className = 'result-head';
    head.innerHTML =
      '<span class="pill">Result</span>' +
      '<h2>$' + low.toLocaleString('en-US') + ' — $' + high.toLocaleString('en-US') +
      ' <span class="dim">is a fair ask</span></h2>' +
      '<p class="lede">' + klass.label + ', ' + p.years + ' years old with ' +
      p.hours.toLocaleString('en-US') + ' hours' +
      (extra > 0 ? ' — that is ' + Math.round(extra).toLocaleString('en-US') + ' hours above average for its age, which pulls the price down.'
                 : ' — below average use for its age, which holds the price up.') + '</p>';
    out.appendChild(head);

    var grid = document.createElement('div');
    grid.className = 'stat-row';
    grid.innerHTML =
      stat('Fair value', '$' + fair.toLocaleString('en-US'), '') +
      stat('New, ballpark', '$' + klass.base.toLocaleString('en-US'), '') +
      stat('Hours vs average', (extra > 0 ? '+' : '') + Math.round(p.hours - expected).toLocaleString('en-US'), ' h') +
      stat('Condition', cond.label.split(',')[0], '');
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
      klass: fd.get('klass'),
      years: parseFloat(fd.get('years')) || 5,
      hours: parseFloat(fd.get('hours')) || 500,
      condition: fd.get('condition')
    });
  });

  form.addEventListener('reset', function () { out.hidden = true; out.innerHTML = ''; });
})();