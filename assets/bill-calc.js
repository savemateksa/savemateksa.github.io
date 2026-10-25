/* SaveMateKSA bill calculator UI (v4: strict input validation, all sectors, usage / bill-amount modes, increase vs 500 SAR support) */
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
  function hint(t, light) { return '<p class="bc-hint' + (light ? ' light' : '') + '">' + t + '</p>'; }

  // ---- Strict number parsing: Western / Arabic-Indic / Persian digits, Arabic decimal mark, thousands separators. Rejects text, negatives, out-of-range.
  function parseField(id, o) {
    o = o || {};
    var s = $(id).value.trim();
    if (s === '') return { state: 'empty' };
    if (/^[-−–—‐﹣－]/.test(s)) return { state: 'bad', msg: 'القيمة لا يمكن أن تكون سالبة' };
    s = s.replace(/[٠-٩]/g, function (d) { return '٠١٢٣٤٥٦٧٨٩'.indexOf(d); })
         .replace(/[۰-۹]/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'.indexOf(d); })
         .replace(/٫/g, '.').replace(/[,٬،\s]/g, '');
    if (!/^(\d+\.?\d*|\.\d+)$/.test(s)) return { state: 'bad', msg: 'اكتب أرقامًا فقط، مثل 1500' };
    var v = parseFloat(s);
    if (o.int && v % 1 !== 0) return { state: 'bad', msg: 'اكتب رقمًا صحيحًا بدون كسور' };
    if (o.min != null && v < o.min) return { state: 'bad', msg: o.minMsg || ('الحد الأدنى ' + whole(o.min)) };
    if (o.max != null && v > o.max) return { state: 'bad', msg: 'الحد الأقصى ' + whole(o.max) };
    return { state: 'ok', v: v };
  }
  function showErr(id, msg) {
    var el = $(id), lab = el.closest('label'), box = $('err-' + id);
    if (!box) { box = document.createElement('small'); box.id = 'err-' + id; box.className = 'bc-err'; box.setAttribute('role', 'alert'); lab.appendChild(box); }
    box.textContent = msg || ''; box.hidden = !msg;
    el.classList.toggle('invalid', !!msg); el.setAttribute('aria-invalid', msg ? 'true' : 'false');
  }
  function clearErr(id) { if ($(id)) showErr(id, ''); }

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
    var breaker = $('e-breaker').value;

    // ---------- validate electricity inputs
    var pDays = parseField('e-days', { int: true, min: 1, max: 120 });
    var pFee = parseField('e-fee', { min: 0, max: 1000 });
    var pKwh = parseField('e-kwh', { min: 0, max: 1000000 });
    var pBill = parseField('e-bill', { min: 0.01, max: 10000000, minMsg: 'اكتب مبلغًا أكبر من صفر' });
    var days = pDays.state === 'ok' ? pDays.v : 30;
    var fee = pFee.state === 'ok' ? pFee.v : B.OLD_METER_FEE[parseInt(breaker, 10) || 0];
    var minBill = fee * (1 + B.VAT);
    if (pBill.state === 'ok' && pBill.v <= minBill) pBill = { state: 'bad', msg: 'المبلغ أقل من رسوم العداد الحالية (' + fmt(minBill) + ' ريال شاملة الضريبة). تأكد أنها فاتورة شهر كامل.' };
    showErr('e-days', pDays.state === 'bad' ? pDays.msg : '');
    showErr('e-fee', pFee.state === 'bad' ? pFee.msg : '');
    if (mode === 'use') { showErr('e-kwh', pKwh.state === 'bad' ? pKwh.msg : ''); clearErr('e-bill'); }
    else { showErr('e-bill', pBill.state === 'bad' ? pBill.msg : ''); clearErr('e-kwh'); }
    var main = mode === 'use' ? pKwh : pBill;
    var eBad = main.state === 'bad' || pDays.state === 'bad' || pFee.state === 'bad';
    var eNeed = !eBad && main.state === 'empty';
    var eOk = !eBad && !eNeed;
    var kwh = 0, amount = 0;
    if (eOk) {
      if (mode === 'bill') { amount = pBill.v; kwh = B.kwhFromOldBill({ amount: amount, meterFee: fee, sector: sec }); }
      else kwh = pKwh.v;
    }

    // ---------- validate water inputs
    var pM3 = parseField('w-m3', { min: 0, max: 100000 });
    var unitsVisible = wsec === 'res';
    var pUnits = unitsVisible ? parseField('w-units', { int: true, min: 1, max: 200 }) : { state: 'empty' };
    var pOld = parseField('w-old', { min: 0, max: 1000000 });
    showErr('w-m3', pM3.state === 'bad' ? pM3.msg : '');
    if (unitsVisible) showErr('w-units', pUnits.state === 'bad' ? pUnits.msg : ''); else clearErr('w-units');
    showErr('w-old', pOld.state === 'bad' ? pOld.msg : '');
    var wBad = pM3.state === 'bad' || pUnits.state === 'bad';
    var wNeed = !wBad && pM3.state === 'empty';
    var wOk = !wBad && !wNeed;
    var units = pUnits.state === 'ok' ? pUnits.v : 1;
    var wo = { sector: wsec, units: units, m3: wOk ? pM3.v : 0, meter: $('w-meter').value, sewer: $('w-sewer').checked };

    // ---------- electricity output
    $('e-note').textContent = eNote(sec);
    $('w-note').textContent = wNote(wsec);
    var e = null, w = null, eh = '';
    if (eOk) e = B.electricity({ kwh: kwh, breaker: breaker, days: days, sector: sec });
    $('e-derived').textContent = mode === 'bill' ? (eOk ? 'استهلاكك التقريبي من الفاتورة: ' + whole(Math.round(kwh)) + ' كيلوواط ساعة' : (eNeed ? 'اكتب مبلغ فاتورتك الحالية لنقدّر استهلاكك.' : '')) : '';
    if (eBad) eh = hint('صحّح الخانة المظللة بالأحمر لنحسب الفاتورة.');
    else if (eNeed) eh = hint(mode === 'use' ? 'اكتب استهلاكك الشهري (كيلوواط ساعة) لنحسب فاتورتك.' : 'اكتب مبلغ فاتورة الكهرباء الحالية (شاملة الضريبة) لنحسب فاتورتك الجديدة.');
    else {
      if (e.flat) eh += row(whole(e.t1) + ' كيلوواط ساعة × ' + hal(e.rate1) + ' هللة', fmt(e.c1));
      else {
        eh += row('أول ' + whole(e.t1) + ' كيلوواط ساعة × ' + hal(e.rate1) + ' هللة', fmt(e.c1));
        if (e.t2 > 0) eh += row('الزيادة فوق 6,000 (' + whole(e.t2) + ' كيلوواط ساعة) × ' + hal(e.rate2) + ' هللة', fmt(e.c2));
      }
      eh += row('الرسم الثابت' + (days !== 30 ? ' (حسب أيام الفاتورة)' : ''), fmt(e.fixed));
      eh += totals(e);
    }
    $('e-out').innerHTML = eh;

    // ---------- water output
    var names = ['الأولى', 'الثانية', 'الثالثة', 'الرابعة'], wh = '';
    if (wOk) w = B.water(wo);
    if (wBad) wh = hint('صحّح الخانة المظللة بالأحمر لنحسب الفاتورة.');
    else if (wNeed) wh = hint('اكتب استهلاك المياه (م³ بالشهر) لنحسب فاتورتك.');
    else {
      wh = row('استهلاك المياه' + (w.units > 1 ? ' (' + w.units + ' وحدات)' : ''), fmt(w.waterCons));
      if (wo.sewer) wh += row('الصرف الصحي', fmt(w.sewerCons));
      wh += row('الرسم الشهري الثابت (المياه' + (wo.sewer ? ' والصرف' : '') + ')', fmt(w.waterFixed + w.sewerFixed));
      wh += totals(w);
    }
    $('w-out').innerHTML = wh;
    var tiers = [];
    if (w && wsec === 'res') for (var i = 0; i < 4; i++) if (w.bands[i] > 0) tiers.push(names[i] + ' ' + whole(w.bands[i]));
    $('w-tiers').textContent = tiers.length ? 'توزيع استهلاك الوحدة الواحدة على الشرائح (بالمتر المكعب): ' + tiers.join(' · ') : '';

    // ---------- combined + saving tip (need both)
    if (e && w) {
      $('all-out').innerHTML = row('كهرباء + ماء قبل الضريبة', fmt(e.subtotal + w.subtotal)) + row('الإجمالي مع الضريبة 15%', fmt(e.total + w.total), 'bc-total');
      var e2 = B.electricity({ kwh: kwh * 0.9, breaker: breaker, days: days, sector: sec });
      var w2 = B.water({ sector: wsec, units: units, m3: wo.m3 * 0.9, meter: wo.meter, sewer: wo.sewer });
      var save = (e.total + w.total) - (e2.total + w2.total);
      $('save-tip').innerHTML = save > 0.005 ? 'لو خفضت استهلاك الكهرباء والماء <b>10%</b>، توفر تقريبًا <b>' + fmt(save) + ' ريال</b> بالشهر (مع الضريبة).' : '';
    } else {
      $('all-out').innerHTML = hint('أكمل بيانات الكهرباء والماء بشكل صحيح لعرض الإجمالي.', true);
      $('save-tip').innerHTML = '';
    }

    // ---------- comparison vs support
    var oldE = null, tag = '';
    if (e) { if (mode === 'bill') oldE = amount; else { oldE = B.oldElectricity({ kwh: kwh, meterFee: fee, sector: sec }).total; tag = ' (تقدير)'; } }
    var oldW = (w && pOld.state === 'ok') ? pOld.v : null;      // "0" is a valid water bill and is included
    var sType = $('s-type').value, ch = '';
    if (!e) {
      ch = hint('أكمل بيانات الكهرباء بشكل صحيح لنقارن الزيادة.');
    } else {
      var c = B.compare({ newElec: e.total, newWater: w ? w.total : 0, oldElec: oldE, oldWater: oldW, support: sType });
      ch += row('الكهرباء الآن' + tag, fmt(oldE)) + row('الكهرباء بعد التعديل', fmt(e.total)) + row('زيادة الكهرباء', signed(c.elecIncrease), 'bc-sub');
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
    $('cmp-note').textContent = (e && oldW == null) ? 'أضف فاتورة الماء الحالية (اختياري، في بطاقة الماء) لتشمل المقارنة زيادة الماء أيضًا.' : '';
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
