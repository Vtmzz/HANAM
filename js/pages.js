(function (window, document) {
  'use strict';
  var UI = window.UI;
  var OWN = { home: true, sobre: true, contato: true, planos: true, faq: true };

  function page() { return document.body && document.body.dataset.page || 'home'; }
  function coreReady() {
    var core = window.Core;
    return core && core.ready && typeof core.ready.then === 'function' ? core.ready : Promise.resolve();
  }
  function app() { return document.getElementById('app'); }
  function core() { return window.Core || null; }
  function safeRead(table) {
    var c = core();
    if (!c || typeof c.read !== 'function') return [];
    try { var value = c.read(table); return Array.isArray(value) ? value : []; } catch (e) { return []; }
  }
  function doctorList() {
    var c = core();
    if (!c || typeof c.doctors !== 'function') return [];
    try { var value = c.doctors(); return Array.isArray(value) ? value : []; } catch (e) { return []; }
  }
  function initials(name) {
    return String(name || 'H').split(/\s+/).slice(0, 2).map(function (part) { return part.charAt(0); }).join('').toUpperCase();
  }
  function doctorCards(doctors) {
    if (!doctors.length) return UI.empty('Catálogo em preparação', 'As informações dos profissionais aparecerão aqui assim que o cadastro estiver disponível.');
    return '<div class="result-grid">' + doctors.slice(0, 3).map(function (doctor) {
      var id = UI.esc(doctor.id || '');
      return '<article class="card doctor-card"><div class="doctor-card-head"><div class="doctor-avatar" aria-hidden="true">' + UI.esc(initials(doctor.name)) + '</div><span class="badge badge-accent">' + (doctor.active === false ? 'inativo' : 'agenda ativa') + '</span></div><div><h3>' + UI.esc(doctor.name || 'Médico') + '</h3><p class="doctor-meta">' + UI.esc(doctor.specialty || 'Atendimento geral') + (doctor.crm ? ' · ' + UI.esc(doctor.crm) : '') + '</p></div><p class="muted">' + UI.esc(doctor.description || 'Conheça a agenda e os horários disponíveis deste profissional.') + '</p><a class="btn btn-secondary btn-small" href="agendamento.html?doctor=' + id + '">Ver horários ' + UI.icon('arrow') + '</a></article>';
    }).join('') + '</div>';
  }
  function metricsMarkup(doctors, user) {
    if (!user || user.role !== 'admin') return '<div class="metrics-strip clinic-home-metrics" aria-label="Características do sistema"><div class="metric"><strong>01</strong><span>agenda e horários</span></div><div class="metric"><strong>02</strong><span>equipe médica</span></div><div class="metric"><strong>03</strong><span>atendimento</span></div></div>';
    var appointments = safeRead('appointments');
    var patients = safeRead('users').filter(function (item) { return item && item.role === 'paciente'; });
    var c = core();
    var todayCount = appointments.filter(function (item) { return item.date === (c && c.today ? c.today() : '') && item.status === 'confirmed'; }).length;
    return '<div class="metrics-strip clinic-home-metrics" aria-label="Resumo local da clínica"><div class="metric"><strong>' + doctors.filter(function (doctor) { return doctor.active; }).length + '</strong><span>profissionais com agenda ativa</span></div><div class="metric"><strong>' + todayCount + '</strong><span>consultas confirmadas para hoje</span></div><div class="metric"><strong>' + patients.length + '</strong><span>pacientes cadastrados</span></div></div>';
  }
  function bindDoctorCarousel(carousel) {
    if (carousel) Array.prototype.forEach.call(carousel.querySelectorAll('img[data-local-fallback]'), function (image) {
      image.addEventListener('error', function () {
        if (image.dataset.fallbackApplied === 'true') return;
        image.dataset.fallbackApplied = 'true';
        image.src = image.dataset.localFallback;
      });
    });
    if (!carousel || carousel.dataset.bound === 'true') return;
    carousel.dataset.bound = 'true';
    var slides = Array.prototype.slice.call(carousel.querySelectorAll('[data-carousel-slide]'));
    var dots = Array.prototype.slice.call(carousel.querySelectorAll('[data-carousel-dot]'));
    if (slides.length < 2) return;
    var active = 0;
    var timer = null;
    var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function show(index) {
      active = (index + slides.length) % slides.length;
      slides.forEach(function (slide, i) {
        var selected = i === active;
        slide.classList.toggle('is-active', selected);
        slide.setAttribute('aria-hidden', String(!selected));
        if ('inert' in slide) slide.inert = !selected;
      });
      dots.forEach(function (dot, i) {
        var selected = i === active;
        dot.classList.toggle('is-active', selected);
        dot.setAttribute('aria-current', String(selected));
      });
    }
    function stop() { if (timer) window.clearInterval(timer); timer = null; }
    function start() { stop(); if (!reducedMotion && !document.hidden) timer = window.setInterval(function () { show(active + 1); }, 6000); }
    carousel.querySelector('[data-carousel-prev]').addEventListener('click', function () { show(active - 1); start(); });
    carousel.querySelector('[data-carousel-next]').addEventListener('click', function () { show(active + 1); start(); });
    dots.forEach(function (dot) { dot.addEventListener('click', function () { show(Number(dot.dataset.carouselDot)); start(); }); });
    carousel.addEventListener('mouseenter', stop);
    carousel.addEventListener('mouseleave', start);
    carousel.addEventListener('focusin', stop);
    carousel.addEventListener('focusout', function (event) { if (!carousel.contains(event.relatedTarget)) start(); });
    document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else start(); });
    show(0);
    start();
  }
  function renderHome() {
    var target = app(); if (!target) return;
    var doctors = doctorList();
    var c = core();
    var user = c && typeof c.user === 'function' ? c.user() : null;
    var admin = !!(user && user.role === 'admin');
    var roleTarget = admin ? 'intranet.html' : user && user.role === 'medico' ? 'intranetm.html' : user && user.role === 'paciente' ? 'intranetp.html' : 'login.html';
    var roleLabel = admin ? 'Abrir painel clínico' : user && user.role === 'medico' ? 'Abrir minha agenda' : user ? 'Abrir minha área' : 'Entrar no sistema';
    var secondHref = admin ? 'atendimento.html' : 'agendamento.html';
    var secondLabel = admin ? 'Ver fila de atendimento' : 'Agendar consulta';
    var moduleCards = admin
      ? '<article class="card guide-card"><div class="icon-box">' + UI.icon('user') + '</div><h3>Pacientes</h3><p>Consulte os cadastros e as consultas vinculadas.</p><a href="pacientes.html">Abrir diretório ' + UI.icon('arrow') + '</a></article><article class="card guide-card"><div class="icon-box">' + UI.icon('stethoscope') + '</div><h3>Equipe médica</h3><p>Consulte profissionais e controle a disponibilidade das agendas.</p><a href="equipe.html">Gerenciar equipe ' + UI.icon('arrow') + '</a></article><article class="card guide-card"><div class="icon-box">' + UI.icon('calendar') + '</div><h3>Atendimento</h3><p>Acompanhe consultas do dia e atualize a etapa operacional.</p><a href="atendimento.html">Abrir fila ' + UI.icon('arrow') + '</a></article>'
      : '<article class="card guide-card"><div class="icon-box">' + UI.icon('calendar') + '</div><h3>Agendamentos</h3><p>Consulte horários disponíveis na agenda médica.</p><a href="agendamento.html">Abrir agenda ' + UI.icon('arrow') + '</a></article><article class="card guide-card"><div class="icon-box">' + UI.icon('stethoscope') + '</div><h3>Guia médico</h3><p>Conheça as especialidades e os profissionais cadastrados.</p><a href="medicos.html">Ver profissionais ' + UI.icon('arrow') + '</a></article><article class="card guide-card"><div class="icon-box">' + UI.icon('user') + '</div><h3>Área pessoal</h3><p>Acesse sua agenda e seus dados cadastrais.</p><a href="' + roleTarget + '">' + roleLabel + ' ' + UI.icon('arrow') + '</a></article>';
    var metricsUser = admin ? user : null;
    target.innerHTML = '<section class="home-hero home-classic clinic-hero"><div class="container"><div class="doctor-carousel" data-doctor-carousel aria-roledescription="carrossel" aria-label="Equipe médica Haname"><div class="doctor-carousel__slide is-active" data-carousel-slide aria-hidden="false"><img class="doctor-carousel__image doctor-carousel__image--equipe" src="assets/equipe-medica.jpg" alt="Equipe médica em ambiente de atendimento" fetchpriority="high"><div class="doctor-carousel__shade"></div><div class="doctor-carousel__copy"><p class="eyebrow">Haname · cuidado e organização</p><h1>Uma equipe pronta para cuidar de você.</h1><p class="lead">Conheça profissionais, consulte agendas e organize seus próximos passos com mais clareza.</p><div class="hero-actions"><a class="btn btn-primary" href="' + roleTarget + '">' + roleLabel + ' ' + UI.icon('arrow') + '</a><a class="btn btn-secondary" href="' + secondHref + '">' + secondLabel + ' ' + UI.icon('calendar') + '</a></div></div></div><div class="doctor-carousel__slide" data-carousel-slide aria-hidden="true" inert><img class="doctor-carousel__image doctor-carousel__image--consulta" src="assets/consulta-medica.jpg" alt="Médica e paciente durante uma consulta em consultório" loading="lazy"><div class="doctor-carousel__shade"></div><div class="doctor-carousel__copy"><p class="eyebrow">Consulta com atenção</p><h2>Uma boa consulta começa com escuta.</h2><p class="lead">Cada conversa merece acolhimento, tempo e informação clara.</p><div class="hero-actions"><a class="btn btn-primary" href="medicos.html">Conhecer a equipe ' + UI.icon('arrow') + '</a><a class="btn btn-secondary" href="agendamento.html">Consultar horários ' + UI.icon('calendar') + '</a></div></div></div><div class="doctor-carousel__slide" data-carousel-slide aria-hidden="true" inert><img class="doctor-carousel__image doctor-carousel__image--profissional" src="assets/medica-consultorio.jpg" alt="Médica em consultório" loading="lazy"><div class="doctor-carousel__shade"></div><div class="doctor-carousel__copy"><p class="eyebrow">Equipe multiprofissional</p><h2>Profissionais que trabalham em conjunto.</h2><p class="lead">Conheça quem faz parte da equipe e as áreas de atendimento.</p><div class="hero-actions"><a class="btn btn-primary" href="medicos.html">Ver profissionais ' + UI.icon('arrow') + '</a><a class="btn btn-secondary" href="' + roleTarget + '">' + roleLabel + ' ' + UI.icon('user') + '</a></div></div></div><button class="doctor-carousel__arrow doctor-carousel__arrow--prev" type="button" data-carousel-prev aria-label="Destaque anterior">' + UI.icon('arrow') + '</button><button class="doctor-carousel__arrow doctor-carousel__arrow--next" type="button" data-carousel-next aria-label="Próximo destaque">' + UI.icon('arrow') + '</button><div class="doctor-carousel__controls" role="group" aria-label="Escolher destaque"><button type="button" data-carousel-dot="0" class="is-active" aria-label="Mostrar destaque 1" aria-current="true"></button><button type="button" data-carousel-dot="1" aria-label="Mostrar destaque 2" aria-current="false"></button><button type="button" data-carousel-dot="2" aria-label="Mostrar destaque 3" aria-current="false"></button></div></div>' + metricsMarkup(doctors, metricsUser) + '</div></section><section class="section"><div class="container"><div class="section-head"><div><p class="eyebrow">' + (admin ? 'Módulos de trabalho' : 'Acesso ao sistema') + '</p><h2>' + (admin ? 'As tarefas principais da clínica.' : 'Organização da rotina clínica.') + '</h2></div><p>' + (admin ? 'Atalhos rápidos para as tarefas administrativas.' : 'Agenda, equipe médica e acesso à sua área pessoal.') + '</p></div><div class="card-grid clinic-module-cards">' + moduleCards + '</div></div></section><section class="section"><div class="container split-layout"><div><p class="eyebrow">Agenda e profissionais</p><h2>Consulte as agendas da equipe.</h2><p class="lead">Conheça a equipe e consulte a disponibilidade de horários.</p><div class="stack-inline" style="margin-top:24px"><a class="btn btn-secondary" href="agendamento.html">Novo agendamento ' + UI.icon('arrow') + '</a></div></div><div class="editorial-number" aria-hidden="true">01<br><span style="color:var(--ink);font-size:.48em">agenda</span></div></div><div class="container" style="margin-top:34px" data-doctor-preview>' + doctorCards(doctors) + '</div></section><section class="section"><div class="container"><div class="notice">' + UI.icon('shield') + '<div><strong>Privacidade e segurança.</strong><br><span>Evite compartilhar informações clínicas ou identificáveis por este site.</span></div></div></div></section>';
    bindDoctorCarousel(target.querySelector('[data-doctor-carousel]'));
  }
  function updateHomeCounts() {
    if (page() !== 'home') return;
    var c = core();
    var currentUser = c && typeof c.user === 'function' ? c.user() : null;
    if (!currentUser || currentUser.role !== 'admin') return;
    var target = document.querySelector('.clinic-home-metrics');
    if (!target) return;
    var doctors = doctorList().filter(function (doctor) { return doctor.active; }).length;
    var appointments = safeRead('appointments');
    var patients = safeRead('users').filter(function (user) { return user && user.role === 'paciente'; }).length;
    var today = c && c.today ? c.today() : '';
    var count = appointments.filter(function (item) { return item.date === today && item.status === 'confirmed'; }).length;
    var values = target.querySelectorAll('.metric strong');
    if (values[0]) values[0].textContent = String(doctors);
    if (values[1]) values[1].textContent = String(count);
    if (values[2]) values[2].textContent = String(patients);
  }

  function renderAbout() {
    var target = app(); if (!target) return;
    target.innerHTML = '<section class="page-heading"><div class="container"><p class="eyebrow">Sobre a Haname</p><h1>Saúde com organização e atenção.</h1><p class="lead">A Haname reúne informações sobre equipe médica, agenda, pacientes e atendimento em um só lugar.</p></div></section><section class="section"><div class="container split-layout"><div class="prose"><h2>Missão</h2><p>Facilitar a busca por profissionais, agendas e informações de atendimento.</p><p>Informações claras ajudam cada pessoa a encontrar o próximo passo e escolher com tranquilidade.</p><h2>Na Haname</h2><ul><li>Catálogo médico, especialidades e horários.</li><li>Controle de agendas e disponibilidade dos profissionais.</li><li>Gestão de agenda, cadastros e equipe.</li><li>Agendamento e organização da rotina de atendimento.</li></ul></div><aside class="stack"><div class="card"><p class="eyebrow">Princípio 01</p><h3>Clareza antes da pressa.</h3><p class="muted">Cada ação deve ter um destino, um estado ou uma confirmação compreensível.</p></div><div class="card"><p class="eyebrow">Princípio 02</p><h3>O limite também informa.</h3><p class="muted">Informações sobre atendimento, valores e convênios são apresentadas com clareza.</p></div></aside></div></section><section class="section"><div class="container"><div class="callout-grid"><article class="card"><h3>Equipe médica</h3><p>Consulte especialidades, profissionais e horários disponíveis em um só lugar.</p></article><article class="card"><h3>Privacidade</h3><p>Confirme disponibilidade e informações antes de comparecer. Não informe dados pessoais ou de saúde pela página.</p></article></div></div></section>';
  }

  function renderPlans() {
    var target = app(); if (!target) return;
    target.innerHTML = '<section class="page-heading"><div class="container"><p class="eyebrow">Planos e convênios</p><h1>Planos e convênios</h1><p class="lead">Consulte diretamente sua operadora para confirmar cobertura, valores e profissionais credenciados.</p></div></section><section class="section"><div class="container"><div class="card-grid"><article class="card plan-card"><div class="plan-mark">' + UI.icon('search') + '</div><h3>Consulte sua operadora</h3><p>Confira diretamente com a operadora quais serviços e profissionais estão disponíveis para você. A Haname não valida cobertura.</p></article><article class="card plan-card"><div class="plan-mark">' + UI.icon('shield') + '</div><h3>Leve perguntas</h3><p>Organize carência, autorização, coparticipação e documentos antes de falar com o serviço de saúde.</p></article><article class="card plan-card"><div class="plan-mark">' + UI.icon('mail') + '</div><h3>Solicite informação</h3><p>Prepare uma solicitação e envie-a pelo formulário de contato.</p><a class="btn btn-primary btn-small" href="contato.html?assunto=Informação%20sobre%20planos">Solicitar informação ' + UI.icon('arrow') + '</a></article></div></div></section><section class="section"><div class="container container-narrow"><div class="notice">' + UI.icon('info') + '<div><strong>Importante.</strong><br><span>Não existem valores, adesão, autorização, faturamento, reembolso ou convênio disponível por meio desta interface.</span></div></div></div></section>';
  }

  function renderFaq() {
    var target = app(); if (!target) return;
    var items = [
      ['Como confirmo um atendimento?', 'Confirme a disponibilidade de profissionais, horários e demais informações diretamente com a equipe responsável.'],
      ['Meus dados são enviados para algum servidor?', 'As informações ficam associadas a esta instalação e não são compartilhadas entre dispositivos. Ao consultar um CEP, somente o número informado é enviado ao ViaCEP.'],
      ['Uma consulta marcada aqui está confirmada?', 'Não. O registro não reserva horário nem confirma atendimento. Confirme diretamente com a equipe responsável.'],
      ['A Haname oferece preços ou convênios?', 'Confirme as condições de cobertura diretamente com sua operadora e com a equipe Haname.'],
      ['Posso usar os conteúdos de saúde para me diagnosticar?', 'Não. Este portal não substitui avaliação profissional nem oferece diagnóstico. Em caso de urgência, procure um serviço de saúde.'],
      ['Onde ficam os registros?', 'Os registros ficam armazenados no computador onde a clínica opera e não ficam disponíveis em outros dispositivos.']
    ];
    target.innerHTML = '<section class="page-heading"><div class="container"><p class="eyebrow">Perguntas frequentes</p><h1>Informações sobre consultas e atendimento.</h1><p class="lead">Para confirmar um atendimento ou cobertura, fale diretamente com a equipe responsável e sua operadora.</p></div></section><section class="section"><div class="container container-narrow"><div class="faq-list">' + items.map(function (item) { return '<details class="faq-item"><summary>' + UI.esc(item[0]) + '</summary><div class="faq-answer"><p>' + UI.esc(item[1]) + '</p></div></details>'; }).join('') + '</div></div></section>';
  }

  function querySubject() {
    try { return new URLSearchParams(window.location.search).get('assunto') || ''; } catch (e) { return ''; }
  }
  function contactMailto(name, email, subject, message) {
    return 'mailto:gabriel.donizetti@estudante.iftm.edu.br?subject=' + encodeURIComponent(subject || 'Contato Haname') + '&body=' + encodeURIComponent('Nome: ' + (name || '') + '\nE-mail: ' + (email || '') + '\n\n' + (message || ''));
  }
  function renderContact() {
    var target = app(); if (!target) return;
    target.innerHTML = '<section class="page-heading"><div class="container"><p class="eyebrow">Contato</p><h1>Fale com a equipe Haname.</h1><p class="lead">Preencha os campos e abra seu aplicativo de e-mail para enviar a mensagem.</p></div></section><section class="section"><div class="container contact-grid"><aside class="contact-details"><div class="contact-detail"><div class="icon-wrap">' + UI.icon('phone') + '</div><div><strong>Telefone para contato</strong><a href="tel:+5534997402521">(34) 99740-2521</a></div></div><div class="contact-detail"><div class="icon-wrap">' + UI.icon('mail') + '</div><div><strong>E-mail para contato</strong><a href="mailto:gabriel.donizetti@estudante.iftm.edu.br">gabriel.donizetti@estudante.iftm.edu.br</a></div></div><div class="contact-detail"><div class="icon-wrap">' + UI.icon('clock') + '</div><div><strong>Solicitações</strong><span>Para enviar uma mensagem, utilize o botão “Abrir e-mail”.</span></div></div><div class="notice"><strong>Endereço:</strong> não disponível. Confirme por telefone antes de se deslocar.</div></aside><div class="panel"><form id="contactForm" novalidate><div class="form-grid"><div class="field"><label for="contactName">Nome</label><input id="contactName" name="name" autocomplete="name" required></div><div class="field"><label for="contactEmail">E-mail</label><input id="contactEmail" name="email" type="email" autocomplete="email" required></div><div class="field full"><label for="contactSubject">Assunto</label><input id="contactSubject" name="subject" required></div><div class="field full"><label for="contactMessage">Mensagem</label><textarea id="contactMessage" name="message" required></textarea><p class="helper">Após preencher, clique em “Abrir e-mail” para enviar a mensagem.</p></div></div><div class="form-actions"><button class="btn btn-primary" type="submit" data-submit="true">Registrar solicitação ' + UI.icon('check') + '</button><a class="btn btn-secondary" data-email-cta href="mailto:gabriel.donizetti@estudante.iftm.edu.br">Abrir e-mail ' + UI.icon('mail') + '</a></div><p class="helper" style="margin-top:14px" data-contact-status role="status"></p></form></div></div></section>';
    var subject = querySubject();
    var subjectInput = document.getElementById('contactSubject'); if (subjectInput && subject) subjectInput.value = subject;
    bindContact();
  }
  function bindContact() {
    var form = document.getElementById('contactForm'); if (!form) return;
    var status = form.querySelector('[data-contact-status]');
    var emailCta = form.querySelector('[data-email-cta]');
    var subject = querySubject();
    function fields() { return { name: form.elements.name.value.trim(), email: form.elements.email.value.trim(), subject: form.elements.subject.value.trim(), message: form.elements.message.value.trim() }; }
    function updateMailto() { var values = fields(); emailCta.href = contactMailto(values.name, values.email, values.subject, values.message); }
    form.addEventListener('input', updateMailto); updateMailto();
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var values = fields();
      if (!values.name || !values.email || !values.subject || !values.message || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(values.email)) {
        status.textContent = 'Preencha nome, e-mail, assunto e uma mensagem válida.'; status.className = 'field-error'; UI.toast('Revise os campos do contato.', 'error'); return;
      }
      var button = form.querySelector('button[type="submit"]'); UI.setBusy(button, true, 'Salvando...');
      var record = { id: 'message-' + Date.now(), name: values.name, email: values.email, subject: values.subject, message: values.message, createdAt: new Date().toISOString(), data: { localOnly: true, source: 'contato' } };
      var c = core();
      var operation;
      try {
        if (!c || typeof c.write !== 'function' || typeof c.read !== 'function') throw new Error('Core indisponível');
        var messages = c.read('messages');
        if (!Array.isArray(messages)) messages = [];
        messages.push(record);
        operation = c.write('messages', messages);
      } catch (error) { operation = Promise.reject(error); }
      Promise.resolve(operation).then(function () {
        status.className = 'helper'; status.textContent = 'Solicitação registrada nesta instalação. Use o e-mail para enviá-la.';
        UI.toast('Solicitação registrada.'); form.reset(); if (subject) form.elements.subject.value = subject; updateMailto();
      }).catch(function () { status.className = 'field-error'; status.textContent = 'Não foi possível salvar localmente. Tente novamente.'; UI.toast('Falha ao registrar a solicitação.', 'error'); }).finally(function () { UI.setBusy(button, false); });
    });
  }

  function render() {
    var p = page(); if (!OWN[p]) return;
    if (p === 'home') { renderHome(); updateHomeCounts(); }
    if (p === 'sobre') renderAbout();
    if (p === 'planos') renderPlans();
    if (p === 'faq') renderFaq();
    if (p === 'contato') renderContact();
  }
  function start() {
    if (!OWN[page()]) return;
    var uiReady = UI && typeof UI.init === 'function' ? UI.init() : Promise.resolve();
    Promise.all([uiReady, coreReady()]).then(render).catch(render);
  }
  window.addEventListener('haname:db', updateHomeCounts);
  window.addEventListener('haname:session', updateHomeCounts);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})(window, document);
