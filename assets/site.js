(() => {
  const search = document.querySelector('#search')
  const cards = [...document.querySelectorAll('.deal-card')]
  const chips = [...document.querySelectorAll('.chip')]
  const empty = document.querySelector('#empty')
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
