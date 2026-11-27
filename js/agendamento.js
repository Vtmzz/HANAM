/* Scheduling page: availability is derived only from the local doctor catalog and appointments. */
(function (root) {
  'use strict';
  var g = root || (typeof globalThis !== 'undefined' ? globalThis : {});
  var state = {date:null,doctorId:null,time:null,specialty:'',initialized:false};
  function el(selector, parent) { return (parent || document).querySelector(selector); }
  function all(selector, parent) { return Array.prototype.slice.call((parent || document).querySelectorAll(selector)); }
  function esc(value) { return g.UI && typeof g.UI.esc === 'function' ? g.UI.esc(value == null ? '' : String(value)) : String(value == null ? '' : value).replace(/[&<>'"]/g,function(ch){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch];}); }
  function toast(message,type) { if (g.UI && typeof g.UI.toast === 'function') g.UI.toast(message,type || 'success'); else if (g.console) g.console.log(message); }
  function currentPage() { return document.body && (document.body.dataset.page || document.body.getAttribute('data-page')); }
  function addDays(iso, days) { var d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + days); return d.getFullYear() + '-' + ('0' + (d.getMonth()+1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function formatShort(iso) { return new Intl.DateTimeFormat('pt-BR',{weekday:'short',day:'2-digit',month:'short'}).format(new Date(iso+'T12:00:00')); }
  function formValue(data,key) { return data.get(key) == null ? '' : String(data.get(key)); }
  function queryDoctor() { try { return new URLSearchParams(g.location ? g.location.search : '').get('doctor'); } catch (e) { return null; } }
  function roleGuard() { var user = g.Core.user(); if (user && user.role === 'paciente') return user; var app = el('#app'); if (app) app.innerHTML = '<div class="container page-module"><div class="page-heading"><p class="eyebrow">Agendamento de consulta</p><h1>Entre como paciente</h1><p class="muted">A seleção de horário requer uma sessão de paciente.</p></div><a class="btn btn-primary" href="login.html">Ir para login</a></div>'; return null; }
  function dateCards() { var today = g.Core.today(); return Array.from({length:10},function(_,i){var iso=addDays(today,i);return '<button type="button" class="calendar-day ' + (state.date === iso ? 'selected' : '') + '" data-date="' + esc(iso) + '" aria-pressed="' + (state.date === iso ? 'true' : 'false') + '"><span>' + esc(formatShort(iso)) + '</span></button>';}).join(''); }
  function specialtyOptions() { return Array.from(new Set(g.Core.doctors().map(function(d){return d.specialty;}))).sort().map(function(s){return '<option value="'+esc(s)+'"'+(state.specialty===s?' selected':'')+'>'+esc(s)+'</option>';}).join(''); }
  function renderDoctors() {
    var doctors = g.Core.doctors().filter(function(d){return d.active && (!state.specialty || d.specialty === state.specialty);});
    if (!doctors.length) return '<div class="section-head"><h2>Médicos nesta data</h2><span class="pill">0 médicos com horários</span></div><div class="empty-state" role="status"><h3>Nenhum médico ativo</h3><p>Nenhum médico está ativo para os filtros escolhidos.</p></div>';
    var rows = doctors.map(function(d){ return {doctor:d,slots:g.Core.slots(d.id,state.date)}; }).sort(function(a,b){ return b.slots.length-a.slots.length || a.doctor.name.localeCompare(b.doctor.name); });
    var withAvailability = rows.filter(function(row){return row.slots.length > 0;}).length;
    var cards = rows.map(function(row){
      var d = row.doctor, slots = row.slots, selected = state.doctorId === d.id;
      var times = d.times.slice().sort(function(a,b){return (slots.indexOf(b)>=0)-(slots.indexOf(a)>=0) || a.localeCompare(b);}).map(function(time){var available = slots.indexOf(time) >= 0; return '<button type="button" class="slot '+(state.time===time && selected?'selected':'')+'" data-doctor="'+esc(d.id)+'" data-time="'+esc(time)+'" '+(available?'':'disabled aria-disabled="true"')+'>'+esc(time)+'</button>';}).join('');
      return '<article class="card doctor-schedule '+(selected?'selected':'')+'"><div class="section-head"><div><p class="eyebrow">'+esc(d.specialty)+'</p><h2>'+esc(d.name)+'</h2></div><div class="stack-inline"><span class="badge '+(slots.length?'badge-accent':'')+'">'+esc(slots.length === 1 ? '1 horário disponível' : slots.length+' horários disponíveis')+'</span><span class="badge">'+esc(d.mode)+'</span></div></div><p class="muted">'+esc(d.crm)+' · '+esc(d.description)+'</p><div class="slots" aria-label="Horários para '+esc(d.name)+'">'+times+'</div><p class="helper">Horários cinza estão ocupados, fora da agenda ou já passaram.</p></article>';
    }).join('');
    return '<div class="section-head"><h2>Médicos nesta data</h2><span class="pill">'+esc(withAvailability+' médico'+(withAvailability === 1 ? '' : 's')+' com horário'+(withAvailability === 1 ? '' : 's'))+'</span></div>' + (withAvailability ? '' : '<div class="empty-state" role="status"><h3>Sem disponibilidade nesta data</h3><p>Nenhum médico tem horário livre para os filtros escolhidos. Escolha outra data ou especialidade.</p></div>') + '<div class="result-grid">'+cards+'</div>';
  }
  function draw() {
    var target = el('#app'); if (!target) return;
    var user = roleGuard(); if (!user) return;
    if (!state.date) state.date = g.Core.get('scheduleDate',g.Core.today());
    if (!/^\d{4}-\d{2}-\d{2}$/.test(state.date) || state.date < g.Core.today() || new Date(state.date+'T12:00:00').getTime() > new Date(addDays(g.Core.today(),60)+'T12:00:00').getTime()) state.date = g.Core.today();
    if (!state.doctorId) state.doctorId = queryDoctor();
    if (state.doctorId && state.time && g.Core.slots(state.doctorId,state.date).indexOf(state.time) < 0) state.time = null;
    var maxDate = addDays(g.Core.today(),60);
    target.innerHTML = '<div class="container page-module"><div class="page-heading"><p class="eyebrow">Agendamento de consulta</p><h1>Escolha uma data e um horário</h1><p class="muted">Consulte os horários disponíveis e confirme qualquer consulta com a equipe responsável.</p></div><div class="panel calendar-panel"><div class="section-head"><h2>Próximos dez dias</h2><label class="field">Outra data<input id="scheduleDate" type="date" min="'+esc(g.Core.today())+'" max="'+esc(maxDate)+'" value="'+esc(state.date)+'" aria-label="Escolha uma data"></label></div><div class="calendar-days" role="list">'+dateCards()+'</div></div><div class="toolbar"><label class="field">Especialidade<select id="scheduleSpecialty"><option value="">Todas as especialidades</option>'+specialtyOptions()+'</select></label><p class="helper">'+esc(g.Core.dateLabel(state.date))+'</p></div><div id="scheduleDoctors">'+renderDoctors()+'</div><form class="panel form-grid" id="scheduleForm"><input type="hidden" name="doctorId" value="'+esc(state.doctorId || '')+'"><input type="hidden" name="time" value="'+esc(state.time || '')+'"><label class="field">Observação opcional<textarea name="notes" maxlength="1000" placeholder="Observação opcional para a equipe"></textarea></label><p id="scheduleSelection" class="status">'+(state.doctorId && state.time ? 'Selecionado: '+esc(state.time) : 'Selecione um médico e um horário ativo.')+'</p><button type="submit" class="btn btn-primary">Continuar para revisão</button></form></div>';
    bind();
  }
  function bind() {
    all('.calendar-day').forEach(function(button){button.addEventListener('click',function(){state.date=button.dataset.date; state.time=null; g.Core.set('scheduleDate',state.date); draw();});});
    var dateInput=el('#scheduleDate'); if(dateInput) dateInput.addEventListener('change',function(){if(dateInput.value){state.date=dateInput.value;state.time=null;g.Core.set('scheduleDate',state.date);draw();}});
    var specialty=el('#scheduleSpecialty'); if(specialty) specialty.addEventListener('change',function(){state.specialty=specialty.value;state.doctorId=null;state.time=null;draw();});
    all('.slot').forEach(function(button){button.addEventListener('click',function(){state.doctorId=button.dataset.doctor;state.time=button.dataset.time; var doctorField=el('[name="doctorId"]'),timeField=el('[name="time"]'); if(doctorField) doctorField.value=state.doctorId;if(timeField)timeField.value=state.time; all('.slot').forEach(function(slot){slot.classList.toggle('selected',slot===button);}); var status=el('#scheduleSelection'); if(status)status.textContent='Selecionado: '+state.time; all('.doctor-schedule').forEach(function(card){var firstSlot=card.querySelector('[data-doctor]');card.classList.toggle('selected',!!firstSlot && firstSlot.getAttribute('data-doctor')===state.doctorId);});});});
    var form=el('#scheduleForm'); if(form) form.addEventListener('submit',function(event){event.preventDefault();var data=new FormData(form),doctorId=formValue(data,'doctorId'),time=formValue(data,'time');if(!doctorId||!time){toast('Escolha um horário disponível.','error');return;}var available=g.Core.slots(doctorId,state.date);if(available.indexOf(time)<0){toast('Esse horário acabou de ficar indisponível.','error');draw();return;}g.Core.set('pendingBooking',{doctorId:doctorId,date:state.date,time:time,notes:formValue(data,'notes')});if(g.location&&typeof g.location.assign==='function')g.location.assign('confirmar.html');});
  }
  function init() { if(state.initialized || !g.Core || !g.Core.ready || currentPage()!=='agendamento') return; state.initialized=true; Promise.resolve(g.Core.ready).then(draw).catch(draw); }
  g.AgendamentoPage={init:init,render:draw};
  if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();}
  if(typeof g.addEventListener==='function')g.addEventListener('haname:db',function(){if(currentPage()==='agendamento' && state.initialized)draw();});
}(typeof window!=='undefined'?window:(typeof globalThis!=='undefined'?globalThis:this)));
