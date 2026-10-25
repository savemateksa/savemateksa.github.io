/* SaveMateKSA bill calculator: pure functions (residential). Sources: SEC tariff tables + NWC tariff/FAQ, effective 2027-01-01. */
(function (root) {
  var VAT = 0.15;
  var ELEC_TIER_LIMIT = 6000, ELEC_RATE_1 = 0.21, ELEC_RATE_2 = 0.33;
  var ELEC_FIXED = [70, 80, 90, 100];                 // 20-99, 100-199, 200-299, 300+ amp
  var WATER_TIERS = [15, 15, 15, Infinity];           // m3 per unit: 0-15, 15-30, 30-45, 45+
  var WATER_RATES = [1, 2, 4, 6];
  var SEWER_RATES = [0.5, 1, 2, 3];
  var METER_FEES = [[20, 10], [40, 20], [60, 30], [80, 40], [100, 50]];   // [water, sewer] by meter size
  var EXTRA_UNIT = [20, 10];

  function num(x, min, max) { x = parseFloat(x); if (!isFinite(x) || x < min) x = min; if (max != null && x > max) x = max; return x; }
  function r2(x) { return Math.round((x + 1e-9) * 100) / 100; }   // half-up, matches NWC's calculator (e.g. 94.875 -> 94.88)

  function electricity(o) {
    var kwh = num(o.kwh, 0, 1e6), days = num(o.days == null ? 30 : o.days, 1, 120);
    var idx = num(o.breaker, 0, 3); idx = Math.round(idx);
    var t1 = Math.min(kwh, ELEC_TIER_LIMIT), t2 = Math.max(kwh - ELEC_TIER_LIMIT, 0);
    var c1 = t1 * ELEC_RATE_1, c2 = t2 * ELEC_RATE_2;
    var fixed = ELEC_FIXED[idx] * days / 30;
    var sub = c1 + c2 + fixed;
    return { kwh: kwh, t1: t1, t2: t2, c1: r2(c1), c2: r2(c2), fixed: r2(fixed), subtotal: r2(sub), vat: r2(sub * VAT), total: r2(sub * (1 + VAT)) };
  }

  function water(o) {
    var units = Math.round(num(o.units == null ? 1 : o.units, 1, 200));
    var perUnit = num(o.m3, 0, 100000) / units;      // meter total split equally per unit (as NWC's official calculator does)
    var meter = Math.round(num(o.meter, 0, 4));
    var sewer = o.sewer !== false;
    var left = perUnit, wC = 0, sC = 0, bands = [];
    for (var i = 0; i < 4; i++) {
      var q = Math.min(left, WATER_TIERS[i]); left -= q;
      bands.push(q);
      wC += q * WATER_RATES[i]; sC += q * SEWER_RATES[i];
    }
    wC *= units; sC = sewer ? sC * units : 0;
    var wF = METER_FEES[meter][0] + (units - 1) * EXTRA_UNIT[0];
    var sF = sewer ? METER_FEES[meter][1] + (units - 1) * EXTRA_UNIT[1] : 0;
    var sub = wC + sC + wF + sF;
    return { units: units, perUnit: perUnit, bands: bands, waterCons: r2(wC), sewerCons: r2(sC), waterFixed: r2(wF), sewerFixed: r2(sF), subtotal: r2(sub), vat: r2(sub * VAT), total: r2(sub * (1 + VAT)) };
  }

  // OLD residential electricity tariff (valid until 2026-12-31): SEC consumption tariff page = 18 halalas up to 6000 kWh, 30 above.
  // OLD meter reading/maintenance fee by breaker (SAR/month): ESTIMATE only (not published on the current SEC site); user can override.
  var OLD_E1 = 0.18, OLD_E2 = 0.30, OLD_METER_FEE = [10, 15, 21, 22];   // 20-99, 100-199, 200-299, 300+ (assumes 300-399)
  function oldElectricity(o) {
    var kwh = num(o.kwh, 0, 1e6), fee = num(o.meterFee, 0, 1000);
    var cons = Math.min(kwh, ELEC_TIER_LIMIT) * OLD_E1 + Math.max(kwh - ELEC_TIER_LIMIT, 0) * OLD_E2;
    var sub = cons + fee;
    return { kwh: kwh, cons: r2(cons), meterFee: r2(fee), subtotal: r2(sub), total: r2(sub * (1 + VAT)) };
  }
  // Invert: bill amount (incl. VAT) -> kWh under the old tariff.
  function kwhFromOldBill(o) {
    var amt = num(o.amount, 0, 1e7), fee = num(o.meterFee, 0, 1000);
    var net = amt / (1 + VAT) - fee;
    if (net <= 0) return 0;
    var lim = ELEC_TIER_LIMIT * OLD_E1;
    return net <= lim ? net / OLD_E1 : ELEC_TIER_LIMIT + (net - lim) / OLD_E2;
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

  var api = { electricity: electricity, water: water, VAT: VAT, oldElectricity: oldElectricity, kwhFromOldBill: kwhFromOldBill, compare: compare, OLD_METER_FEE: OLD_METER_FEE, SUPPORT: SUPPORT };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.BillCalc = api;
})(typeof window !== 'undefined' ? window : globalThis);
