/* Haname page modules owned by the Core agent. UI owns shared chrome and visual primitives. */
(function (root) {
  'use strict';
  var g = root || (typeof globalThis !== 'undefined' ? globalThis : {});
  var PAGE_NAMES = ['login','cadastro','recovery','agendamento','confirmar','paciente','medico','admin','medicos','perfil','dados','pagamentos'];
  var initialized = false;

  function el(selector, parent) { return (parent || document).querySelector(selector); }
  function all(selector, parent) { return Array.prototype.slice.call((parent || document).querySelectorAll(selector)); }
  function esc(value) {
    if (g.UI && typeof g.UI.esc === 'function') return g.UI.esc(value == null ? '' : String(value));
    return String(value == null ? '' : value).replace(/[&<>'"]/g, function (ch) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]; });
  }
  function icon(name) { return g.UI && typeof g.UI.icon === 'function' ? g.UI.icon(name) : ''; }
  function toast(message, type) { if (g.UI && typeof g.UI.toast === 'function') g.UI.toast(message, type || 'success'); else if (g.console) (type === 'error' ? g.console.error : g.console.log)(message); }
  function busy(button, value, label) { if (g.UI && typeof g.UI.setBusy === 'function') g.UI.setBusy(button, value, label || 'Aguarde...'); else { button.disabled = !!value; if (value) button.dataset.oldLabel = button.textContent; button.textContent = value ? (label || 'Aguarde...') : (button.dataset.oldLabel || 'Continuar'); } }
  function uiModal(options) { if (g.UI && typeof g.UI.modal === 'function') return g.UI.modal(options); var body = '<div class="card">' + options.body + '</div>'; var app = el('#app'); app.insertAdjacentHTML('beforeend', '<section class="panel haname-fallback-modal" role="dialog" aria-modal="true"><div class="section-head"><h2>' + esc(options.title) + '</h2><button type="button" class="btn btn-ghost haname-close">Fechar</button></div>' + body + (options.footer || '') + '</section>'); var modal = el('.haname-fallback-modal'); el('.haname-close', modal).addEventListener('click', function () { modal.remove(); }); return modal; }
  function closeModal() { if (g.UI && typeof g.UI.closeModal === 'function') g.UI.closeModal(); all('.haname-fallback-modal').forEach(function (node) { node.remove(); }); }
  function confirmAction(options) {
    if (g.UI && typeof g.UI.confirm === 'function') return g.UI.confirm(options);
    if (typeof g.confirm === 'function' && g.confirm(options.message)) return options.onConfirm();
  }
  function href(path) { return String(path || '').replace(/[^\w./?=&%:#-]/g, ''); }
  function go(path) { if (g.location && typeof g.location.assign === 'function') g.location.assign(href(path)); }
  function app() { return el('#app'); }
  function shell(inner) { return '<div class="container page-module">' + inner + '</div>'; }
  function heading(eyebrow, title, description) { return '<div class="page-heading"><p class="eyebrow">' + esc(eyebrow) + '</p><h1>' + esc(title) + '</h1>' + (description ? '<p class="muted">' + esc(description) + '</p>' : '') + '</div>'; }
  function notice(text, type) { return '<div class="notice ' + (type || '') + '" role="status">' + esc(text) + '</div>'; }
  function errorMessage(error) { return error && error.message ? error.message : 'Não foi possível concluir a operação.'; }
  function render(inner) { var target = app(); if (target) target.innerHTML = inner; }
  function runForm(form, handler) {
    if (!form) return;
    form.addEventListener('submit', function (event) { event.preventDefault(); var button = el('button[type="submit"]', form); busy(button, true); Promise.resolve().then(function () { return handler(new FormData(form)); }).catch(function (error) { toast(errorMessage(error), 'error'); }).finally(function () { busy(button, false); }); });
  }
  function formValue(data, key) { return data.get(key) == null ? '' : String(data.get(key)); }
  function onlyPhoneDigits(value) { return String(value || '').replace(/\D/g, ''); }
  function splitPhoneField(value, dddFallback) {
    var raw = String(value || '').trim().replace(/^\+55\s*/, '');
    var explicit = raw.match(/^\((\d{2})\)\s*(.*)$/) || raw.match(/^(\d{2})[\s-]+(.+)$/);
    var fallback = onlyPhoneDigits(dddFallback).slice(0, 2), ddd = fallback, phone = '';
    if (explicit) { ddd = explicit[1]; phone = onlyPhoneDigits(explicit[2]); }
    else {
      var digits = onlyPhoneDigits(raw);
      if (digits.length >= 10) { ddd = digits.slice(0, 2); phone = digits.slice(2); }
      else phone = digits;
    }
    return {ddd: ddd, phone: phone};
  }
  function formatPhoneDisplay(ddd, phone) {
    var area = onlyPhoneDigits(ddd).slice(0, 2), number = onlyPhoneDigits(phone);
    if (number.length === 9) number = number.slice(0, 5) + '-' + number.slice(5);
    else if (number.length === 8) number = number.slice(0, 4) + '-' + number.slice(4);
    return area ? '(' + area + ')' + (number ? ' ' + number : ' ') : number;
  }
  function passwordField(id, name, label, autocomplete) { return '<label class="field" for="' + esc(id) + '">' + esc(label) + '<span class="password-control"><input id="' + esc(id) + '" required minlength="6" type="password" name="' + esc(name) + '" autocomplete="' + esc(autocomplete || 'current-password') + '"><button type="button" class="btn btn-ghost" data-password-toggle aria-controls="' + esc(id) + '" aria-pressed="false">Mostrar senha</button></span></label>'; }
  function bindPasswordToggles(parent) { all('[data-password-toggle]', parent).forEach(function (button) { button.addEventListener('click', function () { var input = el('#' + button.getAttribute('aria-controls'), parent || document); if (!input) return; var visible = input.type === 'text'; input.type = visible ? 'password' : 'text'; button.textContent = visible ? 'Mostrar senha' : 'Ocultar senha'; button.setAttribute('aria-pressed', visible ? 'false' : 'true'); }); }); }
  function currentPage() { var node = document.body; return node && (node.dataset.page || node.getAttribute('data-page')); }
  function ensureAuth(role) { var user = g.Core.user(); if (!user) { render(shell(heading('Acesso à conta', 'Entre para continuar', 'Faça login para acessar esta área.') + '<a class="btn btn-primary" href="login.html">Ir para login</a>')); return null; } if (role && user.role !== role) { render(shell(heading('Área restrita', 'Perfil sem permissão', 'Selecione a área correspondente ao seu perfil.') + '<a class="btn btn-secondary" href="' + esc(g.Core.roleUrl(user.role)) + '">Voltar para minha área</a>')); return null; } if (user.role === 'paciente' && (!user.birthDate || !g.Core.isAdult(user.birthDate)) && currentPage() !== 'perfil') { render(shell(heading('Complete seu cadastro', 'Data de nascimento necessária', 'Para continuar, informe sua data de nascimento no perfil. É necessário ter 18 anos completos.') + '<a class="btn btn-primary" href="perfil.html">Completar perfil</a>')); return null; } return user; }
  function birthDateMax() { var d = new Date(); d.setFullYear(d.getFullYear() - 18); return d.getFullYear() + '-' + ('0' + (d.getMonth()+1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }

  function renderLogin() {
    render(shell(heading('Acesso à conta', 'Bem-vindo de volta', 'Entre para acessar sua área.') +
      '<form class="panel stack" id="loginForm"><label class="field" for="loginEmail">E-mail<input id="loginEmail" required type="email" name="email" autocomplete="username"></label>' + passwordField('loginPassword','password','Senha','current-password') + '<button class="btn btn-primary" type="submit">Entrar</button><p class="helper"><a href="recovery.html">Esqueci minha senha</a> · <a href="cadastro.html">Criar conta</a></p></form>'));
    bindPasswordToggles(el('#loginForm'));
    runForm(el('#loginForm'), function (data) { return g.Core.login(formValue(data,'email'), formValue(data,'password')).then(function (user) { toast('Sessão iniciada.'); go(user.role === 'paciente' && !user.birthDate ? 'perfil.html' : g.Core.roleUrl(user.role)); }); });
  }
  function renderCadastro() {
    render(shell(heading('Criar conta', 'Seus dados de acesso', 'Preencha as informações para criar sua conta.') + '<form class="panel form-grid" id="registerForm"><label class="field" for="registerName">Nome completo<input id="registerName" required minlength="2" name="name" autocomplete="name"></label><label class="field" for="registerEmail">E-mail<input id="registerEmail" required type="email" name="email" autocomplete="email"></label>' + passwordField('registerPassword','password','Senha','new-password') + passwordField('registerConfirmPassword','confirmPassword','Confirme a senha','new-password') + '<label class="field" for="birthDate">Data de nascimento<input id="birthDate" required type="date" name="birthDate" max="' + birthDateMax() + '" autocomplete="bday"><span class="helper">Cadastro disponível para maiores de 18 anos.</span></label><label class="field" for="cep">CEP (opcional)<input id="cep" name="cep" autocomplete="postal-code" inputmode="numeric" maxlength="9"></label><label class="field" for="registerPhone">Telefone com DDD<input id="registerPhone" name="phoneDisplay" type="tel" autocomplete="tel" inputmode="tel" placeholder="(00) 00000-0000"><span class="helper">O DDD é preenchido pelo CEP quando disponível.</span></label><input type="hidden" id="registerDdd" name="ddd"><button type="button" class="btn btn-ghost" id="buscarCep">Buscar CEP</button><p id="cepStatus" class="status" role="status">Informe um CEP para preencher o endereço e o DDD automaticamente.</p><label class="field full" for="endereco">Endereço<input id="endereco" name="endereco" autocomplete="street-address" maxlength="160"></label><label class="field" for="registerState">Estado<select id="registerState" name="state" required><option value="">Selecione o estado</option></select></label><label class="field" for="registerCity">Cidade<select id="registerCity" name="city" required disabled><option value="">Selecione primeiro o estado</option></select></label><label class="checkbox-field full"><input type="checkbox" name="consent" required> Entendo que este acesso é destinado à instalação local da Haname.</label><button class="btn btn-primary" type="submit">Criar conta</button></form>'));
    bindPasswordToggles(el('#registerForm'));
    if (g.HanameLocations) g.HanameLocations.init(el('#registerForm'));
    runForm(el('#registerForm'), function (data) { if (formValue(data,'password') !== formValue(data,'confirmPassword')) throw new Error('As senhas não conferem.'); var phoneValues = splitPhoneField(formValue(data,'phoneDisplay'), formValue(data,'ddd')); return g.Core.register({name:formValue(data,'name'),email:formValue(data,'email'),password:formValue(data,'password'),birthDate:formValue(data,'birthDate'),ddd:phoneValues.ddd,phone:phoneValues.phone,cep:formValue(data,'cep'),endereco:formValue(data,'endereco'),city:formValue(data,'city'),state:formValue(data,'state')}).then(function (result) { uiModal({title:'Guarde seu código de recuperação',body:'<p>A recuperação é local e não envia e-mail. Anote este código agora:</p><p class="status selected"><strong>' + esc(result.recoveryCode) + '</strong></p><p class="helper">Ele não é salvo em texto puro e não será exibido novamente.</p>',footer:'<a class="btn btn-primary" href="intranetp.html">Ir para minha área</a>'}); }); });
  }
  function renderRecovery() {
    render(shell(heading('Acesso local', 'Recuperar senha', 'Use o código mostrado ao concluir o cadastro. Nenhum e-mail é enviado.') + '<form class="panel form-grid" id="recoveryForm"><label class="field" for="recoveryEmail">E-mail<input id="recoveryEmail" required type="email" name="email" autocomplete="email"></label><label class="field" for="recoveryCode">Código de recuperação<input id="recoveryCode" required name="code" autocomplete="one-time-code"></label>' + passwordField('recoveryPassword','password','Nova senha','new-password') + '<button class="btn btn-primary" type="submit">Atualizar senha</button></form><p class="helper"><a href="cadastro.html">Criar novo cadastro</a></p>'));
    bindPasswordToggles(el('#recoveryForm'));
    runForm(el('#recoveryForm'), function (data) { return g.Core.recover(formValue(data,'email'),formValue(data,'code'),formValue(data,'password')).then(function () { toast('Senha atualizada.'); go('login.html'); }); });
  }
  function doctorOptions(selected) { return g.Core.doctors().filter(function (d) { return d.active; }).map(function (d) { return '<option value="' + esc(d.id) + '"' + (d.id === selected ? ' selected' : '') + '>' + esc(d.name) + ' · ' + esc(d.specialty) + '</option>'; }).join(''); }
  function availableDateInput(value) { return '<input required type="date" name="date" min="' + esc(g.Core.today()) + '" max="' + esc(addDays(g.Core.today(),60)) + '" value="' + esc(value || g.Core.today()) + '">'; }
  function addDays(iso, days) { var date = new Date(iso + 'T12:00:00'); date.setDate(date.getDate() + days); return date.getFullYear() + '-' + ('0' + (date.getMonth()+1)).slice(-2) + '-' + ('0' + date.getDate()).slice(-2); }
  function renderPendingConfirm() {
    var pending = g.Core.get('pendingBooking', null), user = ensureAuth('paciente'); if (!user) return;
    if (!pending) { render(shell(heading('Agendamento', 'Nada para confirmar', 'Escolha um médico e um horário disponível primeiro.') + '<a class="btn btn-primary" href="agendamento.html">Escolher horário</a>')); return; }
    var doctor = g.Core.doctors().find(function (d) { return d.id === pending.doctorId; });
    render(shell(heading('Revisão', 'Confirmar consulta', 'A confirmação final revalida a disponibilidade local.') + '<div class="panel"><dl class="recap"><dt>Médico</dt><dd>' + esc(doctor ? doctor.name : pending.doctorId) + '</dd><dt>Especialidade</dt><dd>' + esc(doctor ? doctor.specialty : '') + '</dd><dt>Data</dt><dd>' + esc(g.Core.dateLabel(pending.date)) + '</dd><dt>Horário</dt><dd>' + esc(pending.time) + '</dd><dt>Observação</dt><dd>' + esc(pending.notes || 'Nenhuma') + '</dd></dl><div class="stack"><button type="button" class="btn btn-primary" id="confirmBooking">Confirmar consulta</button><a class="btn btn-ghost" href="agendamento.html">Voltar e alterar</a></div></div>'));
    el('#confirmBooking').addEventListener('click', function (event) { busy(event.currentTarget,true); g.Core.book(pending).then(function (appointment) { g.Core.set('pendingBooking',null); toast('Solicitação registrada.'); go('intranetp.html'); }).catch(function (error) { toast(errorMessage(error),'error'); }).finally(function () { busy(event.currentTarget,false); }); });
  }
  function reportContent(report) {
    return '<div class="medical-report-content"><section><h3>Sintomas</h3><p>' + esc(report.symptoms) + '</p></section><section><h3>Sinais e achados</h3><p>' + esc(report.signs) + '</p></section><section><h3>Possível diagnóstico</h3><p>' + esc(report.possibleDiagnosis) + '</p></section><section><h3>Prescrição de medicamentos</h3><p>' + esc(report.prescription) + '</p></section></div>';
  }
  function openPatientReport(appointmentId) {
    var appointment = g.Core.myAppointments().find(function (item) { return item.id === appointmentId && item.status === 'completed' && item.report; });
    if (!appointment) { toast('Relatório indisponível.', 'error'); return; }
    uiModal({title:'Relatório da consulta',body:'<p class="helper">' + esc(appointment.doctorName || 'Médico') + ' · ' + esc(g.Core.dateLabel(appointment.date)) + '</p>' + reportContent(appointment.report)});
  }
  function openDoctorReport(appointmentId) {
    var appointment = g.Core.myAppointments().find(function (item) { return item.id === appointmentId && item.status === 'confirmed'; });
    if (!appointment) { toast('Consulta não encontrada ou já concluída.', 'error'); return; }
    uiModal({title:'Relatório da consulta',body:'<p class="helper">' + esc(appointment.patientName || 'Paciente') + ' · ' + esc(g.Core.dateLabel(appointment.date)) + ' às ' + esc(appointment.time) + '</p><p class="notice">Registre a avaliação do profissional. O sistema não define diagnósticos nem medicamentos.</p><form class="form-grid medical-report-form" id="medicalReportForm"><label class="field full" for="reportSymptoms">Sintomas<textarea id="reportSymptoms" name="symptoms" required maxlength="3000" rows="4" placeholder="Relato dos sintomas apresentados"></textarea></label><label class="field full" for="reportSigns">Sinais e achados<textarea id="reportSigns" name="signs" required maxlength="3000" rows="4" placeholder="Sinais observados e achados do atendimento"></textarea></label><label class="field full" for="reportDiagnosis">Possível diagnóstico<textarea id="reportDiagnosis" name="possibleDiagnosis" required maxlength="1500" rows="3" placeholder="Hipótese ou avaliação diagnóstica do profissional"></textarea></label><label class="field full" for="reportPrescription">Prescrição de medicamentos<textarea id="reportPrescription" name="prescription" required maxlength="3000" rows="4" placeholder="Medicamento, dose, via e orientações; se não houver, escreva “Sem prescrição”"></textarea><span class="helper">A prescrição deve ser preenchida pelo profissional responsável.</span></label><div class="form-actions full"><button type="submit" class="btn btn-primary">Salvar relatório e concluir consulta</button></div></form>'});
    var form = el('#medicalReportForm');
    runForm(form, function (data) { return g.Core.complete(appointmentId,{symptoms:formValue(data,'symptoms'),signs:formValue(data,'signs'),possibleDiagnosis:formValue(data,'possibleDiagnosis'),prescription:formValue(data,'prescription')}).then(function () { closeModal(); toast('Relatório salvo e consulta concluída.'); renderDoctor(); }); });
  }
  function appointmentCard(a, options) {
    options = options || {}; var actions = '';
    if (options.patient && !options.history && a.status === 'confirmed') actions = '<button type="button" class="btn btn-danger js-cancel" data-id="' + esc(a.id) + '">Cancelar</button><button type="button" class="btn btn-secondary js-reschedule" data-id="' + esc(a.id) + '">Remarcar</button><button type="button" class="btn btn-ghost js-ics" data-id="' + esc(a.id) + '">Baixar ICS</button>';
    if (options.patient && a.status === 'completed' && a.report) actions = '<button type="button" class="btn btn-secondary js-view-report" data-id="' + esc(a.id) + '">Ver relatório</button>';
    if (options.doctor && a.status === 'confirmed') actions = '<button type="button" class="btn btn-primary js-complete" data-id="' + esc(a.id) + '">Concluir consulta</button>';
    return '<article class="card appointment-card"><div class="section-head"><div><p class="eyebrow">' + esc(a.status === 'confirmed' ? 'Confirmada' : (a.status === 'completed' ? 'Concluída' : 'Cancelada')) + '</p><h3>' + esc(a.doctorName || 'Registro legado') + '</h3></div><div class="stack-inline"><span class="badge">' + esc(a.time) + '</span>' + (a.legacy ? '<span class="badge">Registro legado</span>' : '') + (a.testFixture ? '<span class="badge">Consulta de teste</span>' : '') + '</div></div><p>' + esc(g.Core.dateLabel(a.date)) + ' · ' + esc(a.specialty || 'Histórico local') + '</p>' + (options.doctor ? '<p class="muted">Paciente: ' + esc(a.patientName) + '</p>' : '') + (a.notes ? '<p class="helper">Observação: ' + esc(a.notes) + '</p>' : '') + (actions ? '<div class="stack actions">' + actions + '</div>' : '') + '</article>';
  }
  function splitAppointments(list) { var today = g.Core.today(); return {upcoming:list.filter(function (a) { return a.status === 'confirmed' && a.date >= today; }).sort(sortAppointment), history:list.filter(function (a) { return a.status !== 'confirmed' || a.date < today; }).sort(sortAppointment)}; }
  function sortAppointment(a,b) { return (a.date + a.time).localeCompare(b.date + b.time); }
  function renderPatient() {
    var user = ensureAuth('paciente'); if (!user) return; var groups = splitAppointments(g.Core.myAppointments()); var favoriteDoctors = g.Core.favorites('doctor');
    render(shell(heading('Minha área', 'Olá, ' + user.name, 'Acompanhe suas consultas e preferências.') + '<div class="toolbar"><a class="btn btn-primary" href="agendamento.html">Nova consulta</a><a class="btn btn-secondary" href="medicos.html">Ver médicos</a><a class="btn btn-ghost" href="perfil.html">Editar perfil</a></div><section><div class="section-head"><h2>Próximas consultas</h2><span class="pill">' + groups.upcoming.length + '</span></div><div class="result-grid" id="upcomingList">' + (groups.upcoming.length ? groups.upcoming.map(function (a) { return appointmentCard(a,{patient:true}); }).join('') : '<div class="empty-state">Nenhuma consulta confirmada para os próximos dias.</div>') + '</div></section><section><div class="section-head"><h2>Histórico</h2><span class="pill">' + groups.history.length + '</span></div><div class="result-grid">' + (groups.history.length ? groups.history.map(function (a) { return appointmentCard(a,{patient:true,history:true}); }).join('') : '<div class="empty-state">Seu histórico ainda está vazio.</div>') + '</div></section><section><div class="section-head"><h2>Médicos favoritos</h2><span class="pill">' + favoriteDoctors.length + '</span></div><div class="result-grid">' + (favoriteDoctors.length ? favoriteDoctors.map(function (f) { return '<div class="card"><h3>' + esc(f.title) + '</h3><div class="card-actions"><a href="medicos.html" class="btn btn-ghost">Abrir guia</a><button type="button" class="btn btn-danger js-remove-doctor-favorite" data-id="' + esc(f.id) + '" aria-pressed="true">Remover favorito</button></div></div>'; }).join('') : '<div class="empty-state">Você ainda não favoritou médicos.</div>') + '</div></section>'));
    all('.js-cancel').forEach(function (button) { button.addEventListener('click', function () { confirmAction({title:'Cancelar consulta?',message:'A consulta será marcada como cancelada localmente.',confirmText:'Cancelar consulta',onConfirm:function () { return g.Core.cancel(button.dataset.id).then(function () { toast('Consulta cancelada.'); renderPatient(); }); }}); }); });
    all('.js-reschedule').forEach(function (button) { button.addEventListener('click', function () { openReschedule(button.dataset.id); }); });
    all('.js-ics').forEach(function (button) { button.addEventListener('click', function () { var a = g.Core.myAppointments().find(function (x) { return x.id === button.dataset.id; }); if (a) downloadICS(a); }); });
    all('.js-view-report').forEach(function (button) { button.addEventListener('click', function () { openPatientReport(button.dataset.id); }); });
    all('.js-remove-doctor-favorite').forEach(function (button) { button.addEventListener('click', function () { g.Core.toggleFavorite({type:'doctor',id:button.dataset.id}).then(function () { toast('Médico removido dos favoritos.'); renderPatient(); }).catch(function (error) { toast(errorMessage(error),'error'); }); }); });
  }
  function openReschedule(id) {
    var a = g.Core.myAppointments().find(function (x) { return x.id === id; }); if (!a) return;
    uiModal({title:'Remarcar sem perder a consulta',body:'<form class="form-grid haname-reschedule-form"><label class="field">Médico<select name="doctorId">' + doctorOptions(a.doctorId) + '</select></label><label class="field">Data' + availableDateInput(a.date) + '</label><label class="field">Horário<select name="time" required><option value="">Selecione uma data</option></select></label><label class="field">Observação<textarea name="notes" maxlength="1000">' + esc(a.notes || '') + '</textarea></label><button type="submit" class="btn btn-primary">Confirmar remarcação</button></form>'});
    var form = el('.haname-reschedule-form'); if (!form) return;
    function refresh() { var data = new FormData(form), slots = g.Core.slots(formValue(data,'doctorId'),formValue(data,'date'),id); el('[name="time"]',form).innerHTML = '<option value="">Selecione</option>' + slots.map(function (slot) { return '<option value="' + esc(slot) + '"' + (slot === a.time ? ' selected' : '') + '>' + esc(slot) + '</option>'; }).join(''); }
    all('[name="doctorId"],[name="date"]',form).forEach(function (node) { node.addEventListener('change', refresh); }); refresh();
    runForm(form,function (data) { return g.Core.reschedule(id,{doctorId:formValue(data,'doctorId'),date:formValue(data,'date'),time:formValue(data,'time'),notes:formValue(data,'notes')}).then(function () { closeModal(); toast('Remarcação confirmada atomicamente.'); renderPatient(); }); });
  }
  function icsDate(date,time) { return String(date).replace(/-/g,'') + 'T' + String(time).replace(':','') + '00'; }
  function downloadICS(a) {
    var text = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Haname//PT-BR','BEGIN:VEVENT','UID:' + a.id + '@haname.local','DTSTART:' + icsDate(a.date,a.time),'SUMMARY:Consulta - ' + a.doctorName,'DESCRIPTION:Confirme o horário com a equipe responsável.','END:VEVENT','END:VCALENDAR'].join('\r\n');
    if (g.UI && typeof g.UI.download === 'function') g.UI.download('haname-' + a.date + '-' + a.time.replace(':','') + '.ics',text,'text/calendar'); else { var blob = new Blob([text],{type:'text/calendar'}), link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'haname-' + a.date + '.ics'; link.click(); setTimeout(function () { URL.revokeObjectURL(link.href); },1000); }
  }
  function renderDoctor() {
    var user = ensureAuth('medico'); if (!user) return; var doctor = g.Core.doctors().find(function (d) { return d.id === user.doctorId; }); var appointments = g.Core.myAppointments().sort(sortAppointment);
    render(shell(heading('Área do médico', doctor ? doctor.name : user.name, 'Consulte e gerencie os horários associados à sua agenda.') + (doctor ? '<div class="panel"><p class="eyebrow">' + esc(doctor.specialty) + '</p><p>' + esc(doctor.description) + '</p><p class="muted">' + esc(doctor.mode) + ' · ' + esc(doctor.crm) + '</p></div>' : '') + '<section><div class="section-head"><h2>Agenda</h2><span class="pill">' + appointments.filter(function (a) { return a.status === 'confirmed'; }).length + '</span></div><div class="result-grid">' + (appointments.length ? appointments.map(function (a) { return appointmentCard(a,{doctor:true}); }).join('') : '<div class="empty-state">Não há consultas agendadas.</div>') + '</div></section>'));
    all('.js-complete').forEach(function (button) { button.addEventListener('click', function () { openDoctorReport(button.dataset.id); }); });
  }
  function renderAdmin() {
    var user = ensureAuth('admin'); if (!user) return;
    var doctors = g.Core.doctors();
    var users = g.Core.read('users');
    var patients = users.filter(function (item) { return item.role === 'paciente'; });
    var appointments = g.Core.appointments();
    var confirmed = appointments.filter(function (item) { return item.status === 'confirmed'; });
    var today = g.Core.today();
    var todayCount = confirmed.filter(function (item) { return item.date === today; }).length;
    var completed = appointments.filter(function (item) { return item.status === 'completed'; }).length;
    var cancelled = appointments.filter(function (item) { return item.status === 'cancelled'; }).length;
    var shortcuts = '<section class="clinic-admin-shortcuts"><div class="section-head"><div><p class="eyebrow">Rotina da clínica</p><h2>Atalhos de operação</h2></div></div><div class="card-grid"><a class="card clinic-admin-link" href="atendimento.html"><span class="eyebrow">Recepção</span><h3>Fila de atendimento</h3><p>Registrar chegada e acompanhar consultas de hoje.</p><span class="link-arrow">Abrir fila →</span></a><a class="card clinic-admin-link" href="pacientes.html"><span class="eyebrow">Cadastros</span><h3>Diretório de pacientes</h3><p>Consultar cadastros e consultas vinculadas.</p><span class="link-arrow">Abrir pacientes →</span></a><a class="card clinic-admin-link" href="equipe.html"><span class="eyebrow">Profissionais</span><h3>Equipe médica</h3><p>Consultar a equipe e controlar agendas abertas.</p><span class="link-arrow">Gerenciar equipe →</span></a></div></section>';
    render(shell(heading('Gestão da clínica', 'Painel de operação', 'Resumo da equipe, dos cadastros e dos atendimentos registrados.') + '<div class="notice warning"><strong>Privacidade dos dados.</strong> Não cadastre informações pessoais ou de saúde reais nesta instalação.</div><div class="result-grid stats clinic-admin-stats"><div class="card"><p class="eyebrow">Pacientes cadastrados</p><strong>' + patients.length + '</strong></div><div class="card"><p class="eyebrow">Consultas hoje</p><strong>' + todayCount + '</strong></div><div class="card"><p class="eyebrow">Agendas ativas</p><strong>' + doctors.filter(function (item) { return item.active; }).length + '</strong></div><div class="card"><p class="eyebrow">Concluídas</p><strong>' + completed + '</strong><p class="muted">' + cancelled + ' canceladas · ' + confirmed.length + ' confirmadas</p></div></div>' + shortcuts + '<section><div class="section-head"><div><p class="eyebrow">Equipe</p><h2>Controle rápido de agendas</h2></div><label class="field">Filtrar profissionais<input id="adminDoctorFilter" type="search" placeholder="Nome ou especialidade"></label></div><div class="result-grid">' + doctors.map(function (doctor) { return '<article class="card admin-doctor-card" data-search="' + esc((doctor.name + ' ' + doctor.specialty + ' ' + doctor.crm).toLowerCase()) + '"><div class="section-head"><div><h3>' + esc(doctor.name) + '</h3><p class="muted">' + esc(doctor.specialty) + ' · ' + esc(doctor.crm) + '</p></div><span class="status ' + (doctor.active ? 'selected' : 'error') + '">' + (doctor.active ? 'Agenda ativa' : 'Suspensa') + '</span></div><button type="button" class="btn ' + (doctor.active ? 'btn-danger' : 'btn-primary') + ' js-toggle-doctor" data-id="' + esc(doctor.id) + '" data-active="' + (!doctor.active) + '">' + (doctor.active ? 'Suspender agenda' : 'Reabrir agenda') + '</button></article>'; }).join('') + '</div></section>'));
    all('.js-toggle-doctor').forEach(function (button) { button.addEventListener('click', function () { var active = button.dataset.active === 'true'; confirmAction({title:active ? 'Reabrir agenda?' : 'Suspender agenda?',message:'A alteração atualizará a disponibilidade dos horários futuros deste profissional.',onConfirm:function () { return g.Core.setDoctorActive(button.dataset.id,active).then(function () { toast(active ? 'Agenda reaberta.' : 'Agenda suspensa.'); renderAdmin(); }); }}); }); });
    var filter = el('#adminDoctorFilter');
    if (filter) filter.addEventListener('input', function () { var query = filter.value.toLowerCase(); all('.admin-doctor-card').forEach(function (card) { card.hidden = query && card.dataset.search.indexOf(query) < 0; }); });
  }
  function renderMedicos() {
    render(shell(heading('Guia médico', 'Conheça a equipe', 'Filtre por especialidade e modalidade de atendimento.') + '<div class="toolbar"><label class="field">Buscar<input id="doctorSearch" type="search" placeholder="Nome ou especialidade"></label><label class="field">Especialidade<select id="doctorSpecialty"><option value="">Todas</option>' + Array.from(new Set(g.Core.doctors().map(function (d) { return d.specialty; }))).sort().map(function (s) { return '<option>' + esc(s) + '</option>'; }).join('') + '</select></label><label class="field">Formato<select id="doctorMode"><option value="">Todos</option><option>Presencial</option><option>Teleorientação</option></select></label></div><div class="result-grid" id="doctorResults"></div>'));
    function favoriteButton(d) { var user = g.Core.user(), active = user && g.Core.favorites('doctor').some(function (favorite) { return String(favorite.id) === String(d.id); }); if (!user) return '<a class="btn btn-ghost" href="login.html" aria-label="Entre para favoritar ' + esc(d.name) + '">Entre para favoritar</a>'; return '<button type="button" class="btn btn-ghost js-doctor-favorite' + (active ? ' selected' : '') + '" data-id="' + esc(d.id) + '" data-title="' + esc(d.name) + '" aria-pressed="' + (active ? 'true' : 'false') + '" aria-label="' + esc(active ? 'Remover ' + d.name + ' dos favoritos' : 'Favoritar ' + d.name) + '">' + (active ? 'Remover favorito' : 'Favoritar médico') + '</button>'; }
    function draw() { var query = (el('#doctorSearch').value || '').toLowerCase(), specialty = el('#doctorSpecialty').value, mode = el('#doctorMode').value; var doctors = g.Core.doctors().filter(function (d) { return (!query || (d.name + ' ' + d.specialty).toLowerCase().indexOf(query) >= 0) && (!specialty || d.specialty === specialty) && (!mode || d.mode === mode); }); el('#doctorResults').innerHTML = doctors.length ? doctors.map(function (d) { return '<article class="card"><div class="section-head"><div><p class="eyebrow">' + esc(d.specialty) + '</p><h2 class="doctor-guide-name">' + esc(d.name) + '</h2></div><span class="badge">' + esc(d.mode) + '</span></div><p>' + esc(d.description) + '</p><p class="muted">' + esc(d.crm) + '</p><div class="card-actions"><a class="btn btn-primary" href="agendamento.html?doctor=' + esc(encodeURIComponent(d.id)) + '">Ver horários</a>' + favoriteButton(d) + '</div></article>'; }).join('') : '<div class="empty-state">Nenhum médico corresponde aos filtros.</div>'; all('.js-doctor-favorite').forEach(function (button) { button.addEventListener('click', function () { g.Core.toggleFavorite({type:'doctor',id:button.dataset.id,title:button.dataset.title}).then(function (active) { toast(active ? 'Médico adicionado aos favoritos.' : 'Médico removido dos favoritos.'); draw(); }).catch(function (error) { toast(errorMessage(error),'error'); }); }); }); }
    var renderResults = draw;
    draw = function () {
      renderResults();
      all('#doctorResults a.btn-primary').forEach(function (link) {
        var doctorId = new URL(link.href, g.location.href).searchParams.get('doctor');
        var doctor = g.Core.doctors().find(function (item) { return item.id === doctorId; });
        if (!doctor || doctor.active) return;
        var label = document.createElement('span');
        label.className = 'status error'; label.textContent = 'Agenda bloqueada';
        link.replaceWith(label);
      });
    };
    ['#doctorSearch','#doctorSpecialty','#doctorMode'].forEach(function (selector) { el(selector).addEventListener('input',draw); el(selector).addEventListener('change',draw); }); draw();
  }
  function renderPerfil() {
    var user = ensureAuth('paciente'); if (!user) return;
    render(shell(heading('Minha conta', 'Perfil', 'Revise suas informações cadastrais.') + '<form class="panel form-grid" id="profileForm"><label class="field" for="profileName">Nome<input id="profileName" required name="name" value="' + esc(user.name) + '"></label><label class="field" for="profileEmail">E-mail<input id="profileEmail" disabled value="' + esc(user.email) + '"></label><label class="field" for="birthDate">Data de nascimento<input id="birthDate" required type="date" name="birthDate" max="' + birthDateMax() + '" value="' + esc(user.birthDate || '') + '"><span class="helper">É necessário ter 18 anos completos.</span></label><label class="field" for="profileCep">CEP<input id="profileCep" name="cep" value="' + esc(user.cep || '') + '" inputmode="numeric" maxlength="9"></label><label class="field" for="profilePhone">Telefone com DDD<input id="profilePhone" name="phoneDisplay" type="tel" autocomplete="tel" inputmode="tel" placeholder="(00) 00000-0000" value="' + esc(formatPhoneDisplay(user.ddd, user.phone)) + '"><span class="helper">DDD e número ficam juntos neste campo.</span></label><input type="hidden" id="profileDdd" name="ddd" value="' + esc(user.ddd || '') + '"><label class="field full" for="profileAddress">Endereço<input id="profileAddress" name="endereco" value="' + esc(user.endereco || '') + '"></label><label class="field" for="state">Estado<select id="state" name="state" required><option value="' + esc(user.state || '') + '">' + (user.state ? esc(user.state) : 'Selecione o estado') + '</option></select></label><label class="field" for="city">Cidade<select id="city" name="city" required disabled><option value="' + esc(user.city || '') + '">' + (user.city ? esc(user.city) : 'Selecione primeiro o estado') + '</option></select></label><div class="form-actions full"><button type="submit" class="btn btn-primary">Salvar perfil</button></div></form><div class="toolbar"><a class="btn btn-secondary" href="intranetp.html">Voltar ao painel</a><button type="button" class="btn btn-danger" id="logoutButton">Sair</button></div>'));
    if (g.HanameLocations) g.HanameLocations.init(el('#profileForm'), {state:user.state || '', city:user.city || ''});
    runForm(el('#profileForm'),function (data) { var phoneValues = splitPhoneField(formValue(data,'phoneDisplay'), formValue(data,'ddd')); return g.Core.updateProfile({name:formValue(data,'name'),ddd:phoneValues.ddd,phone:phoneValues.phone,cep:formValue(data,'cep'),endereco:formValue(data,'endereco'),birthDate:formValue(data,'birthDate'),city:formValue(data,'city'),state:formValue(data,'state')}).then(function () { toast('Perfil atualizado.'); }); });
    el('#logoutButton').addEventListener('click',function () { g.Core.logout(); toast('Sessão encerrada.'); go('login.html'); });
  }
  function renderDados() {
    var user = ensureAuth('admin'); if (!user) return;
    var backup = g.Core.downloadBackup();
    var connection = g.Core.apiStatus();
    var recordCounts = Object.keys(backup).filter(function (key) { return Array.isArray(backup[key]); }).map(function (key) { return esc(key) + ': ' + backup[key].length; }).join(' · ');
    var localStorageAvailable = connection.mode === 'localStorage';
    var canSave = connection.connected || localStorageAvailable;
    var statusText = connection.connected ? 'Gravação automática ativa.' : (localStorageAvailable ? 'Dados salvos somente neste navegador; não há sincronização entre pessoas ou dispositivos.' : 'O armazenamento do navegador está indisponível; os dados podem se perder ao fechar a página.');
    render(shell(heading('Dados', 'Armazenamento e cópia', 'Consulte o estado da gravação e exporte uma cópia dos registros.') +
      '<section class="panel local-storage-panel"><p class="eyebrow">Estado da gravação</p><h2>Armazenamento neste navegador</h2><p class="status ' + (canSave ? 'selected' : 'error') + '" id="localStorageStatus" role="status">' + esc(statusText) + '</p><div class="notice warning"><span><strong>Privacidade.</strong> Não cadastre informações pessoais ou de saúde reais; este portal não possui os controles necessários para um prontuário eletrônico.</span></div></section>' +
      '<section class="panel"><p class="eyebrow">Cópia de dados</p><p class="notice warning">A exportação não contém senhas, hashes, códigos de recuperação, sessão ou permissões restauráveis.</p><button type="button" id="downloadBackup" class="btn btn-primary">Baixar cópia JSON</button><p class="helper">Registros atuais: ' + recordCounts + '</p></section>'));
    el('#downloadBackup').addEventListener('click', function () {
      var data = JSON.stringify(g.Core.downloadBackup(), null, 2);
      if (g.UI && typeof g.UI.download === 'function') g.UI.download('haname-backup.json', data, 'application/json');
      else { var blob = new Blob([data], {type:'application/json'}), link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'haname-backup.json'; link.click(); setTimeout(function () { URL.revokeObjectURL(link.href); }, 1000); }
      toast('Cópia de dados preparada.');
    });
  }
  function paymentMoney(cents) { return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format((Number(cents) || 0) / 100); }
  function paymentMethodLabel(method) { return ({pix:'Pix',cartao:'Cartão',dinheiro:'Dinheiro',transferencia:'Transferência',outro:'Outro'})[method] || 'Outro'; }
  function paymentStatusLabel(status) { return ({pending:'Pendente',paid:'Pago',cancelled:'Cancelado'})[status] || 'Pendente'; }
  function renderPayments() {
    var user = g.Core.user();
    if (!user) { render(shell(heading('Pagamentos', 'Entre para continuar', 'Acesse sua conta para consultar os registros vinculados às suas consultas.') + '<a class="btn btn-primary" href="login.html">Ir para login</a>')); return; }
    if (user.role === 'paciente') { user = ensureAuth('paciente'); if (!user) return; }
    else if (user.role !== 'admin') { render(shell(heading('Pagamentos', 'Área restrita', 'Esta área é destinada à administração e ao paciente titular dos registros.') + '<a class="btn btn-secondary" href="' + esc(g.Core.roleUrl(user.role)) + '">Voltar para minha área</a>')); return; }
    var isAdmin = user.role === 'admin';
    var appointments = (isAdmin ? g.Core.appointments() : g.Core.myAppointments()).slice().sort(sortAppointment);
    var available = appointments.filter(function (appointment) { return appointment.status !== 'cancelled'; });
    var payments = g.Core.payments().slice().sort(function (a,b) { return String(b.createdAt).localeCompare(String(a.createdAt)); });
    var appointmentMap = Object.create(null);
    appointments.forEach(function (appointment) { appointmentMap[appointment.id] = appointment; });
    var paidCents = payments.filter(function (payment) { return payment.status === 'paid'; }).reduce(function (sum,payment) { return sum + payment.amountCents; },0);
    var pendingCents = payments.filter(function (payment) { return payment.status === 'pending'; }).reduce(function (sum,payment) { return sum + payment.amountCents; },0);
    var stats = '<div class="result-grid stats payment-summary"><div class="card"><p class="eyebrow">Registros</p><strong>' + payments.length + '</strong></div><div class="card"><p class="eyebrow">Valores pendentes</p><strong>' + esc(paymentMoney(pendingCents)) + '</strong></div><div class="card"><p class="eyebrow">Valores lançados como pagos</p><strong>' + esc(paymentMoney(paidCents)) + '</strong></div></div>';
    var formMarkup = '';
    if (isAdmin) {
      var appointmentOptions = available.map(function (appointment) { return '<option value="' + esc(appointment.id) + '">' + esc(g.Core.dateLabel(appointment.date) + ' · ' + appointment.time + ' · ' + (appointment.patientName || 'Paciente') + ' · ' + (appointment.doctorName || 'Profissional')) + '</option>'; }).join('');
      formMarkup = '<section class="panel payment-entry-panel"><div class="section-head"><div><p class="eyebrow">Lançamento administrativo</p><h2>Registrar pagamento</h2></div></div><form id="paymentForm" class="form-grid"><label class="field full" for="paymentAppointment">Consulta<select id="paymentAppointment" name="appointmentId" required' + (available.length ? '' : ' disabled') + '><option value="">' + (available.length ? 'Selecione uma consulta' : 'Nenhuma consulta disponível') + '</option>' + appointmentOptions + '</select></label><label class="field" for="paymentAmount">Valor (R$)<input id="paymentAmount" name="amount" type="number" min="0.01" max="1000000" step="0.01" inputmode="decimal" placeholder="0,00" required></label><label class="field" for="paymentMethod">Forma de pagamento<select id="paymentMethod" name="method" required><option value="">Selecione</option><option value="pix">Pix</option><option value="cartao">Cartão</option><option value="dinheiro">Dinheiro</option><option value="transferencia">Transferência</option><option value="outro">Outro</option></select></label><div class="form-actions full"><button type="submit" class="btn btn-primary"' + (available.length ? '' : ' disabled') + '>Registrar como pendente</button></div></form><div class="notice warning"><span>Registro local manual: não há cobrança automática, processamento de cartão ou validação de convênio. Não informe nem armazene dados de cartão.</span></div></section>';
    }
    var cards = payments.map(function (payment) {
      var appointment = appointmentMap[payment.appointmentId];
      if (!appointment) return '';
      var statusClass = payment.status === 'paid' ? 'selected' : payment.status === 'cancelled' ? 'error' : '';
      var created = new Date(payment.createdAt), createdLabel = isNaN(created.getTime()) ? '' : new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short'}).format(created);
      var statusActions = '';
      if (isAdmin && payment.status === 'pending') statusActions = '<button type="button" class="btn btn-primary js-payment-status" data-id="' + esc(payment.id) + '" data-next-status="paid">Registrar como pago</button><button type="button" class="btn btn-danger js-payment-status" data-id="' + esc(payment.id) + '" data-next-status="cancelled">Cancelar registro</button>';
      else if (isAdmin && payment.status === 'paid') statusActions = '<button type="button" class="btn btn-danger js-payment-status" data-id="' + esc(payment.id) + '" data-next-status="cancelled">Cancelar registro</button>';
      return '<article class="card payment-record"><div class="section-head"><div><p class="eyebrow">Código ' + esc(payment.id) + '</p><h3>Consulta de ' + esc(g.Core.dateLabel(appointment.date)) + '</h3></div><span class="status ' + statusClass + '">' + esc(paymentStatusLabel(payment.status)) + '</span></div><p>' + esc(appointment.time + ' · ' + (appointment.doctorName || 'Profissional')) + '</p>' + (isAdmin ? '<p class="muted">Paciente: ' + esc(appointment.patientName || 'Paciente') + '</p>' : '') + '<div class="card-actions"><span><strong>' + esc(paymentMoney(payment.amountCents)) + '</strong></span><span class="badge">' + esc(paymentMethodLabel(payment.method)) + '</span></div>' + (createdLabel ? '<p class="helper">Registro criado em ' + esc(createdLabel) + '</p>' : '') + (statusActions ? '<div class="stack-inline payment-actions">' + statusActions + '</div>' : '') + '</article>';
    }).filter(Boolean).join('');
    var emptyText = isAdmin ? 'Nenhum pagamento registrado. Selecione uma consulta para fazer o primeiro lançamento.' : 'Ainda não há pagamentos registrados para as suas consultas.';
    render(shell(heading('Pagamentos', isAdmin ? 'Controle de pagamentos' : 'Meus pagamentos', isAdmin ? 'Registre valores vinculados a consultas e acompanhe suas situações.' : 'Consulte os registros de pagamento associados às suas consultas.') + '<div class="notice warning"><span>Os valores e as situações exibidos são registros locais lançados manualmente; esta página não recebe nem processa dinheiro.</span></div>' + stats + formMarkup + '<section><div class="section-head"><div><p class="eyebrow">Histórico</p><h2>Pagamentos vinculados a consultas</h2></div></div><div class="result-grid payment-list">' + (cards || '<div class="empty-state">' + esc(emptyText) + '</div>') + '</div></section>'));
    var form = el('#paymentForm');
    runForm(form, function (data) {
      var amount = Number(formValue(data,'amount'));
      if (!Number.isFinite(amount) || amount <= 0 || Math.round(amount * 100) < 1) throw new Error('Informe um valor válido em reais.');
      return g.Core.createPayment({appointmentId:formValue(data,'appointmentId'),amountCents:Math.round(amount * 100),method:formValue(data,'method')}).then(function () { toast('Pagamento registrado como pendente. Nenhuma cobrança foi processada.'); renderPayments(); });
    });
    all('.js-payment-status').forEach(function (button) {
      button.addEventListener('click', function () {
        var next = button.dataset.nextStatus, cancelling = next === 'cancelled';
        confirmAction({title:cancelling ? 'Cancelar registro de pagamento?' : 'Registrar pagamento como pago?',message:cancelling ? 'O histórico ficará marcado como cancelado. Nenhum estorno ou cobrança será realizado.' : 'Esta ação apenas altera o registro local; não cobra nenhum método de pagamento.',confirmText:cancelling ? 'Cancelar registro' : 'Registrar como pago',onConfirm:function () { return g.Core.setPaymentStatus(button.dataset.id,next).then(function () { toast(cancelling ? 'Registro de pagamento cancelado.' : 'Pagamento registrado como pago.'); renderPayments(); }); }});
      });
    });
  }
  function handleDbUpdate() {
    var page = currentPage();
    if (page === 'paciente') renderPatient();
    if (page === 'admin') renderAdmin();
    if (page === 'pagamentos') renderPayments();
    if (page === 'medico') renderDoctor();
    if (page === 'medicos' && el('#doctorSearch')) {
      var selectors = ['#doctorSearch', '#doctorSpecialty', '#doctorMode'];
      var values = selectors.map(function (selector) { return el(selector).value; });
      renderMedicos();
      selectors.forEach(function (selector, index) { el(selector).value = values[index]; });
      el('#doctorSearch').dispatchEvent(new Event('input', {bubbles:true}));
    }
  }
  function renderPage() {
    var page = currentPage(); if (PAGE_NAMES.indexOf(page) < 0 || !el('#app')) return;
    if (page === 'agendamento') return; // agendamento.js owns this page
    if (page === 'pagamentos') return renderPayments();
    if (page === 'login') renderLogin(); else if (page === 'cadastro') renderCadastro(); else if (page === 'recovery') renderRecovery(); else if (page === 'confirmar') renderPendingConfirm(); else if (page === 'paciente') renderPatient(); else if (page === 'medico') renderDoctor(); else if (page === 'admin') renderAdmin(); else if (page === 'medicos') renderMedicos(); else if (page === 'perfil') renderPerfil(); else if (page === 'dados') renderDados();
  }
  function init() {
    if (initialized || !g.Core || !g.Core.ready) return; initialized = true;
    Promise.resolve(g.Core.ready).then(function () { renderPage(); }).catch(function () { renderPage(); });
    if (typeof g.addEventListener === 'function') { g.addEventListener('haname:db', handleDbUpdate); g.addEventListener('haname:session', renderPage); g.addEventListener('haname:warning', function (event) { toast(event.detail && event.detail.message ? event.detail.message : 'O armazenamento local está indisponível.', 'error'); }); }
  }
  if (typeof document !== 'undefined') { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init); else init(); }
  g.HanamePages = {init:init,render:renderPage,downloadICS:downloadICS};
}(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this)));
