/* SaveMateKSA bill calculator UI (v2: usage mode, bill-amount mode, increase vs 500 SAR support) */
(function () {
  var B = window.BillCalc; if (!B) return;
  var mode = 'use';
  function $(id) { return document.getElementById(id); }
  function fmt(n) { return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function whole(n) { return n.toLocaleString('en-US', { maximumFractionDigits: 2 }); }
  function signed(n) { return (n > 0 ? '+' : n < 0 ? '−' : '') + fmt(Math.abs(n)); }
  function row(label, val, cls) { return '<div class="bc-row' + (cls ? ' ' + cls : '') + '"><span>' + label + '</span><b>' + val + ' <small>ريال</small></b></div>'; }
  function totals(r) { return row('المجموع قبل الضريبة', fmt(r.subtotal), 'bc-sub') + row('ضريبة القيمة المضافة 15%', fmt(r.vat)) + row('الإجمالي مع الضريبة', fmt(r.total), 'bc-total'); }
  function val(id) { var v = parseFloat($(id).value); return isFinite(v) ? v : 0; }

  function setMode(m) {
    mode = m;
    ['use', 'bill'].forEach(function (k) { var b = $('mode-' + k); b.setAttribute('aria-selected', k === m ? 'true' : 'false'); b.classList.toggle('on', k === m); });
    [].forEach.call(document.querySelectorAll('[data-only]'), function (el) { el.hidden = el.getAttribute('data-only') !== m; });
    render();
  }

  function syncFee() {
    var f = $('e-fee');
    if (f.getAttribute('data-touched') !== '1') f.value = B.OLD_METER_FEE[parseInt($('e-breaker').value, 10) || 0];
  }

  function render() {
    var breaker = $('e-breaker').value, days = $('e-days').value;
    var fee = val('e-fee');
    var amount = val('e-bill');
    var needBill = mode === 'bill' && !(amount > 0);
    var kwh = mode === 'bill' ? B.kwhFromOldBill({ amount: amount, meterFee: fee }) : val('e-kwh');

    var wo = { units: $('w-units').value, m3: $('w-m3').value, meter: $('w-meter').value, sewer: $('w-sewer').checked };
    var e = B.electricity({ kwh: kwh, breaker: breaker, days: days }), w = B.water(wo);

    // derived kWh line (bill mode)
    $('e-derived').textContent = mode === 'bill' ? (needBill ? 'اكتب مبلغ فاتورتك الحالية لنقدّر استهلاكك.' : 'استهلاكك التقريبي من الفاتورة: ' + whole(Math.round(kwh)) + ' كيلوواط ساعة') : '';

    var eh = '';
    if (needBill) {
      eh = '<p class="bc-hint">اكتب مبلغ فاتورة الكهرباء الحالية (شاملة الضريبة) لنحسب فاتورتك الجديدة.</p>';
    } else {
      eh += row('أول ' + whole(e.t1) + ' كيلوواط ساعة × 21 هللة', fmt(e.c1));
      if (e.t2 > 0) eh += row('الزيادة فوق 6,000 (' + whole(e.t2) + ' كيلوواط ساعة) × 33 هللة', fmt(e.c2));
      eh += row('الرسم الثابت' + (Number(days) !== 30 ? ' (حسب أيام الفاتورة)' : ''), fmt(e.fixed));
      eh += totals(e);
    }
    $('e-out').innerHTML = eh;

    var names = ['الأولى', 'الثانية', 'الثالثة', 'الرابعة'];
    var wh = row('استهلاك المياه' + (w.units > 1 ? ' (' + w.units + ' وحدات)' : ''), fmt(w.waterCons));
    if (wo.sewer) wh += row('الصرف الصحي', fmt(w.sewerCons));
    wh += row('الرسم الشهري الثابت (المياه' + (wo.sewer ? ' والصرف' : '') + ')', fmt(w.waterFixed + w.sewerFixed));
    wh += totals(w);
    $('w-out').innerHTML = wh;
    var tiers = [];
    for (var i = 0; i < 4; i++) if (w.bands[i] > 0) tiers.push(names[i] + ' ' + whole(w.bands[i]));
    $('w-tiers').textContent = tiers.length ? 'توزيع استهلاك الوحدة الواحدة على الشرائح (بالمتر المكعب): ' + tiers.join(' · ') : '';

    if (needBill) {
      $('all-out').innerHTML = '<p class="bc-hint light">أدخل مبلغ فاتورة الكهرباء لعرض الإجمالي.</p>';
      $('save-tip').innerHTML = '';
    } else {
      $('all-out').innerHTML = row('كهرباء + ماء قبل الضريبة', fmt(e.subtotal + w.subtotal)) + row('الإجمالي مع الضريبة 15%', fmt(e.total + w.total), 'bc-total');
      var e2 = B.electricity({ kwh: kwh * 0.9, breaker: breaker, days: days });
      var w2 = B.water({ units: wo.units, m3: parseFloat(wo.m3) * 0.9, meter: wo.meter, sewer: wo.sewer });
      var save = (e.total + w.total) - (e2.total + w2.total);
      $('save-tip').innerHTML = save > 0.005 ? 'لو خفضت استهلاك الكهرباء والماء <b>10%</b>، توفر تقريبًا <b>' + fmt(save) + ' ريال</b> بالشهر (مع الضريبة).' : '';
    }

    // comparison with support
    var oldE = null, eNote = '';
    if (mode === 'bill') { if (amount > 0) oldE = amount; }
    else { oldE = B.oldElectricity({ kwh: kwh, meterFee: fee }).total; eNote = ' (تقدير)'; }
    var oldWraw = $('w-old').value; var oldW = parseFloat(oldWraw) > 0 ? parseFloat(oldWraw) : null;
    var sType = $('s-type').value;
    var c = B.compare({ newElec: e.total, newWater: w.total, oldElec: oldE, oldWater: oldW, support: sType });
    var ch = '';
    if (oldE == null) {
      ch = '<p class="bc-hint">اكتب مبلغ فاتورة الكهرباء الحالية لنقارن الزيادة.</p>';
    } else {
      ch += row('الكهرباء الآن' + eNote, fmt(oldE)) + row('الكهرباء بعد التعديل', fmt(e.total)) + row('زيادة الكهرباء', signed(c.elecIncrease), 'bc-sub');
      if (oldW != null) ch += row('الماء الآن', fmt(oldW)) + row('الماء بعد التعديل', fmt(w.total)) + row('زيادة الماء', signed(c.waterIncrease), 'bc-sub');
      ch += row('إجمالي الزيادة الشهرية' + (c.partial ? ' (الكهرباء فقط)' : ''), signed(c.totalIncrease), 'bc-total');
      if (c.support > 0) {
        ch += row('دعم 500 ريال شهريًا', fmt(c.support));
        ch += c.net >= 0 ? '<p class="bc-verdict ok">الدعم يغطي الزيادة ويبقى لك تقريبًا <b>' + fmt(c.net) + ' ريال</b> بالشهر.</p>'
                         : '<p class="bc-verdict bad">الزيادة تتجاوز الدعم بحوالي <b>' + fmt(-c.net) + ' ريال</b> بالشهر.</p>';
      } else {
        ch += '<p class="bc-verdict">' + (sType === 'private' ? 'هذا القرار لا يتضمن دعمًا مباشرًا للعاملين في القطاع الخاص، لكنه يرفع الحد الأدنى للأجر المحتسب في «نطاقات».' : 'اختر وضعك أعلاه لمقارنة الزيادة بالدعم.') + '</p>';
      }
    }
    $('cmp-out').innerHTML = ch;
    $('cmp-note').textContent = (oldW == null && oldE != null) ? 'أضف فاتورة الماء الحالية (اختياري، في بطاقة الماء) لتشمل المقارنة زيادة الماء أيضًا.' : '';
  }

  ['e-kwh', 'e-bill', 'e-breaker', 'e-days', 'w-units', 'w-m3', 'w-meter', 'w-sewer', 'w-old', 's-type'].forEach(function (id) {
    var el = $(id); if (!el) return; el.addEventListener('input', render); el.addEventListener('change', render);
  });
  $('e-breaker').addEventListener('change', function () { syncFee(); render(); });
  $('e-fee').addEventListener('input', function () { this.setAttribute('data-touched', '1'); render(); });
  $('mode-use').addEventListener('click', function () { setMode('use'); });
  $('mode-bill').addEventListener('click', function () { setMode('bill'); });
  var reset = $('bc-reset');
  if (reset) reset.addEventListener('click', function () {
    $('e-kwh').value = 1500; $('e-bill').value = ''; $('e-breaker').value = 0; $('e-days').value = 30; $('e-fee').removeAttribute('data-touched'); syncFee();
    $('w-units').value = 1; $('w-m3').value = 25; $('w-meter').value = 0; $('w-sewer').checked = true; $('w-old').value = ''; $('s-type').value = 'none'; setMode('use');
  });
  syncFee(); setMode('use');
})();
