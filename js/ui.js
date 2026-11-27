(function (window, document) {
  'use strict';

  var ICON_PATHS = {
    heart: '<path d="M20.8 8.7c0 5.1-8.8 10.1-8.8 10.1S3.2 13.8 3.2 8.7A4.6 4.6 0 0 1 12 6.2a4.6 4.6 0 0 1 8.8 2.5Z"/>',
    calendar: '<rect x="3" y="4.5" width="18" height="16" rx="2"/><path d="M7 2.8v3.4M17 2.8v3.4M3 9h18M7 13h3M14 13h3M7 17h3"/>',
    arrow: '<path d="M4 12h15M13 6l6 6-6 6"/>',
    search: '<circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/>',
    user: '<circle cx="12" cy="8" r="3.4"/><path d="M5 21a7 7 0 0 1 14 0"/>',
    leaf: '<path d="M20.8 3.2C12.5 3.2 6 6.2 6 12.2c0 3.2 2.5 5.5 5.7 5.5 5.8 0 8.1-5.8 9.1-14.5Z"/><path d="M3.5 21c2.6-6.5 7.2-9.5 14.2-12"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.3 2.5 3.4 5.5 3.4 9S14.3 18.5 12 21M12 3C9.7 5.5 8.6 8.5 8.6 12s1.1 6.5 3.4 9"/>',
    check: '<path d="m5 12 4.2 4.2L19 6.5"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="2.8"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/>',
    phone: '<path d="M7.5 3.5 5 5c-.8.5-1 1.5-.7 2.4 1.8 5.4 6.4 10 11.8 11.8.9.3 1.9 0 2.4-.7l1.5-2.5-4.1-2.2-1.5 1.7a13.6 13.6 0 0 1-6.6-6.6l1.7-1.5-2-3.9Z"/>',
    pin: '<path d="M19 10.2c0 5.1-7 10.3-7 10.3s-7-5.2-7-10.3a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2.3"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
    shield: '<path d="M12 21s7-3.4 7-9.1V5.5L12 3 5 5.5v6.4C5 17.6 12 21 12 21Z"/><path d="m9 12 2 2 4-4"/>',
    download: '<path d="M12 3v11M7.5 10.5 12 15l4.5-4.5M4 20h16"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.9 1.9-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V20h-2.8v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1-1.9-1.9.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H6v-2.8h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1 1.9-1.9.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6V4H15v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1 1.9 1.9-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.1V13h-.1a1.7 1.7 0 0 0-1.7 2Z"/>',
    stethoscope: '<path d="M6 3v5a4 4 0 0 0 8 0V3M4 3h4M12 3h4M10 16a5 5 0 0 0 10 0v-1.5M19 12.5a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    logout: '<path d="M10 5H5v14h5M14 8l4 4-4 4M10 12h8"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 10v6M12 7h.01"/>',
    external: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5"/>'
  };

  var dialogState = null;
  var shellReady = false;

  function safeCore() { return window.Core || null; }
  function coreReady() {
    var core = safeCore();
    return core && core.ready && typeof core.ready.then === 'function' ? core.ready : Promise.resolve();
  }
  function currentPage() {
    var body = document.body;
    return body && body.getAttribute('data-page') ? body.getAttribute('data-page') : 'home';
  }
  function hrefFor(page) {
    var map = { home: 'index.html', admin: 'intranet.html', paciente: 'intranetp.html', medico: 'intranetm.html', medicos: 'medicos.html', agendamento: 'agendamento.html', patients: 'pacientes.html', team: 'equipe.html', attendance: 'atendimento.html', pagamentos: 'pagamentos.html', sobre: 'sobre.html', contato: 'contato.html', planos: 'planos.html', faq: 'faq.html' };
    return map[page] || (page.indexOf('.html') > -1 ? page : page + '.html');
  }
  function pageIs(page) {
    return currentPage() === page || (page === 'paciente' && currentPage() === 'intranetp') || (page === 'medico' && currentPage() === 'intranetm') || (page === 'admin' && currentPage() === 'intranet');
  }
  function publicUser() {
    var core = safeCore();
    if (!core || typeof core.user !== 'function') return null;
    try { return core.user(); } catch (e) { return null; }
  }
  function roleUrl(role) {
    var core = safeCore();
    if (core && typeof core.roleUrl === 'function') {
      try { return core.roleUrl(role); } catch (e) { /* use local fallback */ }
    }
    return role === 'medico' ? 'intranetm.html' : role === 'admin' ? 'intranet.html' : 'intranetp.html';
  }

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function icon(name, label) {
    var path = ICON_PATHS[name] || ICON_PATHS.info;
    var title = label ? '<title>' + esc(label) + '</title>' : '';
    return '<svg class="icon icon-' + esc(name) + '" viewBox="0 0 24 24" fill="none" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="' + (label ? 'false' : 'true') + '" focusable="false">' + title + path + '</svg>';
  }

  function toast(message, type) {
    type = type || 'success';
    var region = document.getElementById('toastRegion');
    if (!region) {
      region = document.createElement('div');
      region.id = 'toastRegion';
      document.body.appendChild(region);
    }
    var item = document.createElement('div');
    item.className = 'toast' + (type === 'error' ? ' is-error' : type === 'info' ? ' is-info' : '');
    item.setAttribute('role', type === 'error' ? 'alert' : 'status');
    item.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');
    var text = document.createElement('span');
    text.textContent = String(message == null ? '' : message);
    var close = document.createElement('button');
    close.type = 'button'; close.className = 'toast-close'; close.setAttribute('aria-label', 'Fechar aviso');
    close.innerHTML = icon('close');
    close.addEventListener('click', function () { item.remove(); });
    item.appendChild(text); item.appendChild(close); region.appendChild(item);
    window.setTimeout(function () { if (item.isConnected) item.remove(); }, type === 'error' ? 7000 : 4800);
    return item;
  }

  function loading(label) {
    var text = label || 'Buscando...';
    return '<div class="app-loading" role="status" aria-live="polite"><span class="sr-only">' + esc(text) + '</span><span class="skeleton skeleton-title"></span><span class="skeleton skeleton-copy"></span><span class="skeleton skeleton-copy short"></span></div>';
  }
  function empty(title, description) {
    return '<div class="empty-state" role="status">' + icon('search') + '<h3>' + esc(title || 'Nada por aqui ainda') + '</h3>' + (description ? '<p>' + esc(description) + '</p>' : '') + '</div>';
  }

  function closeModal() {
    if (!dialogState) return;
    var state = dialogState;
    dialogState = null;
    if (state.keyHandler) document.removeEventListener('keydown', state.keyHandler);
    if (state.node && state.node.isConnected) state.node.remove();
    if (document.body) document.body.classList.remove('has-open-dialog');
    if (state.returnFocus && typeof state.returnFocus.focus === 'function') {
      window.setTimeout(function () { try { state.returnFocus.focus(); } catch (e) {} }, 0);
    }
  }

  function modal(options) {
    options = options || {};
    closeModal();
    var backdrop = document.createElement('div');
    backdrop.className = 'dialog-backdrop';
    backdrop.setAttribute('role', 'presentation');
    var panel = document.createElement('section');
    panel.className = 'dialog-panel'; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true');
    var headingId = 'dialog-title-' + Date.now();
    var header = document.createElement('div'); header.className = 'dialog-header';
    var heading = document.createElement('h2'); heading.id = headingId; heading.textContent = String(options.title || 'Haname'); panel.setAttribute('aria-labelledby', headingId);
    var close = document.createElement('button'); close.type = 'button'; close.className = 'dialog-close'; close.setAttribute('aria-label', 'Fechar janela'); close.innerHTML = icon('close');
    close.addEventListener('click', closeModal);
    header.appendChild(heading); header.appendChild(close);
    var body = document.createElement('div'); body.className = 'dialog-body';
    if (options.body instanceof Node) body.appendChild(options.body); else body.innerHTML = String(options.body || '');
    panel.appendChild(header); panel.appendChild(body);
    if (options.footer) {
      var footer = document.createElement('div'); footer.className = 'dialog-footer';
      if (options.footer instanceof Node) footer.appendChild(options.footer); else footer.innerHTML = String(options.footer);
      panel.appendChild(footer);
    }
    backdrop.appendChild(panel); document.body.appendChild(backdrop);
    if (document.body) document.body.classList.add('has-open-dialog');
    var returnFocus = document.activeElement;
    var keyHandler = function (event) {
      if (!dialogState) return;
      if (event.key === 'Escape') { event.preventDefault(); closeModal(); return; }
      if (event.key !== 'Tab') return;
      var focusables = panel.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])');
      if (!focusables.length) { event.preventDefault(); close.focus(); return; }
      var first = focusables[0], last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    dialogState = { node: backdrop, returnFocus: returnFocus, keyHandler: keyHandler };
    backdrop.addEventListener('mousedown', function (event) { if (event.target === backdrop) closeModal(); });
    document.addEventListener('keydown', keyHandler);
    window.setTimeout(function () { close.focus(); }, 0);
    return backdrop;
  }

  function confirm(options) {
    options = options || {};
    var footer = document.createElement('div'); footer.className = 'stack-inline';
    var cancel = document.createElement('button'); cancel.type = 'button'; cancel.className = 'btn btn-secondary'; cancel.textContent = 'Cancelar';
    var accept = document.createElement('button'); accept.type = 'button'; accept.className = 'btn btn-primary'; accept.textContent = options.confirmText || 'Confirmar';
    cancel.addEventListener('click', closeModal);
    accept.addEventListener('click', function () {
      accept.disabled = true; accept.classList.add('is-busy'); accept.textContent = 'Aguarde...';
      var result;
      try { result = typeof options.onConfirm === 'function' ? options.onConfirm() : null; } catch (error) { toast('Não foi possível concluir a ação.', 'error'); accept.disabled = false; accept.classList.remove('is-busy'); accept.textContent = options.confirmText || 'Confirmar'; return; }
      Promise.resolve(result).then(function () { if (dialogState) closeModal(); }).catch(function (error) { toast(error && error.message ? error.message : 'Não foi possível concluir a ação.', 'error'); accept.disabled = false; accept.classList.remove('is-busy'); accept.textContent = options.confirmText || 'Confirmar'; });
    });
    footer.appendChild(cancel); footer.appendChild(accept);
    return modal({ title: options.title || 'Confirme a ação', body: '<p>' + esc(options.message || 'Deseja continuar?') + '</p>', footer: footer });
  }

  function download(filename, text, mime) {
    var blob = new Blob([String(text == null ? '' : text)], { type: mime || 'application/json;charset=utf-8' });
    var url = URL.createObjectURL(blob); var link = document.createElement('a');
    link.href = url; link.download = filename || 'haname-dados.json'; link.rel = 'noopener';
    document.body.appendChild(link); link.click(); link.remove(); window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function setBusy(button, busy, label) {
    if (!button) return;
    if (busy) {
      if (!button.dataset.busyLabel) button.dataset.busyLabel = button.textContent.trim();
      if (!button.dataset.busyMarkup) button.dataset.busyMarkup = button.innerHTML;
      button.disabled = true; button.classList.add('is-busy'); button.setAttribute('aria-busy', 'true');
      if (label) button.textContent = label;
    } else {
      button.disabled = false; button.classList.remove('is-busy'); button.setAttribute('aria-busy', 'false');
      if (button.dataset.busyMarkup) button.innerHTML = button.dataset.busyMarkup;
      else if (button.dataset.busyLabel) button.textContent = button.dataset.busyLabel;
    }
  }

  function authLink() {
    var user = publicUser();
    return user ? roleUrl(user.role) : 'login.html';
  }

  function link(path, label, extra) {
    var current = currentPage();
    var active = current === path || (path === 'intranetp' && current === 'paciente') || (path === 'intranetm' && current === 'medico') || (path === 'intranet' && current === 'admin');
    return '<a href="' + hrefFor(path) + '"' + (active ? ' aria-current="page"' : '') + (extra || '') + '>' + label + '</a>';
  }

  function headerMarkup() {
    var user = publicUser();
    var displayName = user && user.name ? user.name.split(' ')[0] : '';
    var auth = user
      ? '<a class="account-icon" href="' + esc(authLink()) + '" title="' + esc(displayName ? 'Minha conta: ' + displayName : 'Acessar conta') + '" aria-label="' + esc(displayName ? 'Minha conta: ' + displayName : 'Acessar conta') + '">' + icon('user') + '</a><button type="button" class="btn-logout-header" data-ui-logout aria-label="Sair da conta">' + icon('logout') + '<span>Sair</span></button>'
      : '<a class="account-icon" href="login.html" title="Acessar conta" aria-label="Acessar conta">' + icon('user') + '</a>';
    var publicMore = '<details class="nav-menu nav-dropdown-group"><summary>Informações</summary><div class="nav-dropdown">' + link('sobre', 'Sobre a Haname') + link('planos', 'Planos e convênios') + link('contato', 'Contato') + link('faq', 'Perguntas frequentes') + '</div></details>';
    var links;
    if (user && user.role === 'admin') links = link('admin', 'Painel') + link('patients', 'Pacientes') + link('team', 'Equipe médica') + link('attendance', 'Atendimento') + link('pagamentos', 'Pagamentos');
    else if (user && user.role === 'medico') links = link('medico', 'Minha agenda') + link('medicos', 'Equipe médica') + link('agendamento', 'Agendamentos');
    else if (user) links = link('paciente', 'Minha área') + link('medicos', 'Médicos') + link('pagamentos', 'Pagamentos');
    else links = link('home', 'Início') + link('medicos', 'Guia Médico') + publicMore;
    var primaryHref = user && user.role === 'admin' ? 'atendimento.html' : user && user.role === 'medico' ? 'intranetm.html' : 'agendamento.html';
    var primaryLabel = user && user.role === 'admin' ? 'Abrir atendimento' : user && user.role === 'medico' ? 'Minha agenda' : 'Agendar consulta';
    return '<div class="header-inner"><a class="skip-link" href="#app">Pular para o conteúdo</a><a class="logo-link" href="index.html" aria-label="Haname, início"><img src="assets/logo.png" alt="Haname Clínica Médica" width="450" height="174"></a><button type="button" class="mobile-menu-button" aria-expanded="false" aria-controls="siteNavigation" aria-label="Abrir menu">' + icon('menu') + '</button><nav id="siteNavigation" class="site-nav" aria-label="Navegação principal">' + links +
      '</nav><div class="header-actions"><a class="btn-agendamento-nav" href="' + primaryHref + '">' + primaryLabel + '</a>' + auth + '</div></div>';
  }

  function footerMarkup() {
    var user = publicUser();
    var operational = user && user.role === 'admin'
      ? link('admin', 'Painel clínico') + link('patients', 'Pacientes') + link('team', 'Equipe médica') + link('attendance', 'Atendimento') + link('pagamentos', 'Pagamentos') + link('dados', 'Exportar dados')
      : user && user.role === 'medico'
        ? link('medico', 'Minha agenda') + link('medicos', 'Guia médico') + link('agendamento', 'Agendamentos')
        : user
          ? link('paciente', 'Minha área') + link('medicos', 'Guia médico') + link('pagamentos', 'Pagamentos') + link('agendamento', 'Agendar consulta')
          : link('home', 'Início') + link('medicos', 'Guia médico') + link('agendamento', 'Agendar consulta');
    return '<div class="container footer-inner"><div class="footer-brand"><img src="assets/logo.png" alt="Haname" width="450" height="174"><p>Organização simples da rotina de atendimento, com cada informação em seu lugar.</p></div><div><p class="footer-heading">Minha área</p><div class="footer-links">' + operational + '</div></div><div><p class="footer-heading">Informações</p><div class="footer-links">' + link('sobre', 'Sobre a Haname') + link('contato', 'Contato') + link('faq', 'Perguntas frequentes') + '</div></div></div><div class="container footer-note">Os perfis e horários apresentados são ilustrativos. Não insira informações pessoais ou de saúde reais.</div>';
  }

  function updateHeader() {
    var header = document.getElementById('siteHeader');
    if (!header) return;
    var open = header.querySelector('.site-nav.is-open');
    header.innerHTML = headerMarkup();
    bindHeader();
    if (open) {
      var nav = header.querySelector('.site-nav'); if (nav) nav.classList.add('is-open');
      var menu = header.querySelector('.mobile-menu-button');
      if (menu) { menu.setAttribute('aria-expanded', 'true'); menu.setAttribute('aria-label', 'Fechar menu'); }
    }
  }
  function bindHeader() {
    var header = document.getElementById('siteHeader');
    if (!header) return;
    var menuButton = header.querySelector('.mobile-menu-button');
    var nav = header.querySelector('.site-nav');
    if (menuButton && nav) menuButton.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open'); menuButton.setAttribute('aria-expanded', String(open)); menuButton.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    });
    header.querySelectorAll('[data-ui-logout]').forEach(function (button) {
      button.addEventListener('click', function () {
        var core = safeCore();
        if (core && typeof core.logout === 'function') core.logout();
        toast('Sessão encerrada.', 'success');
        window.setTimeout(function () { window.location.href = 'login.html'; }, 350);
      });
    });
    header.querySelectorAll('.nav-dropdown a').forEach(function (a) { a.addEventListener('click', function () { var details = a.closest('details'); if (details) details.removeAttribute('open'); }); });
  }

  function enforceButtonTypes() {
    document.querySelectorAll('form button:not([type])').forEach(function (button) { button.type = button.dataset.submit === 'true' ? 'submit' : 'button'; });
  }
  function bindGlobalActions() {
    enforceButtonTypes();
    document.addEventListener('click', function (event) {
      var downloadButton = event.target.closest('[data-download-file]');
      if (downloadButton) {
        var core = safeCore();
        if (core && typeof core.downloadBackup === 'function') {
          Promise.resolve(core.downloadBackup()).then(function (text) { download(downloadButton.dataset.downloadFile || 'haname-backup.json', typeof text === 'string' ? text : JSON.stringify(text, null, 2)); toast('Cópia de segurança preparada para download.'); }).catch(function () { toast('Não foi possível preparar o arquivo de segurança.', 'error'); });
        }
      }
    });
  }

  function init() {
    if (shellReady) return coreReady();
    shellReady = true;
    var header = document.getElementById('siteHeader');
    var footer = document.getElementById('siteFooter');
    if (header) { header.innerHTML = headerMarkup(); bindHeader(); }
    if (footer) footer.innerHTML = footerMarkup();
    bindGlobalActions();
    window.addEventListener('haname:session', updateHeader);
    window.addEventListener('haname:db', function () { updateHeader(); window.dispatchEvent(new CustomEvent('haname:ui-refresh')); });
    window.addEventListener('haname:api', updateHeader);
    window.addEventListener('storage', function () { updateHeader(); });
    return coreReady().then(function () { updateHeader(); });
  }

  window.UI = {
    esc: esc, icon: icon, toast: toast, empty: empty, loading: loading, modal: modal, closeModal: closeModal,
    confirm: confirm, download: download, setBusy: setBusy, authLink: authLink, init: init, roleUrl: roleUrl,
    updateHeader: updateHeader
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})(window, document);
