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

  // Plans, add-ons and module (plugin) prices from the public Hubra API. Only what
  // is marked public in manage shows up; if the API is down or nothing is
  // public yet, the static text on the page stays as it is.
  var API = window.HUBRA_API || 'https://api.hubra.club'
  var en = (root.getAttribute('lang') || 'de').slice(0, 2) === 'en'
  var L = en
    ? { month: 'month', year: 'year', or: 'or', onRequest: 'On request', recommended: 'Recommended', members: 'members', upTo: 'Up to', unlimitedMembers: 'Unlimited members', mails: 'mails a month', storage: 'storage', start: 'Start a club', ask: 'Ask for an offer', addons: 'Add-ons', addonsLead: 'Add these to any plan, per month.', perMonth: '/ month' }
    : { month: 'Monat', year: 'Jahr', or: 'oder', onRequest: 'Auf Anfrage', recommended: 'Empfohlen', members: 'Mitglieder', upTo: 'Bis', unlimitedMembers: 'Unbegrenzt Mitglieder', mails: 'Mails pro Monat', storage: 'Speicher', start: 'Verein starten', ask: 'Angebot anfragen', addons: 'Zusatzoptionen', addonsLead: 'Zu jedem Tarif dazubuchbar, pro Monat.', perMonth: '/ Monat' }
  var el = function (tag, cls, text) {
    var n = document.createElement(tag)
    if (cls) n.className = cls
    if (text != null) n.textContent = text
    return n
  }
  var num = function (n) {
    return Number(n).toLocaleString(en ? 'en-GB' : 'de-CH')
  }
  var chf = function (v) {
    var n = Number(v)
    return 'CHF ' + (n % 1 ? n.toFixed(2) : String(n))
  }
  var size = function (mb) {
    return mb >= 1024 ? num(Math.round((mb / 1024) * 10) / 10) + ' GB' : num(mb) + ' MB'
  }
  var getJSON = function (path, done) {
    // Give up after 6 s. Down, in maintenance (503), an HTML error page or
    // a broken answer all leave the static text in place.
    if (!window.fetch) return
    var ctrl = window.AbortController ? new AbortController() : null
    var timer = ctrl && setTimeout(function () {
      ctrl.abort()
    }, 6000)
    fetch(API + path, { credentials: 'omit', signal: ctrl ? ctrl.signal : undefined })
      .then(function (r) {
        return r.ok ? r.json() : null
      })
      .then(function (d) {
        if (d && typeof d === 'object') done(d)
      })
      .catch(function () {})
      .then(function () {
        clearTimeout(timer)
      })
  }

  var plansBox = document.querySelector('[data-plans]')
  if (plansBox) {
    getJSON('/api/v1/public/pricing', function (d) {
      var plans = (Array.isArray(d.plans) ? d.plans : []).slice().sort(function (a, b) {
        return (a.sort || 0) - (b.sort || 0)
      })
      var built = document.createDocumentFragment()
      if (plans.length) {
        plans.forEach(function (p) {
          var card = el('article', 'plan' + (p.highlighted ? ' hi' : ''))
          if (p.highlighted) card.appendChild(el('span', 'tag new', L.recommended))
          card.appendChild(el('h3', null, en ? p.name_en : p.name_de))
          var desc = en ? p.description_en : p.description_de
          if (desc) card.appendChild(el('p', 'plan-desc', desc))
          var big = el('p', 'big')
          if (p.price_month_chf == null) big.textContent = L.onRequest
          else {
            big.textContent = chf(p.price_month_chf) + ' '
            big.appendChild(el('small', null, L.perMonth))
          }
          card.appendChild(big)
          if (p.price_year_chf != null) card.appendChild(el('p', 'plan-year', L.or + ' ' + chf(p.price_year_chf) + ' / ' + L.year))
          var ul = el('ul', 'checks')
          var lim = p.limits || {}
          if ('members' in lim) ul.appendChild(el('li', null, lim.members == null ? L.unlimitedMembers : L.upTo + ' ' + num(lim.members) + ' ' + L.members))
          if (lim.mail_month != null) ul.appendChild(el('li', null, num(lim.mail_month) + ' ' + L.mails))
          if (lim.storage_mb != null) ul.appendChild(el('li', null, size(lim.storage_mb) + ' ' + L.storage))
          ;(p.features || []).forEach(function (f) {
            var t = en ? f.en || f.de : f.de || f.en
            if (t) ul.appendChild(el('li', null, t))
          })
          if (ul.children.length) card.appendChild(ul)
          var a = el('a', 'btn ' + (p.highlighted ? 'btn-p' : 'btn-s'), p.price_month_chf == null ? L.ask : L.start)
          a.href = p.price_month_chf == null ? 'mailto:hi@hubra.club' : 'https://sso.hubra.club/start'
          card.appendChild(a)
          built.appendChild(card)
        })
        plansBox.appendChild(built)
        plansBox.hidden = false
        Array.prototype.forEach.call(document.querySelectorAll('[data-plans-text]'), function (n) {
          n.textContent = n.getAttribute('data-plans-text')
        })
      }
      var addons = Array.isArray(d.addons) ? d.addons : []
      var addBox = document.querySelector('[data-addons]')
      if (addBox && addons.length) {
        var head = document.createDocumentFragment()
        head.appendChild(el('h3', null, L.addons))
        head.appendChild(el('p', null, L.addonsLead))
        var list = el('ul', 'addon-list')
        addons.forEach(function (x) {
          var li = el('li')
          var name = el('div')
          name.appendChild(el('strong', null, en ? x.name_en : x.name_de))
          var note = en ? x.note_en : x.note_de
          if (note) name.appendChild(el('span', null, note))
          li.appendChild(name)
          li.appendChild(el('span', 'addon-price', x.price_month_chf == null ? L.onRequest : chf(x.price_month_chf) + ' ' + L.perMonth))
          list.appendChild(li)
        })
        head.appendChild(list)
        addBox.appendChild(head)
        addBox.hidden = false
      }
    })
  }

  var pluginGrid = document.querySelector('[data-plugins]')
  if (pluginGrid) {
    getJSON('/api/v1/public/plugins', function (d) {
      ;(Array.isArray(d.plugins) ? d.plugins : []).forEach(function (p) {
        var card = pluginGrid.querySelector('[data-plugin="' + String(p.id).replace(/["\\]/g, '') + '"]')
        if (!card) {
          card = el('article', 'feat')
          card.setAttribute('data-plugin', p.id)
          card.appendChild(el('span', 'tag', en ? 'Module' : 'Modul'))
          card.appendChild(el('h3', null, p.name))
          if (p.description) card.appendChild(el('p', null, p.description))
          pluginGrid.appendChild(card)
        }
        var prices = (p.modules || [])
          .map(function (m) {
            return m.price_month_chf
          })
          .filter(function (v) {
            return v != null
          })
          .map(Number)
        if (prices.length) {
          var total = prices.reduce(function (a, b) {
            return a + b
          }, 0)
          card.appendChild(el('p', 'plugin-price', chf(total) + ' ' + L.perMonth))
        }
      })
    })
  }

  // The one Hubra roadmap (planned items and the ideas from clubs, with
  // votes) from the public API. The static list on the page stays when the
  // API is down. Voting happens on sso.hubra.club/roadmap (needs an account).
  var rmBox = document.querySelector('[data-roadmap]')
  if (rmBox) {
    var RM = en
      ? { now: ['In progress', 'What we are working on right now.'], next: ['Up next', 'What comes next.'], later: ['Later', 'Planned, no date yet.'], idea: ['Ideas', 'Ideas from clubs. Vote for what you are missing.'], done: ['Done', 'Already in Hubra.'], vote: 'Vote', one: '1 vote', many: ' votes', shipped: 'in v' }
      : { now: ['Jetzt in Arbeit', 'Daran arbeiten wir gerade.'], next: ['Als Nächstes', 'Kommt als Nächstes an die Reihe.'], later: ['Später', 'Geplant, aber noch ohne Termin.'], idea: ['Vorschläge', 'Ideen aus den Vereinen. Stimmt für das ab, was euch fehlt.'], done: ['Erledigt', 'Schon in Hubra.'], vote: 'Abstimmen', one: '1 Stimme', many: ' Stimmen', shipped: 'in v' }
    var pick = function (t) {
      if (!t || typeof t !== 'object') return ''
      return (en ? t.en || t.de : t.de || t.en) || ''
    }
    var voteUrl = rmBox.getAttribute('data-vote-url') || 'https://sso.hubra.club/roadmap'
    getJSON('/api/v1/global/public/roadmap', function (d) {
      var list = Array.isArray(d.items) ? d.items : []
      if (!list.length) return
      var built = document.createDocumentFragment()
      ;['now', 'next', 'later', 'idea', 'done'].forEach(function (key) {
        var of = list.filter(function (i) {
          return i && i.status === key && pick(i.title)
        })
        if (!of.length) return
        var g = el('div', 'rm-group')
        var h = el('h2', 'rm-head')
        var dot = el('span', 'rm-dot rm-' + key)
        dot.setAttribute('aria-hidden', 'true')
        h.appendChild(dot)
        h.appendChild(document.createTextNode(RM[key][0] + ' '))
        h.appendChild(el('span', 'rm-count', String(of.length)))
        g.appendChild(h)
        g.appendChild(el('p', 'rm-hint', RM[key][1]))
        if (key === 'done') {
          var ul = el('ul', 'rm-done')
          of.forEach(function (i) {
            var li = el('li', null, pick(i.title))
            if (i.version) li.appendChild(el('span', 'rm-ver', RM.shipped + i.version))
            ul.appendChild(li)
          })
          g.appendChild(ul)
        } else {
          var grid = el('div', 'grid rm-grid')
          of.forEach(function (i) {
            var card = el('article', 'feat')
            if (pick(i.area)) card.appendChild(el('span', 'tag', pick(i.area)))
            card.appendChild(el('h3', null, pick(i.title)))
            var sum = pick(i.summary)
            if (sum) card.appendChild(el('p', i.source === 'idea' ? 'rm-sum clamp' : 'rm-sum', sum))
            var n = Number(i.votes) || 0
            if (i.voteable || n > 0) {
              var foot = el('p', 'rm-votes')
              if (n > 0) foot.appendChild(el('span', null, n === 1 ? RM.one : n + RM.many))
              if (i.voteable) {
                var a = el('a', null, RM.vote)
                a.href = voteUrl
                foot.appendChild(a)
              }
              card.appendChild(foot)
            }
            grid.appendChild(card)
          })
          g.appendChild(grid)
        }
        built.appendChild(g)
      })
      rmBox.textContent = ''
      rmBox.appendChild(built)
    })
  }

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
