/* Reuse the latest catalogue images in the desktop introduction. */
document.addEventListener('DOMContentLoaded', () => {
  const showcase = document.querySelector('.hero-showcase');
  const inner = document.querySelector('.hero-inner');
  if (!showcase || !inner) return;
  const cards = Array.from(document.querySelectorAll('#results > .deal-card')).slice(0, 3);
  for (const card of cards) {
    const sourceLink = card.querySelector('.card-image');
    const sourceImage = sourceLink?.querySelector('img');
    if (!sourceLink || !sourceImage) continue;
    const link = document.createElement('a');
    link.href = sourceLink.href;
    link.setAttribute('aria-label', sourceImage.alt || card.querySelector('h2')?.textContent?.trim() || 'تفاصيل المنتج');
    const image = document.createElement('img');
    image.src = sourceImage.currentSrc || sourceImage.src;
    image.alt = sourceImage.alt || '';
    image.loading = 'lazy';
    image.decoding = 'async';
    link.appendChild(image);
    showcase.appendChild(link);
  }
  if (showcase.children.length === 3) inner.classList.add('has-showcase');
});
