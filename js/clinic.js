/* Módulos administrativos da clínica. */
(function (window, document) {
  'use strict';
  var page = document.body.getAttribute('data-page') || '';
  var Core = window.Core;
  var UI = window.UI;
  var esc = UI.esc;
  var app = document.getElementById('app');
  var states = {
    scheduled: {label:'Agendado', next:'arrived', action:'Registrar chegada'},
    arrived: {label:'Chegada registrada', next:'in_service', action:'Iniciar atendimento'},
    in_service: {label:'Em atendimento', next:'finished', action:'Encerrar fluxo'},
    finished: {label:'Fluxo encerrado', next:null, action:''}
  };

  function empty(title, text) { return UI.empty(title, text); }
  function heading(title, description) {
    return '<section class="page-heading"><p class="eyebrow">Gestão da clínica</p><h1>' + esc(title) + '</h1><p class="lead">' + esc(description) + '</p></section>';
  }
  function notice() {
    return '<div class="notice warning clinic-privacy"><span><strong>Privacidade dos dados.</strong> Não cadastre informações clínicas ou identificáveis nesta instalação.</span></div>';
  }
  function nav() {
    return '<nav class="clinic-module-nav" aria-label="Módulos da clínica"><a href="intranet.html">Painel</a><a href="pacientes.html">Pacientes</a><a href="equipe.html">Equipe</a><a href="atendimento.html">Atendimento</a></nav>';
  }
  function requireAdmin() {
    var user = Core.user();
    if (user && user.role === 'admin') return true;
    var destination = user ? Core.roleUrl(user.role) : 'login.html';
    app.innerHTML = '<div class="container page-module">' + heading('Acesso da equipe', 'Entre com sua conta de administrador para abrir este módulo.') + '<div class="panel"><p class="muted">Esta área é reservada à administração da clínica.</p><a class="btn btn-primary" href="' + esc(destination) + '">' + (user ? 'Voltar à minha área' : 'Entrar no sistema') + '</a></div></div>';
    return false;
  }
  function safeDate(iso) { return Core.dateLabel(iso || '') || 'Data não informada'; }
  function patientRows() {
    var users = Core.read('users').filter(function (user) { return user && user.role === 'paciente'; });
    var appointments = Core.appointments();
    return users.map(function (user) {
      var records = appointments.filter(function (item) { return item.userId === user.id || (item.patientEmail && item.patientEmail === user.email); });
      records.sort(function (a, b) { return String(b.date + b.time).localeCompare(String(a.date + a.time)); });
      var today = Core.today();
      var now = new Date();
      var nowMinutes = now.getHours() * 60 + now.getMinutes();
      var next = records.filter(function (item) {
        if (item.status !== 'confirmed' || item.date < today) return false;
        if (item.date > today) return true;
        var parts = String(item.time || '').split(':').map(Number);
        return parts.length === 2 && parts[0] * 60 + parts[1] > nowMinutes;
      }).sort(function (a,b) { return String(a.date+a.time).localeCompare(String(b.date+b.time)); })[0] || null;
      return {id:user.id, name:user.name || 'Paciente', email:user.email || '', phone:user.phone || '', total:records.length, next:next, last:records[0] || null};
    }).sort(function (a, b) { return a.name.localeCompare(b.name, 'pt-BR'); });
  }
  function renderPatients() {
    if (!requireAdmin()) return;
    var patients = patientRows();
    app.innerHTML = '<div class="container page-module clinic-module">' + nav() + heading('Pacientes', 'Consulte o diretório e localize a agenda associada a cada cadastro.') + notice() +
      '<div class="clinic-metrics"><article class="clinic-metric"><span>Pacientes cadastrados</span><strong>' + patients.length + '</strong></article><article class="clinic-metric"><span>Com consultas registradas</span><strong>' + patients.filter(function (item) { return item.total > 0; }).length + '</strong></article><article class="clinic-metric"><span>Consultas futuras confirmadas</span><strong>' + patients.filter(function (item) { return !!item.next; }).length + '</strong></article></div>' +
      '<section class="panel"><div class="clinic-toolbar"><div><h2>Diretório de pacientes</h2><p class="muted">Busca por nome ou e-mail; não mostra senha, código de recuperação nem hash.</p></div><label class="field clinic-search">Buscar paciente<input id="patientFilter" type="search" placeholder="Nome ou e-mail" autocomplete="off"></label></div>' +
      (patients.length ? '<div class="clinic-table-wrap"><table class="clinic-table"><thead><tr><th>Paciente</th><th>Contato</th><th>Consultas</th><th>Próxima</th><th>Ação</th></tr></thead><tbody>' + patients.map(function (item) { return '<tr data-patient-row data-search="' + esc((item.name + ' ' + item.email).toLowerCase()) + '"><td><strong>' + esc(item.name) + '</strong><span class="clinic-subline">' + esc(item.email) + '</span></td><td>' + (item.phone ? '<a href="tel:' + esc(item.phone.replace(/[^+\d]/g, '')) + '">' + esc(item.phone) + '</a>' : '<span class="muted">—</span>') + '</td><td>' + item.total + '</td><td>' + (item.next ? esc(safeDate(item.next.date) + ' · ' + item.next.time) : '<span class="muted">Sem consulta futura</span>') + '</td><td><a class="btn btn-secondary btn-small" href="atendimento.html?patient=' + encodeURIComponent(item.id) + '">Ver agenda</a></td></tr>'; }).join('') + '</tbody></table></div>' : empty('Nenhum paciente cadastrado', 'Os pacientes aparecerão aqui após o cadastro.')) +
      '<p class="helper"><a href="cadastro.html">Cadastrar paciente</a>.</p></section></div>';
    var filter = document.getElementById('patientFilter');
    filter.addEventListener('input', function () { var query = filter.value.trim().toLowerCase(); document.querySelectorAll('[data-patient-row]').forEach(function (row) { row.hidden = query && row.getAttribute('data-search').indexOf(query) < 0; }); });
  }
  function renderTeam() {
    if (!requireAdmin()) return;
    var doctors = Core.doctors().slice().sort(function (a,b) { return a.name.localeCompare(b.name, 'pt-BR'); });
    app.innerHTML = '<div class="container page-module clinic-module">' + nav() + heading('Equipe médica', 'Consulte especialidades e controle a disponibilidade das agendas.') + notice() +
      '<div class="clinic-toolbar"><h2>Profissionais cadastrados</h2><label class="field clinic-search">Filtrar equipe<input id="teamFilter" type="search" placeholder="Nome ou especialidade" autocomplete="off"></label></div>' +
      (doctors.length ? '<div class="clinic-staff-grid">' + doctors.map(function (doctor) { return '<article class="card clinic-staff-card" data-staff-card data-search="' + esc((doctor.name + ' ' + doctor.specialty).toLowerCase()) + '"><div class="clinic-staff-top"><div class="doctor-avatar" aria-hidden="true">' + esc(String(doctor.name || 'H').split(/\s+/).slice(0,2).map(function (word) { return word.charAt(0); }).join('').toUpperCase()) + '</div><span class="badge ' + (doctor.active ? 'badge-accent' : '') + '">' + (doctor.active ? 'Agenda aberta' : 'Agenda suspensa') + '</span></div><p class="eyebrow">' + esc(doctor.specialty) + '</p><h3>' + esc(doctor.name) + '</h3><p class="muted">' + esc(doctor.crm || 'CRM não informado') + ' · ' + esc(doctor.mode || 'Presencial') + '</p><p>' + esc(doctor.description || 'Profissional da equipe médica.') + '</p><button type="button" class="btn ' + (doctor.active ? 'btn-danger' : 'btn-primary') + ' btn-small" data-toggle-doctor="' + esc(doctor.id) + '" data-next-active="' + (!doctor.active) + '">' + (doctor.active ? 'Suspender agenda' : 'Reabrir agenda') + '</button></article>'; }).join('') + '</div>' : empty('Equipe não cadastrada', 'Inclua os profissionais da equipe.')) + '</div>';
    document.getElementById('teamFilter').addEventListener('input', function (event) { var query = event.target.value.trim().toLowerCase(); document.querySelectorAll('[data-staff-card]').forEach(function (card) { card.hidden = query && card.getAttribute('data-search').indexOf(query) < 0; }); });
    app.querySelectorAll('[data-toggle-doctor]').forEach(function (button) { button.addEventListener('click', function () { var active = button.getAttribute('data-next-active') === 'true'; UI.confirm({title:active ? 'Reabrir agenda?' : 'Suspender agenda?',message:'A alteração atualizará os horários futuros deste profissional.',confirmText:active ? 'Reabrir agenda' : 'Suspender',onConfirm:function () { return Core.setDoctorActive(button.getAttribute('data-toggle-doctor'), active).then(function () { UI.toast(active ? 'Agenda reaberta.' : 'Agenda suspensa.'); renderTeam(); }); }}); }); });
  }
  function queue() { var value = Core.get('clinicQueue', {}); return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; }
  function appointmentState(appointment, records) {
    if (appointment.status === 'cancelled') return 'cancelled';
    if (appointment.status === 'completed') return 'finished';
    var value = records[appointment.id];
    return states[value] ? value : 'scheduled';
  }
  function stateLabel(appointment, state) {
    if (appointment.status === 'cancelled') return 'Consulta cancelada';
    if (appointment.status === 'completed') return 'Consulta concluída';
    return (states[state] || states.scheduled).label;
  }
  function renderAttendance() {
    if (!requireAdmin()) return;
    var params = new URLSearchParams(window.location.search);
    var patientId = params.get('patient') || '';
    var users = Core.read('users');
    var patient = users.find(function (user) { return user.id === patientId && user.role === 'paciente'; });
    var selectValue = document.getElementById('attendanceDateFilter') ? document.getElementById('attendanceDateFilter').value : 'today';
    var records = queue();
    var appointments = Core.appointments().slice().sort(function (a,b) { return String(a.date+a.time).localeCompare(String(b.date+b.time)); }).filter(function (item) {
      if (patient && item.userId !== patient.id && item.patientEmail !== patient.email) return false;
      if (selectValue === 'today') return item.date === Core.today();
      if (selectValue === 'upcoming') return item.date >= Core.today() && item.status === 'confirmed';
      return true;
    });
    app.innerHTML = '<div class="container page-module clinic-module">' + nav() + heading('Atendimento', patient ? 'Agenda de ' + patient.name : 'Fila operacional e situação das consultas agendadas.') + notice() +
      '<section class="panel"><div class="clinic-toolbar"><div><h2>Fila de atendimento</h2><p class="muted">O fluxo da recepção fica separado do estado de confirmação da consulta.</p></div><label class="field clinic-search">Período<select id="attendanceDateFilter"><option value="today"' + (selectValue === 'today' ? ' selected' : '') + '>Hoje</option><option value="upcoming"' + (selectValue === 'upcoming' ? ' selected' : '') + '>Próximas confirmadas</option><option value="all"' + (selectValue === 'all' ? ' selected' : '') + '>Todas</option></select></label></div>' +
      (appointments.length ? '<div class="clinic-queue">' + appointments.map(function (item) { var state = appointmentState(item, records); var canCheckIn = item.date === Core.today(); var nextState = states[state] && states[state].next; var button = item.status === 'confirmed' && nextState ? '<button type="button" class="btn btn-primary btn-small" data-queue-next="' + esc(item.id) + '" data-next-state="' + esc(nextState) + '"' + (!canCheckIn ? ' disabled title="O fluxo de chegada está disponível na data da consulta."' : '') + '>' + esc(states[state].action) + '</button>' : ''; return '<article class="clinic-queue-card"><div class="clinic-queue-time"><strong>' + esc(item.time) + '</strong><span>' + esc(safeDate(item.date)) + '</span></div><div class="clinic-queue-main"><h3>' + esc(item.patientName || 'Paciente') + '</h3><p>' + esc(item.doctorName || 'Profissional') + ' · ' + esc(item.specialty || 'Consulta') + '</p><span class="badge ' + (item.status === 'cancelled' ? '' : 'badge-accent') + '">' + esc(stateLabel(item, state)) + '</span></div><div class="clinic-queue-action">' + button + '</div></article>'; }).join('') + '</div>' : empty('Nenhuma consulta neste período', 'As consultas confirmadas no agendamento aparecerão aqui para controle operacional.')) + '</section></div>';
    document.getElementById('attendanceDateFilter').addEventListener('change', renderAttendance);
    app.querySelectorAll('[data-queue-next]').forEach(function (button) { button.addEventListener('click', function () { var map = queue(); map[button.getAttribute('data-queue-next')] = button.getAttribute('data-next-state'); try { Core.set('clinicQueue', map); UI.toast('Atendimento atualizado.'); renderAttendance(); } catch (error) { UI.toast(error.message || 'Não foi possível atualizar a fila.', 'error'); } }); });
  }
  function init() {
    if (!Core || !app || ['patients','team','attendance'].indexOf(page) < 0) return;
    Promise.resolve(Core.ready).then(function () {
      if (page === 'patients') renderPatients();
      if (page === 'team') renderTeam();
      if (page === 'attendance') renderAttendance();
    }).catch(function () { app.innerHTML = '<div class="container page-module">' + heading('Dados indisponíveis', 'Recarregue a página e tente novamente.') + '</div>'; });
    window.addEventListener('haname:db', function () { if (page === 'patients') renderPatients(); if (page === 'team') renderTeam(); if (page === 'attendance') renderAttendance(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
}(window, document));
