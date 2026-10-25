(function () {
  var B=window.BillCalc; if(!B)return;
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
    el.setAttribute('aria-describedby',box.id); box.textContent = msg || ''; box.hidden = !msg;
    el.classList.toggle('invalid', !!msg); el.setAttribute('aria-invalid', msg ? 'true' : 'false');
  }
  function clearErr(id) { if ($(id)) showErr(id, ''); }

  function syncFee() {
    var f = $('e-fee');
    if (f.getAttribute('data-touched') !== '1') f.value = B.OLD_METER_FEE[parseInt($('e-breaker').value, 10) || 0];
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

  var utility='electricity', mode='bill', calculated=false;
  var fieldIds=['e-days','e-fee','e-kwh','e-bill','w-m3','w-units','w-old'];
  function picked(id){var el=$(id);return el.options[el.selectedIndex].text;}
  function wantsE(){return utility!=='water';}
  function wantsW(){return utility!=='electricity';}
  function setMode(m){
    mode=m;
    ['bill','use'].forEach(function(k){$('mode-'+k).setAttribute('aria-pressed',String(k===m));});
    $('e-bill').closest('label').hidden=m!=='bill';
    $('use-wrap').hidden=m!=='use';
    $('e-derived').hidden=m!=='bill';
    clearErr(m==='bill'?'e-kwh':'e-bill');
    if(calculated)render();
  }
  function assumptions(){
    $('e-assumptions').textContent='التقدير على أساس: '+picked('e-sector')+' · قاطع '+picked('e-breaker')+' · '+($('e-days').value||'30')+' يوماً. راجعها من «تعديل بيانات العداد».';
    var res=$('w-sector').value==='res',gov=$('w-sector').value==='gov';
    $('w-units-wrap').hidden=!res;$('w-meter-wrap').hidden=gov;
    $('w-assumptions').textContent='التقدير على أساس: '+picked('w-sector')+(gov?'':(' · عداد '+picked('w-meter')))+(res?' · '+($('w-units').value||'1')+' وحدة سكنية':'')+'. راجع بيانات عدادك أعلاه.';
    $('water-old-wrap').hidden=!wantsW();
  }
  function selectUtility(u){
    utility=u;
    document.querySelectorAll('[data-utility]').forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.utility===u));});
    $('e-panel').hidden=!wantsE();$('w-panel').hidden=!wantsW();
    fieldIds.forEach(clearErr);assumptions();
    if(calculated)render();
  }
  function parse(id,options,required){
    var p=parseField(id,options);
    if(required&&p.state==='empty')p={state:'bad',msg:'اكتب القيمة المطلوبة أولاً'};
    showErr(id,p.state==='bad'?p.msg:'');return p;
  }
  function revealFirstError(){
    var el=document.querySelector('.bc-input-card input[aria-invalid="true"]');
    if(!el)return;
    var p=el.parentElement;
    while(p){if(p.tagName==='DETAILS')p.open=true;p=p.parentElement;}
    el.focus();
  }
  function compare(e,w,kwh,fee,amount){
    var oldE=e?(mode==='bill'?amount:B.oldElectricity({kwh:kwh,meterFee:fee,sector:$('e-sector').value}).total):null;
    var oldW=null,pOld;
    if(w){pOld=parse('w-old',{min:0,max:1000000},false);if(pOld.state==='ok')oldW=pOld.v;}
    var text='',note='';
    if(w&&pOld.state==='bad'){
      $('cmp-out').innerHTML=hint('صحّح مبلغ فاتورة المياه الحالية لعرض المقارنة.');$('cmp-note').textContent='';return;
    }
    if(oldE===null&&oldW===null){
      $('cmp-out').innerHTML=hint(w?'أدخل مبلغ فاتورة المياه الحالية أعلاه لعرض الزيادة.':'احسب الفاتورة أولاً لعرض المقارنة.');$('cmp-note').textContent='';return;
    }
    var c=B.compare({newElec:e?e.total:0,newWater:w?w.total:0,oldElec:oldE,oldWater:oldW,support:$('s-type').value});
    if(e)text+=row('الكهرباء الآن'+(mode==='use'?' (تقدير)':''),fmt(oldE))+row('زيادة الكهرباء',signed(c.elecIncrease));
    if(oldW!==null)text+=row('المياه الآن',fmt(oldW))+row('زيادة المياه',signed(c.waterIncrease));
    var partial=wantsE()&&wantsW()&&oldW===null;
    text+=row(partial?'الزيادة المعروفة (الكهرباء فقط)':'إجمالي الزيادة',signed(c.totalIncrease),'bc-sub');
    if(partial)note='لم تدخل فاتورة المياه الحالية؛ المقارنة والدعم أدناه للكهرباء فقط، وليسا لإجمالي الخدمتين.';
    if(c.support){
      text+=row('الدعم المفترض شهرياً',fmt(c.support));
      text+='<p class="bc-verdict">'+(c.net>=0?'يغطي الزيادة المحسوبة ويتبقى '+fmt(c.net):'تتجاوز الزيادة المحسوبة الدعم بمقدار '+fmt(-c.net))+' ريال.'+(partial?' المقارنة لا تشمل المياه.':'')+'</p>';
    }
    $('cmp-out').innerHTML=text;$('cmp-note').textContent=note;
  }
  function render(){
    assumptions();
    var e=null,w=null,kwh=0,fee=0,amount=0,days=30,bad=false;
    fieldIds.forEach(clearErr);
    if(wantsE()){
      var pd=parse('e-days',{int:true,min:1,max:120},true),pf=parse('e-fee',{min:0,max:1000},true);
      days=pd.v;fee=pf.v;
      var main=mode==='bill'?parse('e-bill',{min:0.01,max:10000000},true):parse('e-kwh',{min:0,max:1000000},true);
      if(mode==='bill'&&main.state==='ok'&&pf.state==='ok'&&main.v<=fee*(1+B.VAT)){
        main={state:'bad',msg:'المبلغ لا يتجاوز رسوم العداد ('+fmt(fee*(1+B.VAT))+' ريال شاملة الضريبة). أدخل فاتورة شهر كامل.'};showErr('e-bill',main.msg);
      }
      if(pd.state!=='ok'||pf.state!=='ok'||main.state!=='ok')bad=true;
      else{
        amount=mode==='bill'?main.v:0;
        kwh=mode==='bill'?B.kwhFromOldBill({amount:amount,meterFee:fee,sector:$('e-sector').value}):main.v;
        if(kwh>1000000){bad=true;showErr('e-bill','الاستهلاك المستنتج يتجاوز الحد المدعوم. تحقق من مبلغ الفاتورة.');}
        else e=B.electricity({kwh:kwh,breaker:$('e-breaker').value,days:days,sector:$('e-sector').value});
      }
      $('e-derived').textContent=e&&mode==='bill'?'يعادل تقريباً '+whole(kwh)+' كيلوواط ساعة بالتعريفة الحالية.':'';
    }
    if(wantsW()){
      var pm=parse('w-m3',{min:0,max:100000},true);
      var pu=$('w-sector').value==='res'?parse('w-units',{min:1,max:200,int:true},true):{state:'ok',v:1};
      if(pm.state!=='ok'||pu.state!=='ok')bad=true;
      else w=B.water({m3:pm.v,units:pu.v,meter:$('w-meter').value,sewer:$('w-sewer').checked,sector:$('w-sector').value});
    }
    $('bc-breakdown').hidden=bad;$('result-period').hidden=bad;
    if(bad){
      $('all-out').innerHTML=hint('راجع الخانة الموضحة بالأحمر، ثم احسب من جديد.');
      $('cmp-out').innerHTML=hint('أكمل بيانات الفاتورة لعرض المقارنة.');$('cmp-note').textContent='';return false;
    }
    var total=(e?e.total:0)+(w?w.total:0);
    $('all-out').innerHTML='<p class="bc-total-label">'+(utility==='both'?'إجمالي الكهرباء والمياه':utility==='water'?'فاتورة المياه':'فاتورة الكهرباء')+'</p><p class="bc-amount"><b>'+fmt(total)+'</b> <span>ريال</span></p><p class="bc-tax">شامل ضريبة القيمة المضافة 15%</p>'+(utility==='both'?'<div class="bc-split">'+row('الكهرباء',fmt(e.total))+row('المياه',fmt(w.total))+'</div>':'');
    $('result-period').textContent='تقدير وفق تعريفة 2027'+(e?' · الكهرباء '+whole(days)+' يوماً':'')+(w?' · المياه شهر كامل':'');
    $('e-breakdown').hidden=!e;$('w-breakdown').hidden=!w;
    if(e){
      var eh=row(whole(e.t1)+' كيلوواط ساعة × '+hal(e.rate1)+' هللة',fmt(e.c1));
      if(e.t2)eh+=row(whole(e.t2)+' كيلوواط ساعة إضافية × '+hal(e.rate2)+' هللة',fmt(e.c2));
      $('e-out').innerHTML=eh+row('الرسم الثابت',fmt(e.fixed))+totals(e);$('e-note').textContent=eNote($('e-sector').value);
    }
    if(w){
      $('w-out').innerHTML=row('استهلاك المياه',fmt(w.waterCons))+($('w-sewer').checked?row('الصرف الصحي',fmt(w.sewerCons)):'')+row('الرسم الثابت',fmt(w.waterFixed+w.sewerFixed))+totals(w);
      $('w-note').textContent=wNote($('w-sector').value);$('w-tiers').textContent=w.units>1?'يُقسم الاستهلاك بالتساوي على '+w.units+' وحدات.':'';
    }
    compare(e,w,kwh,fee,amount);return true;
  }
  function calculate(){calculated=true;if(!render()){revealFirstError();return;}$('result-title').setAttribute('tabindex','-1');$('result-title').focus({preventScroll:true});if(matchMedia('(max-width:800px)').matches)$('result-card').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});}
  document.querySelectorAll('[data-utility]').forEach(function(b){b.addEventListener('click',function(){selectUtility(b.dataset.utility);});});
  $('mode-bill').addEventListener('click',function(){setMode('bill');});$('mode-use').addEventListener('click',function(){setMode('use');});
  document.querySelectorAll('.bc-input-card input,.bc-input-card select,#water-old-wrap input,#s-type').forEach(function(el){
    el.addEventListener('input',function(){if(el.id==='e-fee')el.setAttribute('data-touched','1');assumptions();if(calculated)render();});
    el.addEventListener('change',function(){if(el.id==='e-breaker')syncFee();assumptions();if(calculated)render();});
    el.addEventListener('keydown',function(event){if(event.key==='Enter'&&el.tagName==='INPUT'){event.preventDefault();calculate();}});
  });
  $('bc-calculate').addEventListener('click',calculate);
  $('bc-reset').addEventListener('click',function(){
    calculated=false;$('e-sector').value='residential';$('e-breaker').value='0';$('e-days').value='30';$('e-fee').removeAttribute('data-touched');syncFee();
    $('e-kwh').value='';$('e-bill').value='';$('w-m3').value='';$('w-old').value='';$('w-units').value='1';$('w-sector').value='res';$('w-meter').value='0';$('w-sewer').checked=true;$('s-type').value='none';
    fieldIds.forEach(clearErr);document.querySelectorAll('.calc-content details').forEach(function(d){d.open=false;});setMode('bill');selectUtility('electricity');
    $('all-out').innerHTML='<p class="bc-empty">أدخل بياناتك واضغط «احسب فاتورتي».</p>';$('result-period').hidden=true;$('bc-breakdown').hidden=true;$('cmp-out').textContent='';$('cmp-note').textContent='';$('e-derived').textContent='';
  });
  syncFee();setMode('bill');selectUtility('electricity');

})();
