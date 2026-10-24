/* СКБМТ — интерактив: меню, анимации, каталог, формы, доступность */
(function () {
  'use strict';
  var C = window.SKBMT, $ = function (s, r) { return (r || document).querySelector(s); },
      $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };

  /* --- подстановка контактов и иконок --- */
  $$('[data-skbmt]').forEach(function (el) {
    var k = el.getAttribute('data-skbmt');
    if (k === 'phone') { el.textContent = C.phone; if (el.tagName === 'A') el.href = 'tel:' + C.phoneRaw; }
    else if (k === 'email') { el.textContent = C.email; if (el.tagName === 'A') el.href = 'mailto:' + C.email; }
    else if (C[k]) el.textContent = C[k];
  });
  $$('[data-icon]').forEach(function (el) { el.innerHTML = window.ICONS[el.getAttribute('data-icon')] || ''; });

  /* --- шапка, прогресс, «наверх» --- */
  var header = $('.site-header'), bar = $('.progress'), toTop = $('.to-top');
  function onScroll() {
    var y = window.scrollY, h = document.documentElement.scrollHeight - innerHeight;
    if (header) header.classList.toggle('scrolled', y > 8);
    if (bar) bar.style.width = (h > 0 ? y / h * 100 : 0) + '%';
    if (toTop) toTop.classList.toggle('show', y > 700);
  }
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  if (toTop) toTop.addEventListener('click', function () { scrollTo({ top: 0, behavior: 'smooth' }); });

  var burger = $('.burger'), menu = $('.menu');
  if (burger) {
    burger.addEventListener('click', function () {
      var o = menu.classList.toggle('open'); burger.setAttribute('aria-expanded', o);
    });
    $$('.menu a').forEach(function (a) { a.addEventListener('click', function () { menu.classList.remove('open'); burger.setAttribute('aria-expanded', false); }); });
  }

  /* --- появление при скролле + счётчики --- */
  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add('in'); io.unobserve(e.target);
      if (e.target.hasAttribute('data-count')) count(e.target);
    });
  }, { threshold: .15 }) : null;
  function observe(el) { if (io) io.observe(el); else { el.classList.add('in'); if (el.hasAttribute('data-count')) count(el); } }
  function count(el) {
    var to = +el.getAttribute('data-count'), suffix = el.getAttribute('data-suffix') || '', t0 = performance.now(), dur = 1600;
    (function tick(t) {
      var p = Math.min((t - t0) / dur, 1), v = Math.round(to * (1 - Math.pow(1 - p, 3)));
      el.innerHTML = v.toLocaleString('ru-RU') + '<span>' + suffix + '</span>';
      if (p < 1) requestAnimationFrame(tick);
    })(t0);
  }
  function observeAll() { $$('.reveal:not(.in),[data-count]:not(.in)').forEach(observe); }

  /* --- карточка товара --- */
  function productCard(p, i) {
    var cat = window.CATEGORIES.filter(function (c) { return c.id === p.cat; })[0];
    return '<article class="card product" style="animation-delay:' + (i * 50) + 'ms">' +
      '<div class="product-img"><span class="tag">' + esc(cat.name) + '</span>' + window.ICONS[p.icon] + '</div>' +
      '<div class="product-body"><h3>' + esc(p.name) + '</h3><p>' + esc(p.short) + '</p>' +
      '<div class="product-meta">' + p.tags.map(function (t) { return '<span class="chip">' + esc(t) + '</span>'; }).join('') + '</div>' +
      '<div class="product-actions"><button class="btn btn-primary btn-sm" data-open-quote="' + esc(p.name) + '">Запросить КП</button>' +
      '<button class="btn btn-ghost btn-sm" data-details="' + p.id + '">Подробнее</button></div></div></article>';
  }

  var featured = $('#featured');
  if (featured) featured.innerHTML = window.PRODUCTS.slice(0, 3).map(productCard).join('');

  var grid = $('#product-grid');
  if (grid) {
    var state = { cat: 'all', q: '' }, fbar = $('#filters'), qin = $('#q');
    fbar.innerHTML = [{ id: 'all', name: 'Все' }].concat(window.CATEGORIES).map(function (c) {
      return '<button class="filter" data-cat="' + c.id + '" aria-pressed="' + (c.id === 'all') + '">' + c.name + '</button>';
    }).join('');
    var render = function () {
      var q = state.q.toLowerCase().trim();
      var list = window.PRODUCTS.filter(function (p) {
        return (state.cat === 'all' || p.cat === state.cat) &&
          (!q || (p.name + ' ' + p.short + ' ' + p.desc + ' ' + p.tags.join(' ')).toLowerCase().indexOf(q) > -1);
      });
      grid.innerHTML = list.length ? list.map(productCard).join('') : '<p class="empty">Ничего не найдено. Опишите задачу — подберём решение: <a href="#" data-open-quote="Подбор изделия">оставить заявку</a>.</p>';
      $('#count').textContent = list.length;
    };
    fbar.addEventListener('click', function (e) {
      var b = e.target.closest('.filter'); if (!b) return;
      state.cat = b.dataset.cat;
      $$('.filter', fbar).forEach(function (x) { x.setAttribute('aria-pressed', x === b); });
      render();
    });
    qin.addEventListener('input', function () { state.q = qin.value; render(); });
    var pre = new URLSearchParams(location.search).get('cat');
    if (pre) { var pb = $('[data-cat="' + pre + '"]', fbar); if (pb) pb.click(); } else render();
  }

  /* --- документы, FAQ --- */
  var docs = $('#docs-list');
  if (docs) {
    var groups = {};
    window.DOCS.forEach(function (d) { (groups[d.group] = groups[d.group] || []).push(d); });
    docs.innerHTML = Object.keys(groups).map(function (g) {
      return '<h3 class="reveal" style="margin:2.2rem 0 1rem">' + esc(g) + '</h3><div class="grid g2">' + groups[g].map(function (d) {
        return '<div class="card doc reveal"><div class="doc-ico">PDF</div><div><h3>' + esc(d.title) + '</h3><small>' + esc(d.note) + '</small>' +
          (d.file ? '<a class="btn btn-ghost btn-sm" href="' + esc(d.file) + '" target="_blank" rel="noopener">Открыть документ</a>' :
            '<span class="doc-status">Скан загружается</span> <a class="btn btn-ghost btn-sm" href="#" data-open-quote="Запрос документа: ' + esc(d.title) + '">Запросить копию</a>') +
          '</div></div>';
      }).join('') + '</div>';
    }).join('');
  }
  var faq = $('#faq-list');
  if (faq) faq.innerHTML = window.FAQ.map(function (f) { return '<details class="reveal"><summary>' + esc(f.q) + '</summary><p>' + esc(f.a) + '</p></details>'; }).join('');
  observeAll();

  /* --- модальные окна --- */
  var quote = $('#quote-modal'), lastFocus;
  function openModal(m) { lastFocus = document.activeElement; m.classList.add('open'); document.body.style.overflow = 'hidden'; var f = $('input,textarea', m); if (f) setTimeout(function () { f.focus(); }, 60); }
  function closeModal(m) { m.classList.remove('open'); document.body.style.overflow = ''; if (lastFocus) lastFocus.focus(); }
  document.addEventListener('click', function (e) {
    var o = e.target.closest('[data-open-quote]');
    if (o) {
      e.preventDefault();
      var subj = o.getAttribute('data-open-quote');
      $('#quote-subject').value = subj || '';
      $('#quote-title').textContent = subj ? 'Запрос: ' + subj : 'Запросить коммерческое предложение';
      openModal(quote); return;
    }
    var d = e.target.closest('[data-details]');
    if (d) {
      var p = window.PRODUCTS.filter(function (x) { return x.id === d.dataset.details; })[0];
      var dm = $('#details-modal');
      $('#details-body').innerHTML = '<div class="icon-wrap" style="width:64px;height:64px">' + window.ICONS[p.icon] + '</div><h2 style="font-size:1.6rem">' + esc(p.name) + '</h2><p>' + esc(p.desc) +
        '</p><div class="product-meta">' + p.tags.map(function (t) { return '<span class="chip">' + esc(t) + '</span>'; }).join('') + '</div>' +
        '<p style="font-size:.85rem;color:var(--muted)">Технические характеристики и показания — в регистрационном удостоверении и инструкции по применению (раздел «Документы»).</p>' +
        '<button class="btn btn-primary" data-open-quote="' + esc(p.name) + '">Запросить КП</button>';
      openModal(dm); return;
    }
    if (e.target.closest('[data-close]') || e.target.classList.contains('modal')) {
      var m = e.target.closest('.modal') || e.target; closeModal(m);
    }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') $$('.modal.open').forEach(closeModal);
  });
  document.addEventListener('click', function (e) { /* открыть вторую модалку поверх: закрываем первую */
    if (e.target.closest('#details-body [data-open-quote]')) $('#details-modal').classList.remove('open');
  }, true);

  /* --- отправка заявок (общая для форм и чат-бота) --- */
  window.sendLead = function (data) {
    data.page = location.href; data.sentAt = new Date().toISOString();
    if (C.formEndpoint) {
      return fetch(C.formEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(data) })
        .then(function (r) { if (!r.ok) throw new Error(r.status); return { mode: 'server' }; });
    }
    var body = ['Имя: ' + (data.name || ''), 'Телефон: ' + (data.phone || ''), 'E-mail: ' + (data.email || ''), 'Организация: ' + (data.company || ''),
      'Тема: ' + (data.subject || ''), '', data.message || '', '', 'Страница: ' + data.page].join('\n');
    location.href = 'mailto:' + C.email + '?subject=' + encodeURIComponent('Заявка с сайта: ' + (data.subject || 'обращение')) + '&body=' + encodeURIComponent(body);
    return Promise.resolve({ mode: 'mailto' });
  };

  function digits(s) { return s.replace(/\D/g, ''); }
  $$('input[type=tel]').forEach(function (inp) {
    inp.addEventListener('input', function () {
      var d = digits(inp.value); if (d[0] === '8') d = '7' + d.slice(1); if (d && d[0] !== '7') d = '7' + d; d = d.slice(0, 11);
      var o = d ? '+7' : ''; if (d.length > 1) o += ' (' + d.slice(1, 4); if (d.length >= 4) o += ') ' + d.slice(4, 7);
      if (d.length >= 7) o += '-' + d.slice(7, 9); if (d.length >= 9) o += '-' + d.slice(9, 11); inp.value = o;
    });
  });
  var rules = {
    name: function (v) { return v.trim().length >= 2 || 'Укажите имя'; },
    phone: function (v) { return digits(v).length === 11 || 'Введите телефон полностью'; },
    email: function (v) { return !v || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) || 'Проверьте e-mail'; },
    consent: function (v, el) { return el.checked || 'Нужно согласие на обработку данных'; }
  };
  $$('form[data-form]').forEach(function (form) {
    var status = $('.form-status', form);
    form.setAttribute('novalidate', '');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if ($('.hp', form) && $('.hp', form).value) return; // ловушка для ботов
      var ok = true, data = {};
      $$('input,textarea,select', form).forEach(function (el) {
        if (!el.name || el.classList.contains('hp')) return;
        data[el.name] = el.type === 'checkbox' ? el.checked : el.value;
        var f = el.closest('.field') || el.closest('.check'), r = rules[el.name], res = r ? r(el.value, el) : true;
        if (f && f.classList.contains('field')) {
          f.classList.toggle('invalid', res !== true);
          var er = $('.err', f); if (er) er.textContent = res !== true ? res : '';
        }
        if (res !== true) { ok = false; if (el.type === 'checkbox') { status.className = 'form-status fail'; status.textContent = res; } }
      });
      if (!ok) { var bad = $('.invalid input,.invalid textarea', form); if (bad) bad.focus(); return; }
      var btn = $('button[type=submit]', form); btn.disabled = true; btn.textContent = 'Отправляем…';
      window.sendLead(data).then(function (r) {
        form.reset(); status.className = 'form-status ok';
        status.textContent = r.mode === 'server' ? 'Спасибо! Заявка принята — менеджер свяжется с вами в рабочее время.' : 'Открылась почтовая программа — нажмите «Отправить» в письме. Либо позвоните: ' + C.phone;
      }).catch(function () {
        status.className = 'form-status fail'; status.textContent = 'Не удалось отправить. Позвоните нам: ' + C.phone;
      }).then(function () { btn.disabled = false; btn.textContent = btn.dataset.label; });
    });
    $$('button[type=submit]', form).forEach(function (b) { b.dataset.label = b.textContent; });
    form.addEventListener('input', function (e) { var f = e.target.closest('.field'); if (f) f.classList.remove('invalid'); });
  });

  /* --- доступность: размер шрифта и контраст --- */
  var root = document.documentElement, fs = parseFloat(store.get('fs')) || 1;
  function applyA11y() { root.style.setProperty('--fs', fs); root.classList.toggle('hc', store.get('hc') === '1'); }
  applyA11y();
  $$('[data-a11y]').forEach(function (b) {
    b.addEventListener('click', function () {
      var a = b.dataset.a11y;
      if (a === 'plus') fs = Math.min(fs + .1, 1.4); if (a === 'minus') fs = Math.max(fs - .1, .9);
      if (a === 'contrast') store.set('hc', store.get('hc') === '1' ? '0' : '1');
      if (a === 'reset') { fs = 1; store.set('hc', '0'); }
      store.set('fs', fs); applyA11y();
    });
  });

  /* --- cookie --- */
  var ck = $('.cookie');
  if (ck && !store.get('cookie-ok')) setTimeout(function () { ck.classList.add('show'); }, 1500);
  if (ck) $('button', ck).addEventListener('click', function () { store.set('cookie-ok', '1'); ck.classList.remove('show'); });
})();
