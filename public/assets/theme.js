// Picks light or dark before the first paint, with the same rules as the
// Hubra apps: the hubra_theme cookie (shared with app/sso/manage.hubra.club),
// else the browser's own setting. "auto" leaves the choice to the browser.
;(function () {
  var root = document.documentElement
  root.classList.add('js')
  var value = (document.cookie.match(/(?:^|; )hubra_theme=(light|dark|auto)/) || [])[1]
  if (!value) {
    try {
      value = localStorage.getItem('hubra_theme') || 'auto'
    } catch (e) {
      value = 'auto'
    }
  }
  root.setAttribute('data-theme-choice', value)
  if (value === 'light' || value === 'dark') root.setAttribute('data-theme', value)
})()
