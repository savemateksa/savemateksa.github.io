(() => {
  if (document.querySelector('.sm-share')) return
  const url = location.href.split('#')[0]
  const title = document.title.replace(/\s*\|\s*صديق التوفير\s*$/, '').trim()
  const encodedUrl = encodeURIComponent(url)
  const encodedTitle = encodeURIComponent(title)
  const message = encodeURIComponent(`${title} ${url}`)
  const wrap = document.createElement('section')
  wrap.className = 'sm-share'
  wrap.setAttribute('aria-label', 'شارك الصفحة')
  wrap.innerHTML = `<span class="sm-share-title">شارك المقال أو المنتج</span><p class="sm-share-note">أرسل الرابط لمن يهمه العرض أو الدليل.</p><div class="sm-share-links"><a class="sm-whatsapp" href="https://wa.me/?text=${message}" target="_blank" rel="noopener noreferrer">واتساب</a><a class="sm-facebook" href="https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}" target="_blank" rel="noopener noreferrer">فيسبوك</a><a class="sm-x" href="https://x.com/intent/post?text=${message}" target="_blank" rel="noopener noreferrer">X</a><a class="sm-telegram" href="https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}" target="_blank" rel="noopener noreferrer">تيليجرام</a><button type="button" class="sm-copy">نسخ الرابط</button><button type="button" class="sm-native">مشاركة</button></div>`
  const copy = wrap.querySelector('.sm-copy')
  const nativeBtn = wrap.querySelector('.sm-native')
  copy.onclick = async () => {
    try {
      await navigator.clipboard.writeText(url)
      copy.textContent = 'تم النسخ'
      setTimeout(() => { copy.textContent = 'نسخ الرابط' }, 1800)
    } catch (_) {
      prompt('انسخ الرابط', url)
    }
  }
  if (navigator.share) {
    nativeBtn.onclick = () => navigator.share({ title, url })
  } else {
    nativeBtn.remove()
  }
  const target = document.querySelector('main') || document.querySelector('article') || document.querySelector('.article-content') || document.querySelector('.product')
  if (target) target.appendChild(wrap)
})()
