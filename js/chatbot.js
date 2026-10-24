/* Чат-бот СКБМТ: правила + сбор заявки. Работает без сервера; при заполнении SKBMT.chatApi
   неизвестные вопросы уходят в ваш ИИ-эндпоинт (POST {message, history} → {reply}). */
(function () {
  'use strict';
  var C = window.SKBMT, $ = function (s, r) { return (r || document).querySelector(s); };
  var fab = $('.chat-fab'), box = $('.chat'), body = $('.chat-body'), form = $('.chat-form'), input = $('.chat-form input'), tip = $('.chat-tip');
  if (!fab) return;

  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var history = [], lead = null, opened = false;
  var QUICK = ['Каталог', 'Запросить КП', 'Документы', 'Доставка', 'Контакты', 'О компании'];

  /* ключевые основы слов → ответ. Порядок важен: более специфичные выше. */
  var INTENTS = [
    { k: ['привет', 'здравств', 'добрый', 'хай'], a: 'Здравствуйте! Я помогу подобрать изделие, найти документы и оформить заявку. Что вас интересует?' },
    { k: ['клапан', 'карбоник', 'протез'], a: 'Механический протез клапана сердца <b>«Карбоникс-1»</b> — флагманское изделие СКБМТ. Подробности и запрос КП — в <a href="catalog.html?cat=cardio">каталоге</a>. Показания и типоразмеры указаны в регистрационном удостоверении.', q: ['Запросить КП', 'Документы'] },
    { k: ['кольц', 'комп-01', 'комп 01', 'митрал'], a: 'Опорные митральные кольца <b>«Комп-01»</b> применяются при реконструктивных операциях на митральном клапане. <a href="catalog.html?cat=cardio">Смотреть в каталоге</a>.', q: ['Запросить КП'] },
    { k: ['фетр', 'ф-4', 'фторопласт'], a: 'Медицинский фетр из фторопласта Ф-4 — имплантационный материал для сердечно-сосудистой хирургии. Поставляется оптом. <a href="catalog.html?cat=cardio">Подробнее</a>.', q: ['Запросить КП'] },
    { k: ['упаков', 'контейнер', 'банк', 'кожух', 'поликарбонат', 'пэт'], a: 'Делаем упаковку для клапанов сердца: банки и кожухи из поликарбоната, контейнеры из ПЭТ. Изготовим под ваше изделие. <a href="catalog.html?cat=pack">Раздел упаковки</a>.', q: ['Запросить КП'] },
    { k: ['рти', 'резин', 'манжет', 'прокладк', 'диафрагм', 'силикон', 'трубк', 'экструз', 'лить', 'формов', 'полиамид'], a: 'Выпускаем технические изделия: формовые РТИ, силиконовые трубки (экструзия), литьё термопластов под давлением, вакуумную формовку. <a href="catalog.html?cat=tech">Технические изделия</a>. Можем работать по вашему чертежу.', q: ['Запросить КП'] },
    { k: ['чертеж', 'на заказ', 'разработ', 'ниокр', 'оснастк', 'пресс-форм'], a: 'Да, работаем по чертежам и образцам заказчика и ведём НИОКР: от ТЗ и оснастки до серии. Расскажите о задаче — передам инженеру.', q: ['Запросить КП'] },
    { k: ['каталог', 'продукц', 'ассортимент', 'что выпуска', 'что производ', 'изделия'], a: 'В каталоге четыре направления: кардиохирургия, упаковка, технические изделия и НИОКР. <a href="catalog.html">Открыть каталог</a>.', q: ['Клапаны', 'Упаковка', 'Технические изделия'] },
    { k: ['сертификат', 'документ', 'удостовер', 'ру ', 'лиценз', 'декларац', 'iso', 'качеств'], a: 'Регистрационные удостоверения и сертификаты собраны в разделе <a href="documents.html">«Документы»</a>. Нужен конкретный документ — оставьте заявку, пришлём копию.', q: ['Запросить КП'] },
    { k: ['цен', 'стоим', 'прайс', 'сколько', 'кп', 'коммерческ', 'купить', 'заказ'], a: 'Цены договорные: зависят от изделия, типоразмера и объёма. Оформим заявку и подготовим коммерческое предложение?', q: ['Оформить заявку'] },
    { k: ['достав', 'отправ', 'транспорт', 'регион', 'снг', 'экспорт'], a: 'Отправляем транспортными компаниями по России и в страны СНГ. Способ и сроки согласуем при заказе.', q: ['Оформить заявку'] },
    { k: ['оптом', 'опт', 'дилер', 'партнёр', 'партнер', 'сотрудничеств'], a: 'Работаем с оптовыми покупателями и ищем дилеров в России и СНГ. Оставьте контакты — менеджер расскажет об условиях.', q: ['Оформить заявку'] },
    { k: ['адрес', 'где наход', 'как добрат', 'контакт', 'телефон', 'позвон', 'почт', 'email', 'e-mail'], a: 'Мы в Кирово-Чепецке: <b>' + esc(C.address) + '</b>.<br>Телефон: <a href="tel:' + C.phoneRaw + '">' + esc(C.phone) + '</a><br>E-mail: <a href="mailto:' + C.email + '">' + esc(C.email) + '</a>', q: ['Оформить заявку'] },
    { k: ['мединж', 'групп', 'пенз', 'кардиоплант', 'эндокарбон', 'наномед'], a: 'СКБМТ входит в группу компаний <b>МедИнж</b> (Пенза) — одного из крупнейших российских производителей имплантируемых изделий: более 200 000 имплантированных протезов клапанов сердца, поставки в 25 стран. <a href="about.html">Подробнее о группе</a>.' },
    { k: ['о компании', 'о вас', 'кто вы', 'истори', 'расскаж'], a: 'СКБМТ — Специальное конструкторское бюро медицинской тематики из Кирово-Чепецка. Разрабатываем и производим высокотехнологичные медицинские изделия для кардиохирургии. <a href="about.html">О компании</a>.' },
    { k: ['оператор', 'человек', 'менеджер', 'связаться', 'перезвон', 'заявк'], act: 'lead' },
    { k: ['спасибо', 'благодар'], a: 'Пожалуйста! Если появятся вопросы — я на связи.' },
    { k: ['пока', 'до свидан'], a: 'До свидания! Будем рады помочь.' }
  ];

  function add(text, who, html) {
    var m = document.createElement('div'); m.className = 'msg ' + who;
    if (html) m.innerHTML = text; else m.textContent = text;
    body.appendChild(m); body.scrollTop = body.scrollHeight; return m;
  }
  function quick(list) {
    if (!list || !list.length) return;
    var q = document.createElement('div'); q.className = 'quick';
    list.forEach(function (t) {
      var b = document.createElement('button'); b.type = 'button'; b.textContent = t;
      b.onclick = function () { q.remove(); handle(t); }; q.appendChild(b);
    });
    body.appendChild(q); body.scrollTop = body.scrollHeight;
  }
  function botSay(html, q) {
    var t = document.createElement('div'); t.className = 'msg bot typing'; t.innerHTML = '<i></i><i></i><i></i>'; body.appendChild(t); body.scrollTop = body.scrollHeight;
    setTimeout(function () { t.remove(); add(html, 'bot', true); history.push({ r: 'bot', t: html }); quick(q); }, 450 + Math.min(html.length * 4, 700));
  }

  function match(text) {
    var s = text.toLowerCase();
    for (var i = 0; i < INTENTS.length; i++) for (var j = 0; j < INTENTS[i].k.length; j++) if (s.indexOf(INTENTS[i].k[j]) > -1) return INTENTS[i];
    return null;
  }

  /* сбор заявки: имя → телефон → вопрос */
  function startLead(subject) {
    lead = { step: 'name', data: { subject: subject || 'Заявка из чат-бота' } };
    botSay('С удовольствием передам запрос менеджеру. <b>Как вас зовут?</b>');
  }
  function leadStep(text) {
    var d = lead.data;
    if (lead.step === 'name') {
      if (text.trim().length < 2) return botSay('Напишите, пожалуйста, имя.');
      d.name = text.trim(); lead.step = 'phone'; return botSay('Приятно познакомиться, ' + esc(d.name) + '! <b>Ваш телефон</b> для связи?');
    }
    if (lead.step === 'phone') {
      var dg = text.replace(/\D/g, ''); if (dg.length < 10) return botSay('Похоже, номер неполный. Введите телефон, например +7 900 000-00-00.');
      d.phone = text.trim(); lead.step = 'msg'; return botSay('Что вас интересует? Напишите изделие и примерный объём (или «пропустить»).');
    }
    if (lead.step === 'msg') {
      d.message = /^пропустить$/i.test(text.trim()) ? '' : text.trim(); lead.step = 'consent';
      return botSay('Отправляя заявку, вы соглашаетесь на обработку персональных данных (<a href="privacy.html" target="_blank">политика</a>). Отправить?', ['Да, отправить', 'Отмена']);
    }
    if (lead.step === 'consent') {
      if (/^да|отправ|ok|ок/i.test(text)) {
        d.consent = true; var l = lead; lead = null;
        window.sendLead(d).then(function (r) {
          botSay(r.mode === 'server' ? 'Готово! Заявка передана, менеджер свяжется с вами в рабочее время. 🙌' : 'Открылась почтовая программа с готовым письмом — нажмите «Отправить». Или позвоните: ' + esc(C.phone), ['Каталог']);
        }).catch(function () { botSay('Не получилось отправить. Позвоните, пожалуйста: <a href="tel:' + C.phoneRaw + '">' + esc(C.phone) + '</a>'); });
      } else { lead = null; botSay('Хорошо, отменил. Чем ещё помочь?', QUICK); }
    }
  }

  function handle(text) {
    text = text.trim(); if (!text) return;
    add(text, 'user'); history.push({ r: 'user', t: text });
    if (lead) return leadStep(text);
    if (/оформить заявку|запросить кп|заявк|коммерческ/i.test(text) && !/цен|сколько|стоим/i.test(text)) return startLead(text);
    var it = match(text);
    if (it && it.act === 'lead') return startLead();
    if (it) return botSay(it.a, it.q);
    if (C.chatApi) {
      return fetch(C.chatApi, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: text, history: history.slice(-8) }) })
        .then(function (r) { return r.json(); }).then(function (j) { botSay(esc(j.reply || '')); })
        .catch(function () { botSay('Не смог получить ответ. Могу передать вопрос менеджеру.', ['Оформить заявку']); });
    }
    botSay('Не уверен, что понял вопрос. Выберите тему или оставьте заявку — менеджер ответит лично.', ['Каталог', 'Документы', 'Оформить заявку']);
  }

  function toggle(open) {
    opened = open; box.classList.toggle('open', open); fab.setAttribute('aria-expanded', open); if (tip) tip.remove();
    if (open) {
      if (!body.children.length) { botSay('Здравствуйте! Я виртуальный помощник СКБМТ. Подскажу по продукции, документам и доставке, а также оформлю заявку.', QUICK); }
      setTimeout(function () { input.focus(); }, 100);
    }
  }
  fab.addEventListener('click', function () { toggle(!opened); });
  $('.chat-head button').addEventListener('click', function () { toggle(false); fab.focus(); });
  form.addEventListener('submit', function (e) { e.preventDefault(); var v = input.value; input.value = ''; handle(v); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && opened) toggle(false); });
  document.addEventListener('click', function (e) { var o = e.target.closest('[data-open-chat]'); if (o) { e.preventDefault(); toggle(true); } });
  setTimeout(function () { if (tip && !opened) tip.style.display = 'block'; }, 6000);
  setTimeout(function () { if (tip) tip.remove(); }, 20000);
})();
