// Small enhancements for hubra.club. The site works without them.
;(function () {
  var root = document.documentElement

  // Theme switch: auto → light → dark. The choice goes into the same
  // hubra_theme cookie the apps use, so the site and the app match.
  var themeBtn = document.querySelector('.theme-btn')
  if (themeBtn) {
    var order = ['auto', 'light', 'dark']
    var show = function (mode) {
      themeBtn.setAttribute('data-mode', mode)
      if (mode === 'auto') root.removeAttribute('data-theme')
      else root.setAttribute('data-theme', mode)
    }
    show(root.getAttribute('data-theme-choice') || 'auto')
    themeBtn.hidden = false
    themeBtn.addEventListener('click', function () {
      var next = order[(order.indexOf(themeBtn.getAttribute('data-mode')) + 1) % order.length]
      show(next)
      var host = location.hostname
      var domain = /(^|\.)hubra\.club$/.test(host) ? '; domain=.hubra.club' : ''
      document.cookie = 'hubra_theme=' + next + '; path=/; max-age=31536000; samesite=lax' + domain + (location.protocol === 'https:' ? '; secure' : '')
      try {
        localStorage.setItem('hubra_theme', next)
      } catch (e) {}
    })
  }

  // Phone menu.
  var menuBtn = document.querySelector('.menu-btn')
  var nav = document.getElementById('nav')
  if (menuBtn && nav) {
    menuBtn.hidden = false
    var setOpen = function (open) {
      nav.classList.toggle('open', open)
      menuBtn.setAttribute('aria-expanded', String(open))
    }
    menuBtn.addEventListener('click', function () {
      setOpen(!nav.classList.contains('open'))
    })
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) setOpen(false)
    })
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') setOpen(false)
    })
  }

  // Product tour tabs (arrow keys move between them).
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.tour-tab'))
  var select = function (tab, focus) {
    tabs.forEach(function (t) {
      var on = t === tab
      t.setAttribute('aria-selected', String(on))
      t.tabIndex = on ? 0 : -1
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on
    })
    if (focus) tab.focus()
  }
  tabs.forEach(function (tab, i) {
    tab.addEventListener('click', function () {
      select(tab, false)
    })
    tab.addEventListener('keydown', function (e) {
      var d = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key]
      if (!d) return
      e.preventDefault()
      select(tabs[(i + d + tabs.length) % tabs.length], true)
    })
  })
  if (tabs.length) select(tabs[0], false)

  // Legal pages: mark the section being read in the table of contents.
  var tocLinks = Array.prototype.slice.call(document.querySelectorAll('.toc a'))
  if (tocLinks.length && 'IntersectionObserver' in window) {
    var byId = {}
    tocLinks.forEach(function (a) {
      byId[a.getAttribute('href').slice(1)] = a
    })
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return
          tocLinks.forEach(function (a) {
            a.classList.remove('on')
          })
          var a = byId[entry.target.id]
          if (a) a.classList.add('on')
        })
      },
      { rootMargin: '-80px 0px -70% 0px' }
    )
    Object.keys(byId).forEach(function (id) {
      var el = document.getElementById(id)
      if (el) io.observe(el)
    })
  }
})()
