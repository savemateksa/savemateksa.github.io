/* SaveMateKSA bill calculator: pure functions. Sources: SEC tariff tables (new + current) and NWC tariff tables/FAQ; new tariffs effective 2027-01-01.
   Cross-checked against NWC's official calculator (water) and the SEC guide tables (electricity). */
(function (root) {
  var VAT = 0.15;
  var LIMIT = 6000;   // kWh tier limit

  // ---- Electricity: NEW tariff (halalas/kWh -> SAR). rate2 null = single flat rate. fixed = SAR/month by breaker band (20-99, 100-199, 200-299, 300+).
  var E_NEW = {
    residential: { r1: 0.21, r2: 0.33, fixed: [70, 80, 90, 100] },
    commercial:  { r1: 0.25, r2: 0.35, fixed: [350, 500, 700, 900] },
    private:     { r1: 0.25, r2: 0.35, fixed: [350, 500, 700, 900] },   // private health / educational institutions share the commercial table
    industrial:  { r1: 0.23, r2: null, fixed: [350, 500, 700, 900] },
    agricultural:{ r1: 0.19, r2: 0.23, fixed: [140, 160, 180, 200] },
    charity:     { r1: 0.17, r2: 0.21, fixed: [140, 160, 180, 200] },
    government:  { r1: 0.35, r2: null, fixed: [350, 500, 700, 900] }
  };
  // CURRENT tariff (valid until 2026-12-31), SEC consumption tariff page.
  var E_OLD = {
    residential: { r1: 0.18, r2: 0.30 }, commercial: { r1: 0.22, r2: 0.32 }, private: { r1: 0.18, r2: null },
    industrial: { r1: 0.20, r2: null }, agricultural: { r1: 0.18, r2: 0.22 }, charity: { r1: 0.16, r2: 0.20 }, government: { r1: 0.32, r2: null }
  };
  // CURRENT meter reading/maintenance fee by breaker (SAR/month): bands 20-99, 100-199, 200-299, 300-399, 400, >400. ESTIMATE (not on current SEC site; matches other public calculators).
  var OLD_METER_FEE = [10, 15, 21, 22, 25, 30];

  // ---- Water: NEW tariff (NWC). Residential: 4 marginal tiers per unit. Non-residential and government: single rate.
  var W_RES_TIERS = [15, 15, 15, Infinity], W_RES_WATER = [1, 2, 4, 6], W_RES_SEWER = [0.5, 1, 2, 3];
  var W_RES_FEES = [[20, 10], [40, 20], [60, 30], [80, 40], [100, 50]];
  var W_NON = { water: 8, sewer: 4, fees: [[40, 20], [60, 30], [80, 40], [100, 50], [150, 75]] };
  var W_GOV = { water: 10, sewer: 5, fee: [1000, 500] };
  var EXTRA_UNIT = [20, 10];

  function num(x, min, max) { x = parseFloat(x); if (!isFinite(x) || x < min) x = min; if (max != null && x > max) x = max; return x; }
  function r2(x) { return Math.round((x + 1e-9) * 100) / 100; }   // half-up, matches NWC's calculator (94.875 -> 94.88)
  function sectorOf(table, s) { return table[s] ? s : 'residential'; }
  function energy(rates, kwh) {
    if (rates.r2 == null) return { t1: kwh, t2: 0, c1: kwh * rates.r1, c2: 0 };
    var t1 = Math.min(kwh, LIMIT), t2 = Math.max(kwh - LIMIT, 0);
    return { t1: t1, t2: t2, c1: t1 * rates.r1, c2: t2 * rates.r2 };
  }

  function electricity(o) {
    var sec = sectorOf(E_NEW, o.sector), T = E_NEW[sec];
    var kwh = num(o.kwh, 0, 1e6), days = num(o.days == null ? 30 : o.days, 1, 120);
    var idx = Math.min(Math.round(num(o.breaker, 0, 5)), 3);
    var en = energy(T, kwh), fixed = T.fixed[idx] * days / 30, sub = en.c1 + en.c2 + fixed;
    return { sector: sec, flat: T.r2 == null, rate1: T.r1, rate2: T.r2, kwh: kwh, t1: en.t1, t2: en.t2, c1: r2(en.c1), c2: r2(en.c2), fixed: r2(fixed), subtotal: r2(sub), vat: r2(sub * VAT), total: r2(sub * (1 + VAT)) };
  }

  function oldElectricity(o) {
    var sec = sectorOf(E_OLD, o.sector), T = E_OLD[sec];
    var kwh = num(o.kwh, 0, 1e6), fee = num(o.meterFee, 0, 1000);
    var en = energy(T, kwh), cons = en.c1 + en.c2, sub = cons + fee;
    return { kwh: kwh, cons: r2(cons), meterFee: r2(fee), subtotal: r2(sub), total: r2(sub * (1 + VAT)) };
  }

  // Invert: current bill amount (incl. VAT) -> kWh under the current tariff.
  function kwhFromOldBill(o) {
    var T = E_OLD[sectorOf(E_OLD, o.sector)];
    var net = num(o.amount, 0, 1e7) / (1 + VAT) - num(o.meterFee, 0, 1000);
    if (net <= 0) return 0;
    if (T.r2 == null) return net / T.r1;
    var lim = LIMIT * T.r1;
    return net <= lim ? net / T.r1 : LIMIT + (net - lim) / T.r2;
  }

  function water(o) {
    var sec = (o.sector === 'non' || o.sector === 'gov') ? o.sector : 'res';
    var sewer = o.sewer !== false, total = num(o.m3, 0, 1e6), meter = Math.round(num(o.meter, 0, 4));
    var wC, sC, wF, sF, bands = [], units = 1, perUnit = total;
    if (sec === 'res') {
      units = Math.round(num(o.units == null ? 1 : o.units, 1, 200));
      perUnit = total / units;                   // meter total split equally per unit (as NWC's calculator does)
      var left = perUnit; wC = 0; sC = 0;
      for (var i = 0; i < 4; i++) { var q = Math.min(left, W_RES_TIERS[i]); left -= q; bands.push(q); wC += q * W_RES_WATER[i]; sC += q * W_RES_SEWER[i]; }
      wC *= units; sC *= units;
      wF = W_RES_FEES[meter][0] + (units - 1) * EXTRA_UNIT[0]; sF = W_RES_FEES[meter][1] + (units - 1) * EXTRA_UNIT[1];
    } else if (sec === 'non') {
      wC = total * W_NON.water; sC = total * W_NON.sewer; wF = W_NON.fees[meter][0]; sF = W_NON.fees[meter][1];
    } else {
      wC = total * W_GOV.water; sC = total * W_GOV.sewer; wF = W_GOV.fee[0]; sF = W_GOV.fee[1];
    }
    if (!sewer) { sC = 0; sF = 0; }
    var sub = wC + sC + wF + sF;
    return { sector: sec, units: units, perUnit: perUnit, bands: bands, waterCons: r2(wC), sewerCons: r2(sC), waterFixed: r2(wF), sewerFixed: r2(sF), subtotal: r2(sub), vat: r2(sub * VAT), total: r2(sub * (1 + VAT)) };
  }

  var SUPPORT = { none: 0, employee: 500, retiree: 500, ss: 500, private: 0 };
  function compare(o) {
    // o: newElec, newWater (totals incl. VAT), oldElec (total incl. VAT, or null), oldWater (null if unknown), support key
    var eInc = o.oldElec == null ? null : r2(o.newElec - o.oldElec);
    var wInc = o.oldWater == null ? null : r2(o.newWater - o.oldWater);
    var total = (eInc || 0) + (wInc || 0);
    var sup = SUPPORT[o.support] || 0;
    return { elecIncrease: eInc, waterIncrease: wInc, totalIncrease: r2(total), support: sup, net: r2(sup - total), partial: (eInc == null || wInc == null) };
  }

  var api = { electricity: electricity, water: water, VAT: VAT, oldElectricity: oldElectricity, kwhFromOldBill: kwhFromOldBill, compare: compare,
              OLD_METER_FEE: OLD_METER_FEE, SUPPORT: SUPPORT, E_NEW: E_NEW, E_OLD: E_OLD, W_NON: W_NON, W_GOV: W_GOV, W_RES_FEES: W_RES_FEES };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.BillCalc = api;
})(typeof window !== 'undefined' ? window : globalThis);
