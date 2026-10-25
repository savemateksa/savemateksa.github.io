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
  function r2(x) { return Math.round(x * 100) / 100; }

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
    var perUnit = num(o.m3, 0, 5000);
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

  var api = { electricity: electricity, water: water, VAT: VAT };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.BillCalc = api;
})(typeof window !== 'undefined' ? window : globalThis);
