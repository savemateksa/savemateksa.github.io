/* SaveMateKSA bill calculator UI */
(function () {
  var B = window.BillCalc; if (!B) return;
  function $(id) { return document.getElementById(id); }
  function fmt(n) { return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function whole(n) { return n.toLocaleString('en-US', { maximumFractionDigits: 2 }); }
  function row(label, val, cls) { return '<div class="bc-row' + (cls ? ' ' + cls : '') + '"><span>' + label + '</span><b>' + val + ' <small>ريال</small></b></div>'; }
  function totals(r) { return row('المجموع قبل الضريبة', fmt(r.subtotal), 'bc-sub') + row('ضريبة القيمة المضافة 15%', fmt(r.vat)) + row('الإجمالي مع الضريبة', fmt(r.total), 'bc-total'); }

  function readE() { return { kwh: $('e-kwh').value, breaker: $('e-breaker').value, days: $('e-days').value }; }
  function readW() { return { units: $('w-units').value, m3: $('w-m3').value, meter: $('w-meter').value, sewer: $('w-sewer').checked }; }

  function render() {
    var eo = readE(), wo = readW();
    var e = B.electricity(eo), w = B.water(wo);

    var eh = '';
    eh += row('أول ' + whole(e.t1) + ' كيلوواط ساعة × 21 هللة', fmt(e.c1));
    if (e.t2 > 0) eh += row('الزيادة فوق 6,000 (' + whole(e.t2) + ' كيلوواط ساعة) × 33 هللة', fmt(e.c2));
    eh += row('الرسم الثابت' + (Number($('e-days').value) !== 30 ? ' (حسب أيام الفاتورة)' : ''), fmt(e.fixed));
    eh += totals(e);
    $('e-out').innerHTML = eh;

    var names = ['الأولى', 'الثانية', 'الثالثة', 'الرابعة'];
    var wh = '';
    wh += row('استهلاك المياه' + (w.units > 1 ? ' (' + w.units + ' وحدات)' : ''), fmt(w.waterCons));
    if (wo.sewer) wh += row('الصرف الصحي', fmt(w.sewerCons));
    wh += row('الرسم الشهري الثابت (المياه' + (wo.sewer ? ' والصرف' : '') + ')', fmt(w.waterFixed + w.sewerFixed));
    wh += totals(w);
    $('w-out').innerHTML = wh;
    var tiers = [];
    for (var i = 0; i < 4; i++) if (w.bands[i] > 0) tiers.push(names[i] + ' ' + whole(w.bands[i]));
    $('w-tiers').textContent = tiers.length ? 'توزيع استهلاك الوحدة الواحدة على الشرائح (بالمتر المكعب): ' + tiers.join(' · ') : '';

    $('all-out').innerHTML = row('كهرباء + ماء قبل الضريبة', fmt(e.subtotal + w.subtotal)) + row('الإجمالي مع الضريبة 15%', fmt(e.total + w.total), 'bc-total');

    var e2 = B.electricity({ kwh: parseFloat(eo.kwh) * 0.9, breaker: eo.breaker, days: eo.days });
    var w2 = B.water({ units: wo.units, m3: parseFloat(wo.m3) * 0.9, meter: wo.meter, sewer: wo.sewer });
    var save = (e.total + w.total) - (e2.total + w2.total);
    $('save-tip').innerHTML = save > 0.005 ? 'لو خفضت استهلاك الكهرباء والماء <b>10%</b>، توفر تقريبًا <b>' + fmt(save) + ' ريال</b> بالشهر (مع الضريبة).' : '';
  }

  ['e-kwh', 'e-breaker', 'e-days', 'w-units', 'w-m3', 'w-meter', 'w-sewer'].forEach(function (id) {
    var el = $(id); if (!el) return; el.addEventListener('input', render); el.addEventListener('change', render);
  });
  var reset = $('bc-reset');
  if (reset) reset.addEventListener('click', function () {
    $('e-kwh').value = 1500; $('e-breaker').value = 0; $('e-days').value = 30;
    $('w-units').value = 1; $('w-m3').value = 25; $('w-meter').value = 0; $('w-sewer').checked = true; render();
  });
  render();
})();
