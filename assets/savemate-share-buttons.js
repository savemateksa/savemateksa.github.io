(async () => {
  if (document.querySelector('.sm-share')) return
  // SAVEMATE_STABLE_SHORTLINKS: use only a deployed same-origin mapping.
  let url = location.origin + location.pathname
  try {
    const response = await fetch('/assets/shortlinks.json', { cache: 'no-cache', signal: AbortSignal.timeout(2500) })
    if (response.ok) {
      const links = await response.json()
      const path = decodeURIComponent(location.pathname).replace(/\/?$/, '/')
      const short = links[path] || links[location.pathname]
      if (typeof short === 'string' && /^\/p\/[a-f0-9]{8}\/$/.test(short)) url = location.origin + short
    }
  } catch (_) { /* Keep the working canonical page when the map is unavailable. */ }
  const title = document.title.replace(/\s*\|\s*صديق التوفير\s*$/, '').trim()
  const encodedUrl = encodeURIComponent(url)
  const encodedTitle = encodeURIComponent(title)
  const message = encodeURIComponent(`${title} ${url}`)
  const icon = {
    whatsapp: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 3.5A11.6 11.6 0 0 0 12.1.1C5.7.1.5 5.2.5 11.6c0 2 .5 3.9 1.5 5.6L.4 23.8l6.8-1.8a11.5 11.5 0 0 0 4.9 1.1h.1c6.4 0 11.6-5.2 11.6-11.6 0-3.1-1.2-6-3.3-8zM12.1 21.1c-1.6 0-3.2-.4-4.5-1.2l-.3-.2-4 1.1 1.1-3.9-.2-.4a9.5 9.5 0 1 1 7.9 4.6zm5.2-7.1c-.3-.1-1.8-.9-2.1-1s-.5-.1-.7.2-.8 1-.9 1.1-.3.2-.6.1a7.8 7.8 0 0 1-2.3-1.4 8.6 8.6 0 0 1-1.6-2c-.2-.3 0-.4.1-.5l.5-.6c.2-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2.1c-.2-.5-.5-.4-.7-.4h-.6c-.2 0-.5.1-.8.4s-1 1-1 2.4 1 2.8 1.2 3 .1.3.2.5c.3.4 2.2 3.4 5.3 4.8.7.3 1.3.5 1.8.6.8.2 1.5.2 2 .1.6-.1 1.8-.7 2.1-1.4s.3-1.2.2-1.4-.3-.2-.6-.3z"/></svg>',
    facebook: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.7 22v-8h2.7l.4-3.1h-3.1V9c0-.9.3-1.6 1.7-1.6h1.8V4.6c-.3 0-1.4-.1-2.6-.1-2.6 0-4.4 1.6-4.4 4.5v2H7.3V14h2.9v8h3.5z"/></svg>',
    x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18.9 2H22l-6.8 7.8 8 10.2h-6.3L12 13.8 6.6 20H3.5l7.3-8.3L3.1 2h6.4l4.4 5.7L18.9 2zm-1.1 16h1.7L8.6 3.9H6.8L17.8 18z"/></svg>',
    telegram: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21.8 3.2 18.5 20c-.2 1.2-.9 1.5-1.8.9l-5-3.7-2.4 2.3c-.3.3-.5.5-1 .5l.4-5.1 9.3-8.4c.4-.4-.1-.6-.6-.3L6 13.5 1.1 12c-1.1-.3-1.1-1.1.2-1.6L20.5 3c.9-.3 1.6.2 1.3 1.2z"/></svg>',
    copy: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 7V5c0-1.1.9-2 2-2h8c1.1 0 2 .9 2 2v8c0 1.1-.9 2-2 2h-2v2c0 1.1-.9 2-2 2H6c-1.1 0-2-.9-2-2V9c0-1.1.9-2 2-2h2zm2-2v2h4c1.1 0 2 .9 2 2v4h2V5h-8zm4 4H6v8h8V9z"/></svg>',
    share: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 16.1c-.8 0-1.5.3-2 .8l-7.3-4.2c.1-.2.1-.5.1-.7s0-.5-.1-.7L16 7c.5.5 1.2.8 2 .8 1.7 0 3-1.3 3-3s-1.3-3-3-3-3 1.3-3 3c0 .2 0 .5.1.7L7.8 9.7c-.5-.5-1.2-.8-2-.8-1.7 0-3 1.3-3 3s1.3 3 3 3c.8 0 1.5-.3 2-.8l7.2 4.2c-.1.2-.1.4-.1.7 0 1.7 1.3 3 3 3s3-1.3 3-3-1.3-3-3-3z"/></svg>'
  }
  const wrap = document.createElement('section')
  wrap.className = 'sm-share'
  wrap.setAttribute('aria-label', 'شارك الصفحة')
  wrap.innerHTML = `<span class="sm-share-title">شارك</span><div class="sm-share-links"><a class="sm-whatsapp" href="https://wa.me/?text=${message}" target="_blank" rel="noopener noreferrer" aria-label="مشاركة عبر واتساب" title="واتساب">${icon.whatsapp}</a><a class="sm-facebook" href="https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}" target="_blank" rel="noopener noreferrer" aria-label="مشاركة عبر فيسبوك" title="فيسبوك">${icon.facebook}</a><a class="sm-x" href="https://x.com/intent/post?text=${message}" target="_blank" rel="noopener noreferrer" aria-label="مشاركة عبر X" title="X">${icon.x}</a><a class="sm-telegram" href="https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}" target="_blank" rel="noopener noreferrer" aria-label="مشاركة عبر تيليجرام" title="تيليجرام">${icon.telegram}</a><button type="button" class="sm-copy" aria-label="نسخ الرابط" title="نسخ الرابط">${icon.copy}</button><button type="button" class="sm-native" aria-label="مشاركة" title="مشاركة">${icon.share}</button></div>`
  const copy = wrap.querySelector('.sm-copy')
  const nativeBtn = wrap.querySelector('.sm-native')
  copy.onclick = async () => {
    try {
      await navigator.clipboard.writeText(url)
      copy.classList.add('is-copied')
      setTimeout(() => copy.classList.remove('is-copied'), 1800)
    } catch (_) { prompt('انسخ الرابط', url) }
  }
  if (navigator.share) nativeBtn.onclick = () => navigator.share({ title, url })
  else nativeBtn.remove()
  const place = () => {
    const related = document.querySelector('.related-products')
    if (related) { related.before(wrap); return true }
    const article = document.querySelector('.article')
    if (article && !wrap.isConnected) article.after(wrap)
    return false
  }
  if (!place()) {
    const observer = new MutationObserver(() => { if (place()) observer.disconnect() })
    observer.observe(document.body, { childList: true, subtree: true })
    setTimeout(() => observer.disconnect(), 8000)
  }
})()
