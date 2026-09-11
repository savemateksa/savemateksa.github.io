(() => {
  const repairArabicEncoding = () => {
    const repair = value => {
      if (!/[طظ][§±]/.test(value)) return value
      try {
        return decodeURIComponent(escape(value))
      } catch (_) {
        return value
      }
    }
    document.querySelectorAll('.buy-link').forEach(link => {
      const store = /AliExpress|SHEIN|Amazon/i.exec(link.textContent || '')?.[0]
      if (store) link.textContent = `عرض المنتج على ${store}`
    })
    document.querySelectorAll('.article-content h2, .article-content p').forEach(node => {
      if (/[طظ][§±]/.test(node.textContent || '')) {
        if (node.matches('h2')) node.textContent = 'روابط الشراء'
        else if ((node.textContent || '').includes('طھ')) node.textContent = 'تحقق من الرابط لمعرفة السعر الحالي والتوفر والشحن.'
      }
    })
    document.querySelectorAll('.article h1, .article p, .article a').forEach(node => {
      if (node.children.length) return
      const fixed = repair(node.textContent)
      if (fixed !== node.textContent) node.textContent = fixed
    })
  }
  repairArabicEncoding()
  if (!document.head.querySelector('link[href="/assets/mobile-fixes.css"]')) {
    const responsiveStyle = document.createElement('link')
    responsiveStyle.rel = 'stylesheet'
    responsiveStyle.href = '/assets/mobile-fixes.css'
    document.head.appendChild(responsiveStyle)
  }
  if (!document.head.querySelector('link[rel="icon"]')) {
    const icon = document.createElement('link')
    icon.rel = 'icon'
    icon.type = 'image/svg+xml'
    icon.href = '/assets/favicon.svg'
    document.head.appendChild(icon)
  }
  const search = document.querySelector('#search')
  const cards = [...document.querySelectorAll('.deal-card')]
  const chips = [...document.querySelectorAll('.chip')]
  const empty = document.querySelector('#empty')
  const addRelatedProducts = async () => {
    const article = document.querySelector('.article')
    if (!article || article.querySelector('.related') || document.querySelector('.related-products')) return
    const style = document.createElement('link')
    style.rel = 'stylesheet'
    style.href = '/assets/upgrade.css'
    document.head.appendChild(style)
    const purchaseStyle = document.createElement('link')
    purchaseStyle.rel = 'stylesheet'
    purchaseStyle.href = '/assets/purchase.css'
    document.head.appendChild(purchaseStyle)
    const currentPath = location.pathname
    const currentCategory = article.querySelector('.breadcrumbs a[href*="/categories/"]')?.textContent?.trim()
    const currentTitle = article.querySelector('h1')?.textContent?.trim()
    try {
      const response = await fetch('/index.html')
      const html = await response.text()
      const doc = new DOMParser().parseFromString(html, 'text/html')
      const candidates = [...doc.querySelectorAll('.deal-card')].filter(card => {
        const link = card.querySelector('h2 a, .card-image')?.getAttribute('href')
        const normalizedLink = link ? new URL(link, location.origin).pathname : ''
        const title = card.querySelector('h2')?.textContent?.trim()
        return link && normalizedLink !== currentPath && title !== currentTitle && (!currentCategory || card.dataset.category === currentCategory)
      }).slice(0, 6)
      if (!candidates.length) return
      const section = document.createElement('section')
      section.className = 'related-products'
      section.setAttribute('aria-labelledby', 'related-title')
      section.innerHTML = '<h2 id="related-title">منتجات قد تعجبك</h2><div class="related-grid"></div>'
      const grid = section.querySelector('.related-grid')
      candidates.forEach(card => {
        const link = card.querySelector('h2 a')?.getAttribute('href')
        const image = card.querySelector('img')
        const title = card.querySelector('h2')?.textContent?.trim()
        if (!link || !title) return
        const item = document.createElement('a')
        item.className = 'related-card'
        item.href = link
        item.innerHTML = `<img src="${image?.getAttribute('src') || ''}" alt="${image?.getAttribute('alt') || title}" loading="lazy"><span>${title}</span><small>عرض التفاصيل ←</small>`
        grid.appendChild(item)
      })
      article.insertAdjacentElement('afterend', section)
    } catch (_) {}
  }
  const addPurchaseSummary = () => {
    const article = document.querySelector('.article')
    const links = [...document.querySelectorAll('.article-content .buy-link')]
    if (!article || !links.length || document.querySelector('.purchase-summary')) return
    const box = document.createElement('section')
    box.className = 'purchase-summary'
    box.setAttribute('aria-labelledby', 'purchase-title')
    box.innerHTML = '<h2 id="purchase-title">المتاجر المتاحة</h2><p>السعر والتوفر يتغيران داخل المتجر؛ تحقق منهما قبل إتمام الشراء.</p><div class="purchase-links"></div>'
    const list = box.querySelector('.purchase-links')
    links.forEach(link => {
      const item = document.createElement('a')
      item.href = link.href
      item.target = '_blank'
      item.rel = 'nofollow sponsored noopener'
      item.textContent = link.textContent.replace(/^عرض المنتج على\s*/i, 'الشراء من ')
      list.appendChild(item)
    })
    article.insertBefore(box, article.querySelector('.article-content'))
  }
  const addProductSchema = () => {
    const article = document.querySelector('.article')
    if (!article || document.querySelector('script[data-product-schema]')) return
    const title = article.querySelector('h1')?.textContent?.trim()
    const description = article.querySelector('.article-content > p')?.textContent?.trim()
    const image = article.querySelector('.article-content img')?.src
    const category = article.querySelector('.category')?.textContent?.trim()
    if (!title || !description) return
    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.dataset.productSchema = 'true'
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: title,
      description,
      image: image ? [image] : undefined,
      category,
      url: location.href.split('?')[0],
      brand: { '@type': 'Brand', name: 'SaveMateKSA' }
    })
    document.head.appendChild(script)
  }
  const updateProductSharingMeta = () => {
    const article = document.querySelector('.article')
    if (!article) return
    const title = article.querySelector('h1')?.textContent?.trim()
    const description = article.querySelector('.article-content > p')?.textContent?.trim()
    if (!title || !description) return
    const pageTitle = `${title} | صديق التوفير`
    document.title = pageTitle
    const setMeta = (selector, attribute, value) => {
      let meta = document.head.querySelector(selector)
      if (!meta) {
        meta = document.createElement('meta')
        meta.setAttribute(attribute, selector.includes('property=') ? selector.match(/property="([^"]+)/)?.[1] : selector.match(/name="([^"]+)/)?.[1])
        document.head.appendChild(meta)
      }
      meta.content = value
    }
    setMeta('meta[name="description"]', 'name', description)
    setMeta('meta[property="og:title"]', 'property', pageTitle)
    setMeta('meta[property="og:description"]', 'property', description)
    setMeta('meta[property="og:url"]', 'property', location.href.split('?')[0])
    setMeta('meta[name="twitter:title"]', 'name', pageTitle)
    setMeta('meta[name="twitter:description"]', 'name', description)
  }
  const addBlogNavLink = () => {
    const nav = document.querySelector('.site-header nav')
    if (nav && !nav.querySelector('a[href="/articles/"]')) {
      const link = document.createElement('a')
      link.href = '/articles/'
      link.textContent = 'المقالات'
      nav.insertBefore(link, nav.querySelector('a[href="/about/"]'))
    }
  }
  const tagPurchaseLinks = () => {
    document.querySelectorAll('.article-content .buy-link').forEach(link => {
      try {
        const url = new URL(link.href)
        if (!/^https?:$/.test(url.protocol)) return
        if (!url.searchParams.has('utm_source')) url.searchParams.set('utm_source', 'savemateksa')
        if (!url.searchParams.has('utm_medium')) url.searchParams.set('utm_medium', 'site')
        if (!url.searchParams.has('utm_campaign')) url.searchParams.set('utm_campaign', 'product')
        link.href = url.toString()
      } catch (_) {}
    })
  }
  addProductSchema()
  updateProductSharingMeta()
  tagPurchaseLinks()
  addBlogNavLink()
  addPurchaseSummary()
  addRelatedProducts()
  if (!search || !cards.length) return
  let category = 'الكل'
  const normalize = value => value.toLocaleLowerCase('ar').trim()
  const render = () => {
    const query = normalize(search.value)
    let visible = 0
    cards.forEach(card => {
      const categoryOk = category === 'الكل' || card.dataset.category === category
      const searchOk = !query || normalize(card.dataset.search || '').includes(query)
      const show = categoryOk && searchOk
      card.hidden = !show
      card.style.display = show ? '' : 'none'
      if (show) visible += 1
    })
    empty.hidden = visible !== 0
  }
  search.addEventListener('input', render)
  chips.forEach(chip => chip.addEventListener('click', () => {
    category = chip.dataset.filter
    chips.forEach(item => item.classList.toggle('active', item === chip))
    render()
  }))
})()
