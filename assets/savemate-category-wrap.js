(() => {
  'use strict';

  function visible(el) {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 150 && r.height > 20 && s.display !== 'none' && s.visibility !== 'hidden';
  }

  function findCategoryBar() {
    const allWord = '\u0627\u0644\u0643\u0644';
    const electronicsWord = '\u0625\u0644\u0643\u062a\u0631';
    const candidates = [];
    for (const el of document.querySelectorAll('div, nav, section, ul')) {
      if (!visible(el) || el === document.body || el.classList.contains('sm-category-wrap')) continue;
      const items = Array.from(el.children).filter(visible);
      const text = (el.innerText || '').replace(/\s+/g, ' ');
      if (items.length < 6 || !text.includes(allWord) || !text.includes(electronicsWord)) continue;
      const directItemText = items.map(item => item.innerText || '').join(' ');
      if (!directItemText.includes(allWord)) continue;
      candidates.push({ el, items, score: items.length * 10 - Math.abs(el.scrollWidth - el.clientWidth) });
    }
    candidates.sort((a, b) => b.score - a.score);
    return candidates.length ? candidates[0].el : null;
  }

  function apply() {
    const bar = findCategoryBar();
    if (!bar) return;
    bar.classList.add('sm-category-wrap');
    bar.setAttribute('data-sm-category-wrap', '1');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply, { once: true });
  else apply();
})();
