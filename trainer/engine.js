/* Number generator for the trainer.
   Each step is checked against soroban rules, rod by rod:
   level 0 = direct moves only, 1 = also 5-complements, 2 = also 10-complements (carry/borrow). */
(function (root) {
  'use strict';

  // what a single rod needs to add (sign > 0) or subtract (sign < 0) digit d: 0, 1 or 2
  function rodKind(v, d, sign) {
    if (d === 0) return 0;
    const five = v >= 5, ones = v % 5;
    if (sign > 0) {
      if (v + d >= 10) return 2;
      if (d >= 5) return 0;
      return ones + d <= 4 ? 0 : 1;
    }
    if (v - d < 0) return 2;
    if (d >= 5) return 0;
    if (ones >= d) return 0;
    return five ? 1 : 2;
  }

  // the highest level a whole step needs
  function stepLevel(sum, term) {
    const sign = term < 0 ? -1 : 1;
    let s = sum, t = Math.abs(term), level = 0;
    while (t > 0) {
      const k = rodKind(s % 10, t % 10, sign);
      if (k === 2) return 2;
      if (k > level) level = k;
      s = Math.floor(s / 10); t = Math.floor(t / 10);
    }
    return level;
  }

  const pick = a => a[Math.floor(Math.random() * a.length)];
  const repdigit = (d, len) => d * ((Math.pow(10, len) - 1) / 9);

  // all digits for one rod that stay within the level
  function rodDigits(v, sign, maxLevel, nonZero) {
    const out = [];
    for (let d = nonZero ? 1 : 0; d <= 9; d++) if (rodKind(v, d, sign) <= maxLevel) out.push(d);
    return out;
  }

  function randomTerm(sum, sign, len, maxLevel, pair) {
    if (pair) {
      const ds = [];
      for (let d = 1; d <= 9; d++) {
        const term = sign * repdigit(d, len);
        if (sum + term >= 0 && stepLevel(sum, term) <= maxLevel) ds.push(term);
      }
      return ds.length ? pick(ds) : null;
    }
    let value = 0, s = sum;
    for (let i = 0; i < len; i++) {
      const ds = rodDigits(s % 10, sign, maxLevel, i === len - 1);
      if (!ds.length) return null;
      value += pick(ds) * Math.pow(10, i);
      s = Math.floor(s / 10);
    }
    const term = sign * value;
    return sum + term >= 0 && stepLevel(sum, term) <= maxLevel ? term : null;
  }

  function nextTerm(sum, prev, o) {
    const lens = [];
    for (let l = o.digits; l >= 1; l--) lens.push(l);
    const lenFor = () => o.alternate ? pick(lens) : o.digits;
    const cap = 2 * Math.pow(10, o.digits);
    const wantTarget = o.level > 0 && Math.random() < 0.65;
    let fallback = null;
    for (let i = 0; i < 80; i++) {
      const sign = Math.random() < (sum === 0 ? 0 : sum >= cap ? 0.75 : 0.5) ? -1 : 1;
      const term = randomTerm(sum, sign, lenFor(), o.level, o.pair);
      if (term === null || term === -prev) continue;
      if (!fallback) fallback = term;
      if (!wantTarget || stepLevel(sum, term) === o.level) return term;
    }
    return fallback;
  }

  // options: { digits: 1-4, level: 0-2, count: 2-18, alternate: bool, pair: bool }
  function generate(o) {
    const opt = Object.assign({}, o, { alternate: o.alternate && o.digits > 1, pair: o.pair && o.digits > 1 });
    let best = null;
    for (let attempt = 0; attempt < 60; attempt++) {
      const terms = [];
      let sum = 0, usesTarget = opt.level === 0, ok = true;
      for (let i = 0; i < opt.count; i++) {
        const term = nextTerm(sum, terms[i - 1] || 0, opt);
        if (term === null) { ok = false; break; }
        if (stepLevel(sum, term) === opt.level) usesTarget = true;
        terms.push(term);
        sum += term;
      }
      if (!ok) continue;
      const example = { terms, answer: sum };
      if (usesTarget && sum > 0) return example;
      if (!best) best = example;
    }
    return best;
  }

  const api = { rodKind, stepLevel, generate };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TrainerEngine = api;
})(this);
