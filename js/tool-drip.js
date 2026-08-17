

(function () {
  'use strict';

  var root = document.querySelector('[data-tool="drip"]');
  if (!root) return;

  var DATA = JSON.parse(document.getElementById('drip-data').textContent);
  var form = root.querySelector('form');
  var out = root.querySelector('[data-result]');

  var GAL_PER_SQFT_INCH = 0.623;

  function num(v, fallback) {
    var n = parseFloat(v);
    return isFinite(n) ? n : fallback;
  }

  function calc(p) {
    var crop = DATA.crops.filter(function (c) { return c.id === p.crop; })[0] || DATA.crops[0];

    var rows = Math.max(1, Math.floor(p.width * 12 / p.rowSpacing));
    var tapeFeet = rows * p.length;
    var plantsPerRow = Math.max(1, Math.floor(p.length * 12 / crop.spacing));
    var emitters = rows * plantsPerRow;

    var gallonsPerDay = emitters * crop.gpd;
    var gpm = gallonsPerDay / 60;

    var cost = tapeFeet * DATA.parts.tape_per_ft
      + rows * DATA.parts.header_per_ft * p.width
      + DATA.parts.filter + DATA.parts.regulator + (p.timer ? DATA.parts.timer : 0);

    return {
      rows: rows,
      tapeFeet: Math.round(tapeFeet),
      emitters: emitters,
      gallonsPerDay: Math.round(gallonsPerDay),
      gpm: Math.round(gpm * 100) / 100,
      cost: Math.round(cost),
      crop: crop,
      area: p.length * p.width
    };
  }

  

  function lookupCoords(zip) {
    var prefix = zip.slice(0, 2);
    return fetch('/acrejournal/data/zip/' + prefix + '.json')
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (table) {
        if (!table) return null;
        if (table[zip]) return { coords: table[zip], exact: true };

        var keys = Object.keys(table);
        var target = parseInt(zip, 10);
        var best = null, bestDiff = Infinity;
        keys.forEach(function (k) {
          var diff = Math.abs(parseInt(k, 10) - target);
          if (diff < bestDiff) { bestDiff = diff; best = k; }
        });
        if (best && bestDiff <= 50) return { coords: table[best], exact: false, near: best };
        return null;
      });
  }

  function soilQuery(lat, lon) {
    var sql =
      "SELECT TOP 1 c.compname, c.comppct_r, ch.awc_r, mu.muname " +
      "FROM mapunit mu " +
      "INNER JOIN component c ON c.mukey = mu.mukey " +
      "INNER JOIN chorizon ch ON ch.cokey = c.cokey " +
      "WHERE mu.mukey IN (SELECT * FROM SDA_Get_Mukey_from_intersection_with_WktWgs84('point(" +
      lon + " " + lat + ")')) " +
      "AND ch.awc_r IS NOT NULL " +
      "ORDER BY c.comppct_r DESC, ch.hzdept_r ASC";

    return fetch(DATA.soil.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ format: 'JSON+COLUMNNAME', query: sql })
    })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data || !data.Table || data.Table.length < 2) return null;
        var head = data.Table[0];
        var row = data.Table[1];
        var obj = {};
        head.forEach(function (k, i) { obj[k] = row[i]; });
        var awc = parseFloat(obj.awc_r);
        return isFinite(awc) ? { name: obj.compname, series: obj.muname, awc: awc } : null;
      })
      .catch(function () { return null; });
  }

  function lookupSoil(coords) {
    var lat = coords[0], lon = coords[1];
    var probes = [
      [lat, lon],
      [lat + 0.03, lon],
      [lat - 0.03, lon],
      [lat, lon + 0.03],
      [lat, lon - 0.03]
    ];

    return probes.reduce(function (chain, pt) {
      return chain.then(function (found) {
        return found ? found : soilQuery(pt[0], pt[1]);
      });
    }, Promise.resolve(null));
  }

  function soilBlock(soil, r, found) {
    var availableIn = soil.awc * r.crop.root_in;
    var allowableIn = availableIn * DATA.soil.allowable_depletion;
    var inchesPerDay = r.gallonsPerDay / (r.area * GAL_PER_SQFT_INCH);
    var days = inchesPerDay > 0 ? allowableIn / inchesPerDay : 0;

    var el = document.createElement('div');
    el.className = 'soil-box';
    el.innerHTML =
      '<b>Your soil</b>' +
      '<p class="soil-name">' + soil.series + '</p>' +
      '<div class="stat-row">' +
        '<div class="pick-stat"><span>Water holding</span><b>' + soil.awc.toFixed(2) + '<i> in/in</i></b></div>' +
        '<div class="pick-stat"><span>Root zone storage</span><b>' + availableIn.toFixed(1) + '<i> in</i></b></div>' +
        '<div class="pick-stat"><span>Irrigate every</span><b>' + (days >= 1 ? days.toFixed(1) : days.toFixed(2)) + '<i> days</i></b></div>' +
      '</div>' +
      '<p class="fine">Soil data for your ZIP comes from the ' +
      '<a href="' + DATA.soil.source_url + '" rel="nofollow">' + DATA.soil.source_label + '</a>. ' +
      'The interval assumes you refill at ' + Math.round(DATA.soil.allowable_depletion * 100) +
      '% depletion and peak-season demand.' +
      (found && !found.exact ? ' Your ZIP has no mapped area of its own, so we used the nearest one, ' + found.near + '.' : '') +
      '</p>';
    return el;
  }

  function stat(label, value, unit) {
    return '<div class="pick-stat"><span>' + label + '</span><b>' +
      value.toLocaleString('en-US') + (unit ? '<i>' + unit + '</i>' : '') + '</b></div>';
  }

  function render(p) {
    var r = calc(p);
    out.innerHTML = '';

    var head = document.createElement('div');
    head.className = 'result-head';
    head.innerHTML =
      '<span class="pill">Result</span>' +
      '<h2>' + r.tapeFeet.toLocaleString('en-US') + ' ft of tape <span class="dim">across ' + r.rows + ' rows</span></h2>' +
      '<p class="lede">Numbers assume ' + r.crop.label.toLowerCase() +
      ' at ' + r.crop.spacing + '" spacing and peak-season demand — early season needs roughly half of this.</p>';
    out.appendChild(head);

    var grid = document.createElement('div');
    grid.className = 'stat-row';
    grid.innerHTML =
      stat('Drip tape', r.tapeFeet, ' ft') +
      stat('Emitters', r.emitters, '') +
      stat('Water per day', r.gallonsPerDay, ' gal') +
      stat('Flow needed', r.gpm, ' gpm') +
      stat('Parts, ballpark', r.cost, ' $');
    out.appendChild(grid);

    var soilSlot = document.createElement('div');
    out.appendChild(soilSlot);

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

    if (/^\d{5}$/.test(p.zip)) {
      soilSlot.innerHTML = '<p class="soil-loading">Looking up soil for ' + p.zip + '…</p>';
      lookupCoords(p.zip)
        .then(function (found) {
          if (!found) throw new Error('zip not found');
          return lookupSoil(found.coords).then(function (soil) {
            return { soil: soil, found: found };
          });
        })
        .then(function (res) {
          if (!res.soil || !isFinite(res.soil.awc)) throw new Error('no soil');
          soilSlot.innerHTML = '';
          soilSlot.appendChild(soilBlock(res.soil, r, res.found));
        })
        .catch(function () {
          soilSlot.innerHTML = '<p class="soil-loading">' +
            'We could not read soil data for that ZIP — the numbers above still hold, ' +
            'they just assume average soil.</p>';
        });
    }
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var fd = new FormData(form);
    render({
      length: num(fd.get('length'), 100),
      width: num(fd.get('width'), 30),
      rowSpacing: num(fd.get('rowSpacing'), 36),
      crop: fd.get('crop'),
      zip: (fd.get('zip') || '').trim(),
      timer: fd.get('timer') === 'on'
    });
  });

  form.addEventListener('reset', function () {
    out.hidden = true;
    out.innerHTML = '';
  });
})();