/* SaveMateKSA bill calculator UI (v3: all sectors, usage / bill-amount modes, increase vs 500 SAR support) */
(function () {
  var B = window.BillCalc; if (!B) return;
  var mode = 'use';
  function $(id) { return document.getElementById(id); }
  function fmt(n) { return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function whole(n) { return n.toLocaleString('en-US', { maximumFractionDigits: 2 }); }
  function hal(r) { return whole(Math.round(r * 10000) / 100); }   // SAR rate -> halalas text
  function signed(n) { return (n > 0 ? '+' : n < 0 ? '−' : '') + fmt(Math.abs(n)); }
  function row(label, val, cls) { return '<div class="bc-row' + (cls ? ' ' + cls : '') + '"><span>' + label + '</span><b>' + val + ' <small>ريال</small></b></div>'; }
  function totals(r) { return row('المجموع قبل الضريبة', fmt(r.subtotal), 'bc-sub') + row('ضريبة القيمة المضافة 15%', fmt(r.vat)) + row('الإجمالي مع الضريبة', fmt(r.total), 'bc-total'); }
  // Accept Western and Arabic-Indic digits, Arabic decimal mark, and thousands separators.
  function norm(s) {
    return String(s).replace(/[٠-٩]/g, function (d) { return '٠١٢٣٤٥٦٧٨٩'.indexOf(d); })
                    .replace(/[۰-۹]/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'.indexOf(d); })
                    .replace(/٫/g, '.').replace(/[,٬،\s]/g, '').replace(/[^\d.]/g, '');
  }
  function raw(id) { return norm($(id).value); }
  function val(id) { var v = parseFloat(raw(id)); return isFinite(v) ? v : 0; }

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
  function syncWaterFields() {
    var s = $('w-sector').value;
    $('w-units-wrap').hidden = s !== 'res';
    $('w-meter-wrap').hidden = s === 'gov';
    $('w-two').classList.toggle('single', s !== 'res');
  }
  function eNote(sec) {
    var T = B.E_NEW[sec], f = T.fixed;
    var price = T.r2 == null ? 'السعر: ' + hal(T.r1) + ' هللة لكل كيلوواط ساعة (شريحة واحدة).' : 'السعر: ' + hal(T.r1) + ' هللة لكل كيلوواط ساعة حتى 6,000، و' + hal(T.r2) + ' هللة لما يزيد عن ذلك.';
    return price + ' الرسم الثابت: ' + f.join(' أو ') + ' ريال حسب سعة القاطع (من 300 أمبير فأكثر الرسم نفسه).';
  }
  function wNote(sec) {
    if (sec === 'non') return 'القطاع غير السكني: 8 ريال للمتر المكعب للمياه و4 للصرف الصحي، ورسم ثابت حسب قطر العداد: 40 أو 60 أو 80 أو 100 أو 150 ريال للمياه (ونصفها للصرف).';
    if (sec === 'gov') return 'القطاع الحكومي: 10 ريال للمتر المكعب للمياه و5 للصرف الصحي، ورسم شهري ثابت 1,000 ريال للمياه و500 للصرف.';
    return 'الشرائح: 1 ثم 2 ثم 4 ثم 6 ريال للمتر المكعب، والصرف الصحي نصف سعر الماء. ولكل وحدة سكنية إضافية على العداد نفسه 20 ريالًا للماء و10 للصرف. نقسم استهلاك العداد بالتساوي على الوحدات، مثل حاسبة المياه الوطنية الرسمية.';
  }

  function render() {
    var sec = $('e-sector').value, wsec = $('w-sector').value;
    var breaker = $('e-breaker').value, days = raw('e-days') || '30';
    var fee = val('e-fee'), amount = val('e-bill');
    var needBill = mode === 'bill' && !(amount > 0);
    var kwh = mode === 'bill' ? B.kwhFromOldBill({ amount: amount, meterFee: fee, sector: sec }) : val('e-kwh');

    var wo = { sector: wsec, units: raw('w-units'), m3: raw('w-m3'), meter: $('w-meter').value, sewer: $('w-sewer').checked };
    var e = B.electricity({ kwh: kwh, breaker: breaker, days: days, sector: sec }), w = B.water(wo);

    $('e-derived').textContent = mode === 'bill' ? (needBill ? 'اكتب مبلغ فاتورتك الحالية لنقدّر استهلاكك.' : 'استهلاكك التقريبي من الفاتورة: ' + whole(Math.round(kwh)) + ' كيلوواط ساعة') : '';
    $('e-note').textContent = eNote(sec);
    $('w-note').textContent = wNote(wsec);

    var eh = '';
    if (needBill) {
      eh = '<p class="bc-hint">اكتب مبلغ فاتورة الكهرباء الحالية (شاملة الضريبة) لنحسب فاتورتك الجديدة.</p>';
    } else {
      if (e.flat) eh += row(whole(e.t1) + ' كيلوواط ساعة × ' + hal(e.rate1) + ' هللة', fmt(e.c1));
      else {
        eh += row('أول ' + whole(e.t1) + ' كيلوواط ساعة × ' + hal(e.rate1) + ' هللة', fmt(e.c1));
        if (e.t2 > 0) eh += row('الزيادة فوق 6,000 (' + whole(e.t2) + ' كيلوواط ساعة) × ' + hal(e.rate2) + ' هللة', fmt(e.c2));
      }
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
    if (wsec === 'res') for (var i = 0; i < 4; i++) if (w.bands[i] > 0) tiers.push(names[i] + ' ' + whole(w.bands[i]));
    $('w-tiers').textContent = tiers.length ? 'توزيع استهلاك الوحدة الواحدة على الشرائح (بالمتر المكعب): ' + tiers.join(' · ') : '';

    if (needBill) {
      $('all-out').innerHTML = '<p class="bc-hint light">أدخل مبلغ فاتورة الكهرباء لعرض الإجمالي.</p>';
      $('save-tip').innerHTML = '';
    } else {
      $('all-out').innerHTML = row('كهرباء + ماء قبل الضريبة', fmt(e.subtotal + w.subtotal)) + row('الإجمالي مع الضريبة 15%', fmt(e.total + w.total), 'bc-total');
      var e2 = B.electricity({ kwh: kwh * 0.9, breaker: breaker, days: days, sector: sec });
      var w2 = B.water({ sector: wsec, units: wo.units, m3: parseFloat(wo.m3) * 0.9, meter: wo.meter, sewer: wo.sewer });
      var save = (e.total + w.total) - (e2.total + w2.total);
      $('save-tip').innerHTML = save > 0.005 ? 'لو خفضت استهلاك الكهرباء والماء <b>10%</b>، توفر تقريبًا <b>' + fmt(save) + ' ريال</b> بالشهر (مع الضريبة).' : '';
    }

    var oldE = null, eNoteTag = '';
    if (mode === 'bill') { if (amount > 0) oldE = amount; }
    else { oldE = B.oldElectricity({ kwh: kwh, meterFee: fee, sector: sec }).total; eNoteTag = ' (تقدير)'; }
    var oldW = val('w-old') > 0 ? val('w-old') : null;
    var sType = $('s-type').value;
    var c = B.compare({ newElec: e.total, newWater: w.total, oldElec: oldE, oldWater: oldW, support: sType });
    var ch = '';
    if (oldE == null) {
      ch = '<p class="bc-hint">اكتب مبلغ فاتورة الكهرباء الحالية لنقارن الزيادة.</p>';
    } else {
      ch += row('الكهرباء الآن' + eNoteTag, fmt(oldE)) + row('الكهرباء بعد التعديل', fmt(e.total)) + row('زيادة الكهرباء', signed(c.elecIncrease), 'bc-sub');
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

  ['e-sector', 'e-kwh', 'e-bill', 'e-breaker', 'e-days', 'w-sector', 'w-units', 'w-m3', 'w-meter', 'w-sewer', 'w-old', 's-type'].forEach(function (id) {
    var el = $(id); if (!el) return; el.addEventListener('input', render); el.addEventListener('change', render);
  });
  $('e-breaker').addEventListener('change', function () { syncFee(); render(); });
  $('w-sector').addEventListener('change', function () { syncWaterFields(); render(); });
  $('e-fee').addEventListener('input', function () { this.setAttribute('data-touched', '1'); render(); });
  $('mode-use').addEventListener('click', function () { setMode('use'); });
  $('mode-bill').addEventListener('click', function () { setMode('bill'); });
  var reset = $('bc-reset');
  if (reset) reset.addEventListener('click', function () {
    $('e-sector').value = 'residential'; $('w-sector').value = 'res';
    $('e-kwh').value = 1500; $('e-bill').value = ''; $('e-breaker').value = 0; $('e-days').value = 30; $('e-fee').removeAttribute('data-touched'); syncFee();
    $('w-units').value = 1; $('w-m3').value = 25; $('w-meter').value = 0; $('w-sewer').checked = true; $('w-old').value = ''; $('s-type').value = 'none';
    syncWaterFields(); setMode('use');
  });
  syncFee(); syncWaterFields(); setMode('use');
})();
