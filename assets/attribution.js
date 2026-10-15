(() => {
  'use strict'
  const endpoint = 'https://events.savemateksa.com/events'
  const aliases = { tiktok:'tiktok', ig:'instagram', instagram:'instagram', x:'x', twitter:'x', yt:'youtube', youtube:'youtube', fb:'facebook', facebook:'facebook', threads:'threads', tg:'telegram', telegram:'telegram', search:'search', google:'search', bing:'search' }
  const referrerSource = () => {
    try {
      const referrer = new URL(document.referrer)
      if (!/^https?:$/.test(referrer.protocol)) return ''
      const host = referrer.hostname.toLowerCase().replace(/\.$/, '')
      const belongsTo = domain => host === domain || host.endsWith('.' + domain)
      if (belongsTo('savemateksa.com')) return ''
      // Match whole domain labels, including country domains, rather than substrings.
      if (/(^|\.)(google|bing|yahoo|duckduckgo|yandex|baidu)\.(?:[a-z]{2,63}|(?:com|co)\.[a-z]{2})$/.test(host)) return 'search'
      const platforms = {
        tiktok:['tiktok.com'], instagram:['instagram.com'],
        x:['t.co','x.com','twitter.com'], youtube:['youtube.com','youtu.be'],
        facebook:['facebook.com','fb.com'], threads:['threads.net','threads.com'],
        telegram:['t.me','telegram.org']
      }
      for (const [source, domains] of Object.entries(platforms)) {
        if (domains.some(belongsTo)) return source
      }
    } catch (_) {}
    return ''
  }
  const uuid = () => crypto.randomUUID()
  const params = new URLSearchParams(location.search)
  const incoming = aliases[(params.get('ref') || '').toLowerCase()] || aliases[(params.get('utm_source') || '').toLowerCase()]
  let session
  try { session = JSON.parse(sessionStorage.getItem('sm_attribution') || 'null') } catch (_) {}
  const fresh = !session || !session.id || Date.now() - session.last > 30 * 60 * 1000 || (incoming && incoming !== session.source)
  if (fresh) session = { id:uuid(), source: incoming || referrerSource() || 'direct' }
  else if (incoming) session.source = incoming
  session.last = Date.now()
  const save = () => { try { sessionStorage.setItem('sm_attribution', JSON.stringify(session)) } catch (_) {} }
  save()
  const send = (event, fields = {}) => {
    session.last = Date.now(); save()
    const payload = {event_id:uuid(), event, session_id:session.id, source:session.source, page_path:location.pathname, ...fields}
    const body = JSON.stringify(payload)
    try {
      if (!navigator.sendBeacon || !navigator.sendBeacon(endpoint, new Blob([body], {type:'text/plain;charset=UTF-8'}))) {
        fetch(endpoint, {method:'POST', body, headers:{'Content-Type':'text/plain;charset=UTF-8'}, keepalive:true, credentials:'omit'}).catch(() => {})
      }
    } catch (_) {}
    if (typeof window.gtag === 'function') {
      try { window.gtag('event', event, {traffic_source:session.source, page_path:location.pathname, ...fields, send_to:'G-88LRQWDRQZ'}) } catch (_) {}
    }
  }
  const selectors = '.buy-link,.buy-link-top,.purchase-links a,.store-link,.sm-bot-fab,.sm-bot-btn,.bot-banner-btn,.article-bot-cta a,a[href*="t.me/savemateksabot"]'
  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest(selectors)
    if (!a) return
    let url
    try { url = new URL(a.href, location.href) } catch (_) { return }
    if (!/^https?:$/.test(url.protocol)) return
    const placement = a.classList.contains('sm-bot-fab') ? 'floating' : a.classList.contains('buy-link-top') || a.closest('.purchase-summary') ? 'top' : a.closest('.product-purchase') ? 'bottom' : a.closest('.deal-card') ? 'catalog' : 'inline'
    if (url.hostname === 't.me' && url.pathname.replace(/\/$/,'') === '/savemateksabot') return send('bot_click', {placement})
    const card = a.closest('[data-product-id],.deal-card')
    const badge = card && card.querySelector && card.querySelector('.store-badge')
    const label = ((a.dataset.store || '') + ' ' + a.textContent + ' ' + (badge && badge.textContent || '')).toLowerCase()
    const store = /amazon|amzn|أمازون/.test(url.hostname+' '+label) ? 'amazon' : /aliexpress|علي إكسبرس|علي اكسبريس/.test(url.hostname+' '+label) ? 'aliexpress' : /shein|شي إن/.test(url.hostname+' '+label) ? 'shein' : 'other'
    const details = card && card.querySelector && card.querySelector('a.details,a.card-image')
    const product = card && card.dataset.productId || (details ? new URL(details.href,location.href).pathname : location.pathname)
    send('affiliate_click', {store, placement, product_id:product.slice(0,600)})
  }, {passive:true})
  const views = () => { if (fresh) send('visit'); send('page_view') }
  if (document.readyState === 'complete') setTimeout(views,0)
  else window.addEventListener('load', views, {once:true})
})()
