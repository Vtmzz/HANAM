/* Haname local data layer. This is not a clinical backend. */
(function (root) {
  'use strict';

  var g = root || (typeof globalThis !== 'undefined' ? globalThis : {});
  var TABLES = ['users', 'doctors', 'appointments', 'favorites', 'messages', 'payments'];
  var TABLE_FILES = {
    users: 'data/users.json',
    doctors: 'data/doctors.json',
    appointments: 'data/appointments.json',
    favorites: 'data/favorites.json',
    messages: 'data/messages.json',
    payments: 'data/payments.json'
  };
  var STORAGE_PREFIX = 'haname:';
  var memory = Object.create(null);
  var table = Object.create(null);
  var storageAvailable = false;
  var storageWarningShown = false;
  var localLock = Promise.resolve();
  var activeUser = null;
  var initialized = false;
  var apiSnapshot = null;
  var apiConnected = false;
  var apiSaveQueue = Promise.resolve();
  var apiEndpointDefault = 'data/store.php';

  var fallbackDoctors = [
    {id:'d1',name:'Dra. Ana Beatriz Souza',specialty:'Cardiologia',crm:'CRM 10001-SP',days:[1,3,5],times:['09:00','10:30','13:30','15:00'],mode:'Presencial',description:'Atuação em cardiologia preventiva.',active:true},
    {id:'d2',name:'Dr. Carlos Eduardo Mendes',specialty:'Cardiologia',crm:'CRM 10002-SP',days:[2,4,6],times:['08:30','10:00','14:00','16:00'],mode:'Teleorientação',description:'Acompanhamento em cardiologia clínica.',active:true},
    {id:'d3',name:'Dra. Helena Martins',specialty:'Dermatologia',crm:'CRM 10003-RJ',days:[1,2,4],times:['09:00','11:00','14:00','16:00'],mode:'Presencial',description:'Cuidados dermatológicos e saúde da pele.',active:true},
    {id:'d4',name:'Dr. Rafael Oliveira',specialty:'Dermatologia',crm:'CRM 10004-MG',days:[3,5,6],times:['08:00','10:00','13:00','15:30'],mode:'Teleorientação',description:'Atuação em dermatologia clínica.',active:true},
    {id:'d5',name:'Dra. Juliana Costa',specialty:'Clínica Geral',crm:'CRM 10005-BA',days:[1,2,3,4,5],times:['08:00','09:30','13:00','16:00'],mode:'Presencial',description:'Atendimento geral e cuidado integral.',active:true},
    {id:'d6',name:'Dr. Marcelo Almeida',specialty:'Clínica Geral',crm:'CRM 10006-PR',days:[2,4,5,6],times:['09:00','10:30','14:30','17:00'],mode:'Presencial',description:'Atendimento em clínica geral.',active:true},
    {id:'d7',name:'Dra. Beatriz Nunes',specialty:'Pediatria',crm:'CRM 10007-RS',days:[1,3,5],times:['09:00','10:00','14:00','15:00'],mode:'Presencial',description:'Pediatria e acompanhamento da saúde infantil.',active:true},
    {id:'d8',name:'Dr. Tiago Ferreira',specialty:'Pediatria',crm:'CRM 10008-SC',days:[2,4,6],times:['08:30','10:30','13:30','16:30'],mode:'Teleorientação',description:'Atuação em pediatria clínica.',active:true},
    {id:'d9',name:'Dra. Camila Ribeiro',specialty:'Ortopedia',crm:'CRM 10009-PE',days:[1,4,6],times:['08:00','10:00','14:00','16:00'],mode:'Presencial',description:'Ortopedia e saúde musculoesquelética.',active:true},
    {id:'d10',name:'Dr. André Barros',specialty:'Ortopedia',crm:'CRM 10010-CE',days:[2,3,5],times:['09:00','11:00','13:30','15:30'],mode:'Presencial',description:'Acompanhamento ortopédico.',active:true},
    {id:'d11',name:'Dra. Lívia Gomes',specialty:'Nutrição',crm:'CRN 20001-SP',days:[1,3,5],times:['09:30','11:00','14:30','16:00'],mode:'Teleorientação',description:'Nutrição e orientação alimentar.',active:true},
    {id:'d12',name:'Dr. Pedro Lima',specialty:'Nutrição',crm:'CRN 20002-RJ',days:[2,4,6],times:['08:30','10:30','13:00','15:00'],mode:'Presencial',description:'Orientação nutricional personalizada.',active:true}
  ];
  var fallbackUsers = [
    {id:'u-admin',email:'admin@haname.com',name:'Admin Haname',role:'admin',passwordHash:{algorithm:'PBKDF2',hash:'SHA-256',iterations:120000,salt:'aGFuYW1lLWFkbWluLXYx',digest:'he99Nxs3SfcM0EBaqOCCCJ+lN0s77LKtUteOwwooHWI='}},
    {id:'u-medico',email:'medico@haname.com',name:'Dr. Carlos Eduardo Mendes',role:'medico',doctorId:'d2',passwordHash:{algorithm:'PBKDF2',hash:'SHA-256',iterations:120000,salt:'aGFuYW1lLW1lZGljby12MQ==',digest:'MwxvmaebcXFjr63j6irxYbUCV9a/9Y1wpfPHqH+2lCs='}},
    {id:'u-paciente',email:'paciente@haname.com',name:'Pessoa Paciente',role:'paciente',birthDate:'1990-01-01',passwordHash:{algorithm:'PBKDF2',hash:'SHA-256',iterations:120000,salt:'aGFuYW1lLXBhY2llbnRlLXYx',digest:'kXx5NbF9bTkfPvcAbnNKb+B1wjfSST7ZnQUkhu8tg20='}}
  ];
  var defaults = {users:fallbackUsers, doctors:fallbackDoctors, appointments:[], favorites:[], messages:[], payments:[]};

  function clone(value) {
    if (value === undefined) return undefined;
    try { return JSON.parse(JSON.stringify(value)); } catch (e) { return value; }
  }
  function warn(message) {
    if (g.console && typeof g.console.warn === 'function') g.console.warn('[Haname] ' + message);
    if (!storageWarningShown && typeof document !== 'undefined') {
      storageWarningShown = true;
      setTimeout(function () { dispatch('haname:warning', {message:message}); }, 0);
    }
  }
  function dispatch(name, detail) {
    try {
      if (typeof g.dispatchEvent === 'function') {
        var event;
        if (typeof g.CustomEvent === 'function') event = new g.CustomEvent(name, {detail:detail || {}});
        else if (typeof document !== 'undefined' && document.createEvent) { event = document.createEvent('CustomEvent'); event.initCustomEvent(name, false, false, detail || {}); }
        if (event) g.dispatchEvent(event);
      }
    } catch (e) { /* event support is optional in tests */ }
  }
  function getStorage() {
    try {
      if (g.localStorage) {
        var key = '__haname_probe__';
        g.localStorage.setItem(key, '1');
        g.localStorage.removeItem(key);
        storageAvailable = true;
        return g.localStorage;
      }
    } catch (e) {
      storageAvailable = false;
      warn('o armazenamento local não está disponível; a sessão será temporária neste contexto.');
    }
    if (!storageAvailable) warn('o armazenamento local não está disponível; os dados ficarão apenas na memória deste contexto.');
    return null;
  }
  var storage = getStorage();
  function storageGet(key) {
    try { return storage ? storage.getItem(key) : (Object.prototype.hasOwnProperty.call(memory, key) ? memory[key] : null); }
    catch (e) { warn('não foi possível ler o armazenamento local.'); return null; }
  }
  function storageSet(key, value) {
    var text = typeof value === 'string' ? value : JSON.stringify(value);
    try {
      if (storage) {
        storage.setItem(key, text);
        storageAvailable = true;
      } else memory[key] = text;
      return true;
    } catch (e) {
      storageAvailable = false;
      warn('não foi possível salvar os dados locais; a operação não foi confirmada. Verifique o espaço e as permissões.');
      return false;
    }
  }
  function storageRemove(key) {
    try { if (storage) storage.removeItem(key); else delete memory[key]; return true; } catch (e) { warn('não foi possível limpar os dados locais.'); return false; }
  }
  function parseStored(key) {
    var value = storageGet(key);
    if (!value) return {found:false, value:null};
    try { return {found:true, value:JSON.parse(value)}; }
    catch (e) { warn('dados inválidos foram limpos: ' + key); storageRemove(key); return {found:false, value:null}; }
  }
  function arrayFrom(value, property) {
    if (Array.isArray(value)) return value;
    if (value && Array.isArray(value[property])) return value[property];
    if (value && typeof value === 'object' && (value.email || value.date || value.appointmentId || value.patientEmail || value.patientName || value.data || value.hora || value.especialidade || value.obs)) return [value];
    if (value && typeof value === 'object') return Object.keys(value).map(function (k) { return value[k]; });
    return [];
  }
  function id(prefix) {
    var random = Array.prototype.map.call(randomBytes(8), function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
    return prefix + '-' + Date.now().toString(36) + '-' + random;
  }
  function base64(bytes) {
    var str = '';
    for (var i = 0; i < bytes.length; i += 1) str += String.fromCharCode(bytes[i]);
    if (typeof btoa === 'function') return btoa(str);
    if (typeof Buffer !== 'undefined') return Buffer.from(str, 'binary').toString('base64');
    return str;
  }
  function bytesFromBase64(value) {
    var str;
    if (typeof atob === 'function') str = atob(value);
    else if (typeof Buffer !== 'undefined') str = Buffer.from(value, 'base64').toString('binary');
    else str = value || '';
    var out = new Uint8Array(str.length);
    for (var i = 0; i < str.length; i += 1) out[i] = str.charCodeAt(i);
    return out;
  }
  function randomBytes(count) {
    var out = new Uint8Array(count);
    try {
      var c = g.crypto || (typeof crypto !== 'undefined' ? crypto : null);
      if (c && c.getRandomValues) return c.getRandomValues(out);
    } catch (e) { /* fallback below */ }
    for (var i = 0; i < count; i += 1) out[i] = Math.floor(Math.random() * 256);
    return out;
  }
  function cryptoSubtle() {
    try { var c = g.crypto || (typeof crypto !== 'undefined' ? crypto : null); return c && c.subtle ? c.subtle : null; } catch (e) { return null; }
  }
  function cryptoRequired() {
    var subtle = cryptoSubtle();
    if (!subtle) throw new Error('A autenticação local exige Web Crypto em HTTPS ou em localhost.');
    return subtle;
  }
  async function hashPassword(password) {
    var subtle = cryptoRequired();
    var salt = randomBytes(16);
    var iterations = 120000;
    var enc = new TextEncoder();
    var key = await subtle.importKey('raw', enc.encode(String(password)), {name:'PBKDF2'}, false, ['deriveBits']);
    var bits = await subtle.deriveBits({name:'PBKDF2',salt:salt,iterations:iterations,hash:'SHA-256'}, key, 256);
    return {algorithm:'PBKDF2',hash:'SHA-256',iterations:iterations,salt:base64(new Uint8Array(salt)),digest:base64(new Uint8Array(bits))};
  }
  function constantTime(a, b) {
    a = String(a || ''); b = String(b || '');
    var mismatch = a.length ^ b.length;
    var n = Math.max(a.length, b.length);
    for (var i = 0; i < n; i += 1) mismatch |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
    return mismatch === 0;
  }
  async function verifyPassword(password, record) {
    if (!record || !record.digest) return false;
    if (record.algorithm !== 'PBKDF2') return false;
    var subtle = cryptoRequired();
    try {
      var enc = new TextEncoder();
      var key = await subtle.importKey('raw', enc.encode(String(password)), {name:'PBKDF2'}, false, ['deriveBits']);
      var bits = await subtle.deriveBits({name:'PBKDF2',salt:bytesFromBase64(record.salt),iterations:Number(record.iterations) || 120000,hash:'SHA-256'}, key, 256);
      return constantTime(base64(new Uint8Array(bits)), record.digest);
    } catch (e) { return false; }
  }
  function publicUser(user) {
    if (!user) return null;
    var safe = clone(user) || {};
    delete safe.passwordHash; delete safe.password; delete safe.pass; delete safe.recoveryHash; delete safe.recoveryCode;
    return safe;
  }
  function cleanUser(user) {
    var out = clone(user) || {};
    out.id = String(out.id || id('user'));
    out.email = String(out.email || '').trim().toLowerCase();
    out.name = String(out.name || '').trim();
    out.role = ['paciente','medico','admin'].indexOf(out.role) >= 0 ? out.role : 'paciente';
    if (out.doctorId) out.doctorId = String(out.doctorId);
    ['phone','ddd','cep','endereco','birthDate','city','state'].forEach(function (key) { if (out[key] !== undefined) out[key] = String(out[key]).trim().slice(0,160); });
    delete out.password; delete out.pass;
    return out;
  }
  function cleanDoctor(doctor) {
    var d = clone(doctor) || {};
    d.id = String(d.id || id('doctor')); d.name = String(d.name || 'Médico');
    d.specialty = String(d.specialty || 'Clínica Geral'); d.crm = String(d.crm || '');
    d.days = Array.isArray(d.days) ? d.days.map(Number).filter(function (x) { return x >= 1 && x <= 6; }) : [];
    d.times = Array.isArray(d.times) ? d.times.map(String).filter(function (x) { return /^([01]\d|2[0-3]):[0-5]\d$/.test(x); }) : [];
    d.active = d.active !== false; d.mode = String(d.mode || 'Presencial'); d.description = String(d.description || '');
    return d;
  }
  function migrateDoctorCopy(raw) {
    var changed = false;
    var doctors = arrayFrom(raw, 'doctors').map(function (record) {
      var doctor = cleanDoctor(record);
      if (/(educacional|simulad|demonstrativ)/i.test(doctor.description)) {
        var seed = fallbackDoctors.find(function (candidate) { return candidate.id === doctor.id; });
        if (seed) { doctor.description = seed.description; changed = true; }
      }
      return doctor;
    });
    return {doctors:doctors,changed:changed};
  }
  function cleanMedicalReport(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    var report = {
      symptoms:String(value.symptoms || '').trim().slice(0,3000),
      signs:String(value.signs || '').trim().slice(0,3000),
      possibleDiagnosis:String(value.possibleDiagnosis || '').trim().slice(0,1500),
      prescription:String(value.prescription || '').trim().slice(0,3000),
      doctorId:String(value.doctorId || '').slice(0,160),
      doctorName:String(value.doctorName || '').slice(0,160),
      createdAt:String(value.createdAt || '').slice(0,40)
    };
    if (!report.symptoms && !report.signs && !report.possibleDiagnosis && !report.prescription) return null;
    return report;
  }
  function validateMedicalReport(value, doctor) {
    value = value || {};
    var fields = {
      symptoms:String(value.symptoms || '').trim(),
      signs:String(value.signs || '').trim(),
      possibleDiagnosis:String(value.possibleDiagnosis || '').trim(),
      prescription:String(value.prescription || '').trim()
    };
    if (!fields.symptoms || !fields.signs || !fields.possibleDiagnosis || !fields.prescription) throw new Error('Preencha todos os campos do relatório. Se não houver medicamento, registre “Sem prescrição”.');
    if (fields.symptoms.length > 3000 || fields.signs.length > 3000 || fields.possibleDiagnosis.length > 1500 || fields.prescription.length > 3000) throw new Error('Um dos campos do relatório excede o limite permitido.');
    return {symptoms:fields.symptoms,signs:fields.signs,possibleDiagnosis:fields.possibleDiagnosis,prescription:fields.prescription,doctorId:doctor.id,doctorName:doctor.name,createdAt:new Date().toISOString()};
  }
  function ensureTestAppointment() {
    var fixtureId = 'apt-test-2026-11-01';
    var patient = (table.users || []).find(function (item) { return item.id === 'u-paciente' || item.email === 'paciente@haname.com'; });
    var doctor = (table.doctors || []).find(function (item) { return item.id === 'd2'; });
    if (!patient || !doctor) return false;
    var appointment = (table.appointments || []).find(function (item) { return item.id === fixtureId; }) || (table.appointments || []).find(function (item) { return item.userId === patient.id && item.doctorId === doctor.id && item.date === '2026-11-01' && item.time === '10:00'; });
    if (!appointment) {
      appointment = {id:fixtureId,userId:patient.id,patientEmail:patient.email,patientName:patient.name,doctorId:doctor.id,doctorName:doctor.name,specialty:doctor.specialty,date:'2026-11-01',time:'10:00',notes:'Consulta de teste para experimentar a conclusão e o relatório médico.',status:'confirmed',testFixture:true};
      table.appointments.push(appointment);
      return true;
    }
    var changed = false;
    function set(key, value) { if (appointment[key] !== value) { appointment[key] = value; changed = true; } }
    set('userId',patient.id); set('patientEmail',patient.email); set('patientName',patient.name);
    set('doctorId',doctor.id); set('doctorName',doctor.name); set('specialty',doctor.specialty);
    set('date','2026-11-01'); set('time','10:00'); set('testFixture',true);
    if (!appointment.notes) set('notes','Consulta de teste para experimentar a conclusão e o relatório médico.');
    var expectedStatus = appointment.report ? 'completed' : 'confirmed';
    set('status',expectedStatus);
    return changed;
  }
  function visibleAppointments() {
    if (!activeUser) return [];
    var all = table.appointments || [];
    if (activeUser.role === 'admin') return clone(all);
    if (activeUser.role === 'medico') return clone(all.filter(function (item) { return item.doctorId === activeUser.doctorId; }));
    return clone(all.filter(function (item) { return item.userId === activeUser.id || (item.legacy && item.patientEmail === activeUser.email); }));
  }
  function cleanPayment(value) {
    var raw = clone(value) || {}, method = String(raw.method || ''), status = String(raw.status || 'pending');
    var amountCents = Number(raw.amountCents), methods = ['pix','cartao','dinheiro','transferencia','outro'];
    if (!Number.isSafeInteger(amountCents) || amountCents < 1 || amountCents > 100000000 || methods.indexOf(method) < 0 || ['pending','paid','cancelled'].indexOf(status) < 0) return null;
    var appointmentId = String(raw.appointmentId || raw.consultationId || '');
    if (!appointmentId) return null;
    var payment = {id:String(raw.id || id('pag')),appointmentId:appointmentId,amountCents:amountCents,method:method,status:status,createdAt:String(raw.createdAt || new Date().toISOString()).slice(0,40)};
    if (raw.updatedAt) payment.updatedAt = String(raw.updatedAt).slice(0,40);
    return payment;
  }
  function uniquePayments(raw) {
    var seen = Object.create(null);
    return arrayFrom(raw, 'payments').map(cleanPayment).filter(function (payment) {
      if (!payment || seen[payment.id] || !(table.appointments || []).some(function (appointment) { return appointment.id === payment.appointmentId; })) return false;
      seen[payment.id] = true; return true;
    });
  }
  function visiblePayments() {
    if (!activeUser || (activeUser.role !== 'admin' && activeUser.role !== 'paciente')) return [];
    var appointmentIds = Object.create(null);
    visibleAppointments().forEach(function (appointment) { appointmentIds[appointment.id] = true; });
    return clone((table.payments || []).filter(function (payment) { return !!appointmentIds[payment.appointmentId]; }));
  }
  function visibleRows(name) {
    if (name === 'appointments') return visibleAppointments();
    if (name === 'payments') return visiblePayments();
    if (name === 'users' && activeUser && activeUser.role !== 'admin') return activeUser ? [publicUser(activeUser)] : [];
    return clone(table[name] || []);
  }
  function cleanAppointment(a) {
    var raw = clone(a) || {}, x = raw;
    var hadStatus = raw.status !== undefined && raw.status !== null && raw.status !== '';
    x.id = String(x.id || id('apt')); x.status = ['confirmed','cancelled','completed'].indexOf(x.status) >= 0 ? x.status : 'confirmed';
    x.date = String(x.date || x.data || ''); x.time = String(x.time || x.hora || '');
    x.userId = String(x.userId || x.patientId || (x.patient && x.patient.id) || '');
    x.patientName = String(x.patientName || (x.patient && x.patient.name) || '');
    x.doctorId = String(x.doctorId || x.medicoId || (x.doctor && x.doctor.id) || '');
    x.doctorName = String(x.doctorName || (x.doctor && x.doctor.name) || x.medicoNome || '');
    x.specialty = String(x.specialty || x.especialidade || (x.doctor && x.doctor.specialty) || ''); x.notes = String(x.notes || x.obs || '').slice(0, 1000);
    x.patientEmail = String(x.patientEmail || x.email || '').trim().toLowerCase();
    x.report = cleanMedicalReport(x.report);
    if (!x.doctorId && (x.patientEmail || x.patientName || x.specialty || x.date || x.time)) {
      var legacyUser = x.patientEmail && table.users && table.users.find(function (user) { return user.email === x.patientEmail; });
      x.userId = legacyUser ? legacyUser.id : (x.patientEmail ? 'legacy:' + x.patientEmail : 'legacy:' + x.id);
      x.doctorName = 'Registro legado';
      x.status = x.status === 'confirmed' && !hadStatus ? 'completed' : x.status;
      x.legacy = true;
      if (!x.date || !/^([01]\d|2[0-3]):[0-5]\d$/.test(x.time)) return null;
      return {id:x.id,userId:x.userId,patientEmail:x.patientEmail,patientName:x.patientName,doctorId:'',doctorName:x.doctorName,specialty:x.specialty,date:x.date,time:x.time,notes:x.notes,status:x.status,legacy:true};
    }
    if (!x.userId || !x.doctorId || !isoValid(x.date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(x.time)) return null;
    var result = {id:x.id,userId:x.userId,patientEmail:x.patientEmail,patientName:x.patientName,doctorId:x.doctorId,doctorName:x.doctorName,specialty:x.specialty,date:x.date,time:x.time,notes:x.notes,status:x.status};
    if (x.report) result.report = x.report;
    if (x.testFixture) result.testFixture = true;
    return result;
  }
  function legacyTable(tableName) {
    var key = tableName === 'users' ? 'users_db' : (tableName === 'appointments' ? 'appointments_db' : null);
    if (!key) return {found:false,value:null};
    var result = parseStored(key);
    if (result.found) { storageRemove(key); return result; }
    return {found:false,value:null};
  }
  function apiEndpoint() {
    return apiEndpointDefault;
  }
  function apiUrl(endpoint) {
    if (!g.location || !g.location.href || typeof URL === 'undefined') throw new Error('A conexão local exige que o site seja aberto por HTTP.');
    var parsed = new URL(String(endpoint || apiEndpointDefault), g.location.href);
    var origin = g.location.origin || new URL(g.location.href).origin;
    if (parsed.origin !== origin) throw new Error('Por segurança, a conexão precisa usar a mesma origem do site.');
    return parsed.toString();
  }
  function localHost() {
    var hostname = g.location && String(g.location.hostname || '').toLowerCase();
    return hostname === 'localhost';
  }
  function apiStatus() {
    return {connected:apiConnected,mode:apiConnected ? 'local-json' : (storageAvailable ? 'localStorage' : 'memory'),endpoint:apiEndpoint()};
  }
  function dispatchApi() { dispatch('haname:api', apiStatus()); }
  async function requestApiState(endpoint) {
    if (!g.fetch) throw new Error('Não foi possível carregar os dados locais.');
    var response = await g.fetch(apiUrl(endpoint), {method:'GET',cache:'no-store',headers:{Accept:'application/json'}});
    if (!response || !response.ok) throw new Error('O armazenamento deste computador não respondeu.');
    var payload = await response.json();
    if (!payload || payload.ok !== true || !payload.data || typeof payload.data !== 'object') throw new Error('Não foi possível ler o arquivo de dados local.');
    return payload;
  }
  function apiPreferences() {
    var result = {};
    var prefix = STORAGE_PREFIX + 'pref:';
    var keys = [];
    try {
      if (storage) {
        for (var i = 0; i < storage.length; i += 1) keys.push(storage.key(i));
      } else Object.keys(memory).forEach(function (key) { keys.push(key); });
    } catch (e) { return result; }
    keys.forEach(function (key) {
      if (!key || key.indexOf(prefix) !== 0) return;
      var name = key.slice(prefix.length);
      if (name === 'apiEndpoint' || name === 'apiDisabled') return;
      var raw = storageGet(key);
      if (raw === null) return;
      try { result[name] = JSON.parse(raw); } catch (e) { result[name] = raw; }
    });
    return result;
  }
  function applyApiPreferences(snapshot) {
    var preferences = snapshot && snapshot.initialized && snapshot.data && snapshot.data.preferences;
    if (!preferences || typeof preferences !== 'object' || Array.isArray(preferences)) return;
    Object.keys(preferences).forEach(function (name) {
      if (name === 'apiEndpoint' || name === 'apiDisabled') return;
      storageSet(STORAGE_PREFIX + 'pref:' + name, preferences[name]);
    });
  }
  function databaseSnapshot() {
    var data = {};
    TABLES.forEach(function (name) { data[name] = clone(table[name] || []); });
    data.preferences = apiPreferences();
    return {version:1,updatedAt:new Date().toISOString(),data:data};
  }
  function pushApiState() {
    if (!apiConnected || !g.fetch) return Promise.resolve(false);
    var body = JSON.stringify(databaseSnapshot());
    apiSaveQueue = apiSaveQueue.catch(function () { return false; }).then(function () {
      return g.fetch(apiUrl(apiEndpoint()), {method:'PUT',cache:'no-store',headers:{'Content-Type':'application/json',Accept:'application/json'},body:body});
    }).then(function (response) {
      if (!response || !response.ok) throw new Error('Não foi possível salvar os dados. Verifique a instalação e as permissões.');
      return response.json();
    }).then(function (payload) {
      if (!payload || payload.ok !== true) throw new Error('A gravação foi recusada. Verifique as permissões do armazenamento.');
      apiSnapshot = {initialized:true,data:databaseSnapshot().data}; apiConnected = true; dispatchApi(); return true;
    }).catch(function (error) {
      apiConnected = false; warn(error.message || 'Não foi possível salvar os dados. Verifique a conexão local e atualize a página.'); dispatchApi(); return false;
    });
    return apiSaveQueue;
  }
  async function connectApi(endpoint, importServer) {
    endpoint = String(endpoint || apiEndpointDefault).trim();
    var parsedUrl = apiUrl(endpoint);
    endpoint = parsedUrl;
    if (!storageSet(STORAGE_PREFIX + 'pref:apiEndpoint', endpoint)) throw storageFailure();
    storageSet(STORAGE_PREFIX + 'pref:apiDisabled', false);
    try {
      var remote = await requestApiState(endpoint);
      apiSnapshot = remote; apiConnected = true;
      if (remote.initialized && remote.data) {
        applyApiPreferences(remote);
        TABLES.forEach(function (name) {
          if (!Array.isArray(remote.data[name])) return;
          if (name === 'users') table.users = migrateUserRecords(remote.data[name], false);
          else if (name === 'doctors') table.doctors = remote.data[name].map(cleanDoctor);
          else if (name === 'appointments') table.appointments = uniqueAppointments(remote.data[name]);
          else if (name === 'payments') table.payments = uniquePayments(remote.data[name]);
          else table[name] = arrayFrom(remote.data[name], name);
          storageSet(STORAGE_PREFIX + name, table[name]);
        });
        loadSession();
        dispatch('haname:db', {remote:true,ready:true});
        dispatch('haname:session', {user:publicUser(activeUser),remote:true});
      } else if (importServer !== true) {
        await pushApiState();
      }
      dispatchApi();
      return apiStatus();
    } catch (error) {
      apiConnected = false; apiSnapshot = null; dispatchApi();
      throw new Error('Apache/PHP indisponível neste endereço; os dados continuam salvos localmente. ' + (error && error.message ? error.message : ''));
    }
  }
  async function loadLocalApi() {
    if (!localHost()) { apiConnected = false; dispatchApi(); return false; }
    storageSet(STORAGE_PREFIX + 'pref:apiDisabled', false);
    try {
      apiSnapshot = await requestApiState(apiEndpointDefault); apiConnected = true; applyApiPreferences(apiSnapshot); dispatchApi(); return true;
    } catch (error) { apiConnected = false; apiSnapshot = null; dispatchApi(); return false; }
  }
  async function sourceTable(name) {
    if (apiConnected && apiSnapshot && apiSnapshot.initialized && apiSnapshot.data && Array.isArray(apiSnapshot.data[name])) return apiSnapshot.data[name];
    var current = parseStored(STORAGE_PREFIX + name);
    var legacy = legacyTable(name);
    if (current.found) {
      if (legacy.found) return name === 'users' ? [current.value, legacy.value] : arrayFrom(current.value, name).concat(arrayFrom(legacy.value, name));
      return current.value;
    }
    if (legacy.found) return legacy.value;
    if (g.HANAME_SEED && g.HANAME_SEED.source === 'github-pages-demo') return clone(defaults[name]);
    try {
      if (typeof g.fetch === 'function') {
        var response = await g.fetch(TABLE_FILES[name], {cache:'no-store'});
        if (response && response.ok !== false && typeof response.json === 'function') return await response.json();
      }
    } catch (e) { warn('falha ao carregar ' + name + '.json; usando seed local.'); }
    return clone(defaults[name]);
  }
  function isoValid(value) {
    var text = String(value || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
    var parts = text.split('-').map(Number);
    var date = new Date(text + 'T12:00:00');
    return !isNaN(date.getTime()) && date.getFullYear() === parts[0] && date.getMonth() + 1 === parts[1] && date.getDate() === parts[2];
  }
  function dayDiff(a, b) { return Math.round((new Date(a + 'T12:00:00').getTime() - new Date(b + 'T12:00:00').getTime()) / 86400000); }
  function today() {
    var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }
  function dateLabel(iso) {
    if (!isoValid(iso)) return 'Data inválida';
    return new Intl.DateTimeFormat('pt-BR', {dateStyle:'full'}).format(new Date(iso + 'T12:00:00'));
  }
  function findDoctor(doctorId) { return table.doctors.find(function (d) { return d.id === String(doctorId); }) || null; }
  function isBookableDate(date) { return isoValid(date) && dayDiff(date, today()) >= 0 && dayDiff(date, today()) <= 60; }
  function clockMinutes(value) { var p = String(value).split(':'); return Number(p[0]) * 60 + Number(p[1]); }
  function nowMinutes() { var d = new Date(); return d.getHours() * 60 + d.getMinutes(); }
  function occupiesSlot(appointment) { return appointment && (appointment.status === 'confirmed' || appointment.status === 'completed'); }
  function isTimeAllowed(doctor, date, time, ignoreId) {
    if (!doctor || !isBookableDate(date) || doctor.days.indexOf(new Date(date + 'T12:00:00').getDay()) < 0 || doctor.times.indexOf(time) < 0) return false;
    if (date === today() && clockMinutes(time) <= nowMinutes()) return false;
    return !table.appointments.some(function (a) { return a.id !== ignoreId && occupiesSlot(a) && a.doctorId === doctor.id && a.date === date && a.time === time; });
  }
  function patientConflict(userId, date, time, ignoreId) {
    return table.appointments.some(function (a) { return a.id !== ignoreId && a.status === 'confirmed' && a.userId === userId && a.date === date && a.time === time; });
  }
  function storageFailure() { return new Error('Não foi possível persistir os dados locais. A operação não foi confirmada.'); }
  function saveTable(name) {
    if (!storageSet(STORAGE_PREFIX + name, table[name])) throw storageFailure();
    dispatch('haname:db', {table:name});
    if (apiConnected) pushApiState();
  }
  function writeTable(name, data) {
    if (TABLES.indexOf(name) < 0) throw new Error('Tabela desconhecida.');
    var previous = clone(table[name]);
    var raw = Array.isArray(data) ? data : [];
    try {
      if (name === 'users') {
        var seenUsers = Object.create(null);
        table[name] = raw.map(cleanUser).filter(function (user) { if (!user.email || seenUsers[user.email]) return false; seenUsers[user.email] = true; return true; });
      } else if (name === 'doctors') table[name] = raw.map(cleanDoctor);
      else if (name === 'appointments') table[name] = uniqueAppointments(raw);
      else if (name === 'payments') table[name] = uniquePayments(raw);
      else table[name] = clone(raw);
      saveTable(name); return clone(table[name]);
    } catch (error) { table[name] = previous; throw error; }
  }
  function withLocalLock(task) {
    var previous = localLock;
    var release;
    localLock = new Promise(function (resolve) { release = resolve; });
    return previous.then(task).then(function (result) { release(); return result; }, function (error) { release(); throw error; });
  }
  function withLock(task) {
    try {
      if (g.navigator && g.navigator.locks && typeof g.navigator.locks.request === 'function') return g.navigator.locks.request('haname-appointments', task);
    } catch (e) { /* local fallback */ }
    return withLocalLock(task);
  }
  function refreshTable(name) {
    var parsed = parseStored(STORAGE_PREFIX + name);
    if (!parsed.found) return;
    if (name === 'users') table.users = migrateUserRecords(parsed.value, false);
    else if (name === 'doctors') table.doctors = arrayFrom(parsed.value, 'doctors').map(cleanDoctor);
    else if (name === 'appointments') table.appointments = uniqueAppointments(parsed.value);
    else if (TABLES.indexOf(name) >= 0) table[name] = arrayFrom(parsed.value, name);
  }
  function refreshTransactionState() {
    refreshTable('users'); refreshTable('doctors'); refreshTable('appointments'); refreshTable('payments'); loadSession(false);
  }
  function assertAuth(role) {
    if (!activeUser) throw new Error('É necessário entrar para continuar.');
    if (role && activeUser.role !== role) throw new Error('Esta ação não está disponível para este perfil.');
  }
  function isAdultDate(value) {
    var text = String(value || ''), match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
    if (!match) return false;
    var year = Number(match[1]), month = Number(match[2]), day = Number(match[3]);
    var date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return false;
    var now = new Date(), age = now.getFullYear() - year;
    if (now.getMonth() + 1 < month || (now.getMonth() + 1 === month && now.getDate() < day)) age--;
    return age >= 18;
  }
  function validateCredentials(email, password) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim())) throw new Error('Informe um e-mail válido.');
    if (String(password || '').length < 6) throw new Error('A senha deve ter pelo menos 6 caracteres.');
  }
  function pendingByUser(userId, date, time, ignoreId) { return patientConflict(userId, date, time, ignoreId); }
  function bookingData(input, userId, ignoreId) {
    var doctor = findDoctor(input.doctorId);
    if (!doctor || !doctor.active) throw new Error('Médico indisponível para novos agendamentos.');
    var date = String(input.date || ''), time = String(input.time || '');
    if (!isBookableDate(date)) throw new Error('Escolha uma data entre hoje e os próximos 60 dias.');
    if (!isTimeAllowed(doctor, date, time, ignoreId)) throw new Error('Esse horário não está mais disponível.');
    if (pendingByUser(userId, date, time, ignoreId)) throw new Error('Você já possui uma consulta nesse horário.');
    return {doctor:doctor,date:date,time:time,notes:String(input.notes || '').trim().slice(0,1000)};
  }
  function loadSession(persist) {
    var session = parseStored(STORAGE_PREFIX + 'session');
    var candidate = session.found ? session.value : null;
    if (!candidate) {
      var legacy = parseStored('currentUser');
      candidate = legacy.found ? legacy.value : null;
      if (legacy.found) storageRemove('currentUser');
    }
    var email = typeof candidate === 'string' ? candidate : candidate && candidate.email;
    var uid = candidate && candidate.id;
    var found = table.users.find(function (u) { return (uid && u.id === uid) || (email && u.email === String(email).toLowerCase()); });
    activeUser = found ? publicUser(found) : null;
    if (persist !== false) {
      if (activeUser) storageSet(STORAGE_PREFIX + 'session', activeUser); else storageRemove(STORAGE_PREFIX + 'session');
    }
  }
  function userRecords(raw) {
    if (Array.isArray(raw)) return raw.reduce(function (all, item) { return all.concat(userRecords(item)); }, []);
    if (raw && Array.isArray(raw.users)) return userRecords(raw.users);
    if (!raw || typeof raw !== 'object') return [];
    if (raw.email || raw.name || raw.role || raw.passwordHash || raw.password !== undefined || raw.pass !== undefined) return [clone(raw) || {}];
    return Object.keys(raw).map(function (key) {
      var item = raw[key];
      if (!item || typeof item !== 'object') return null;
      var record = clone(item) || {};
      if (!record.email) record.email = key;
      if (record.pass !== undefined && record.password === undefined) record.password = record.pass;
      return record;
    }).filter(Boolean);
  }
  function migrateUserRecords(raw, hashPasswords) {
    var source = userRecords(raw), seen = Object.create(null), result = [];
    for (var i = 0; i < source.length; i += 1) {
      var user = cleanUser(source[i]); if (!user.email || seen[user.email]) continue; seen[user.email] = true;
      result.push(user);
    }
    return result;
  }
  async function migrateUsers(raw) {
    var source = userRecords(raw), seen = Object.create(null), result = [];
    for (var i = 0; i < source.length; i += 1) {
      var sourceUser = source[i] || {}, legacyPassword = sourceUser.password !== undefined ? sourceUser.password : sourceUser.pass;
      var user = cleanUser(sourceUser); if (!user.email || seen[user.email]) continue; seen[user.email] = true;
      if (!user.passwordHash && legacyPassword !== undefined && legacyPassword !== null && String(legacyPassword) !== '') user.passwordHash = await hashPassword(String(legacyPassword));
      result.push(user);
    }
    return result;
  }
  function uniqueAppointments(raw) {
    var seen = Object.create(null), result = [];
    arrayFrom(raw, 'appointments').map(cleanAppointment).filter(Boolean).forEach(function (appointment) {
      var key = [appointment.userId, appointment.doctorId, appointment.date, appointment.time, appointment.status].join('|');
      if (seen[key] || seen['id:' + appointment.id]) return;
      seen[key] = true; seen['id:' + appointment.id] = true; result.push(appointment);
    });
    return result;
  }
  async function bootstrap() {
    await loadLocalApi();
    var values = await Promise.all(TABLES.map(function (name) { return sourceTable(name).catch(function (error) { warn('falha no carregamento de ' + name + '; seed fallback ativo.'); return clone(defaults[name]); }); }));
    table.users = await migrateUsers(values[0]);
    var doctorMigration = migrateDoctorCopy(values[1]);
    table.doctors = doctorMigration.doctors;
    table.appointments = uniqueAppointments(values[2]);
    var testAppointmentAdded = ensureTestAppointment();
    table.favorites = arrayFrom(values[3], 'favorites'); table.messages = arrayFrom(values[4], 'messages'); table.payments = uniquePayments(values[5]);
    TABLES.forEach(function (name) { if (!Array.isArray(table[name])) table[name] = []; storageSet(STORAGE_PREFIX + name, table[name]); });
    loadSession(); initialized = true;
    if (apiConnected && apiSnapshot && (!apiSnapshot.initialized || doctorMigration.changed || testAppointmentAdded)) pushApiState();
    dispatch('haname:db', {ready:true}); dispatch('haname:session', {user:publicUser(activeUser)});
    return true;
  }

  var Core = {
    ready: bootstrap().catch(function (error) { warn('seed fallback de emergência ativado.'); table = {users:clone(fallbackUsers),doctors:clone(fallbackDoctors),appointments:[],favorites:[],messages:[],payments:[]}; initialized = true; loadSession(); return true; }),
    read: function (name) { return visibleRows(name); },
    write: function (name, data) { if (name === 'payments') throw new Error('Use o módulo de pagamentos para registrar ou atualizar cobranças.'); if (name === 'appointments' && (!activeUser || activeUser.role !== 'admin')) throw new Error('Acesso restrito para alterar consultas.'); return writeTable(name, data); },
    user: function () { return publicUser(activeUser); },
    isAdult: isAdultDate,
    roleUrl: function (role) { return role === 'medico' ? 'intranetm.html' : (role === 'admin' ? 'intranet.html' : 'intranetp.html'); },
    doctors: function () { return clone(table.doctors || []); },
    get: function (key, fallback) { var value = storageGet(STORAGE_PREFIX + 'pref:' + String(key)); if (value === null) return fallback; try { return JSON.parse(value); } catch (e) { return value; } },
    set: function (key, value) { if (!storageSet(STORAGE_PREFIX + 'pref:' + String(key), value)) throw storageFailure(); dispatch('haname:db', {preference:key}); if (apiConnected) pushApiState(); return clone(value); },
    persistent: function () { return !!storageAvailable; },
    apiStatus: apiStatus,
    connectApi: connectApi,
    disconnectApi: function () { storageSet(STORAGE_PREFIX + 'pref:apiDisabled', true); apiConnected = false; apiSnapshot = null; dispatchApi(); return apiStatus(); },
    today: today,
    dateLabel: dateLabel,
    slots: function (doctorId, date, ignoreId) {
      var doctor = findDoctor(doctorId); if (!doctor || !doctor.active || !isoValid(date)) return [];
      return doctor.times.filter(function (time) {
        if (!isTimeAllowed(doctor, date, time, ignoreId)) return false;
        return !(activeUser && activeUser.role === 'paciente' && patientConflict(activeUser.id, date, time, ignoreId));
      });
    },
    appointments: visibleAppointments,
    myAppointments: visibleAppointments,
    payments: visiblePayments,
    login: async function (email, password) {
      await Core.ready; email = String(email || '').trim().toLowerCase();
      var user = table.users.find(function (u) { return u.email === email; });
      if (!user || !(await verifyPassword(String(password || ''), user.passwordHash))) throw new Error('E-mail ou senha não conferem.');
      if (user.role === 'paciente') {
        if (user.birthDate && !isAdultDate(user.birthDate)) throw new Error('O acesso de pacientes exige 18 anos completos.');
      }
      var nextUser = publicUser(user); if (!storageSet(STORAGE_PREFIX + 'session', nextUser)) throw storageFailure();
      activeUser = nextUser; dispatch('haname:session', {user:publicUser(activeUser)}); return publicUser(activeUser);
    },
    register: async function (payload) {
      await Core.ready; payload = payload || {}; var email = String(payload.email || '').trim().toLowerCase();
      validateCredentials(email, payload.password); var name = String(payload.name || '').trim();
      if (name.length < 2) throw new Error('Informe seu nome.');
      if (!isAdultDate(payload.birthDate)) throw new Error('Informe uma data de nascimento válida. O cadastro é permitido somente a partir de 18 anos.');
      if (!String(payload.state || '').trim() || !String(payload.city || '').trim()) throw new Error('Selecione o estado e a cidade.');
      if (payload.ddd && !/^\d{2}$/.test(String(payload.ddd))) throw new Error('O DDD deve conter dois números.');
      if (table.users.some(function (u) { return u.email === email; })) throw new Error('Já existe uma conta com este e-mail.');
      var recoveryCode = 'HANAME-' + Array.prototype.map.call(randomBytes(5), function (b) { return ('0' + b.toString(16)).slice(-2); }).join('').toUpperCase();
      var user = cleanUser({id:id('user'),email:email,name:name,role:'paciente',birthDate:payload.birthDate,ddd:payload.ddd,phone:payload.phone,cep:payload.cep,endereco:payload.endereco,city:payload.city,state:payload.state});
      user.passwordHash = await hashPassword(payload.password); user.recoveryHash = await hashPassword(recoveryCode);
      table.users.push(user);
      try { saveTable('users'); } catch (error) { table.users.pop(); throw error; }
      var registeredUser = publicUser(user); if (!storageSet(STORAGE_PREFIX + 'session', registeredUser)) throw storageFailure();
      activeUser = registeredUser; dispatch('haname:session', {user:publicUser(activeUser)});
      return {user:publicUser(user),recoveryCode:recoveryCode};
    },
    recover: async function (email, code, newPassword) {
      await Core.ready; validateCredentials(String(email || ''), newPassword);
      var user = table.users.find(function (u) { return u.email === String(email).trim().toLowerCase(); });
      if (!user || !user.recoveryHash || !(await verifyPassword(String(code || '').trim(), user.recoveryHash))) throw new Error('E-mail ou código de recuperação não conferem.');
      var previousHash = user.passwordHash, previousRecovery = user.recoveryHash;
      user.passwordHash = await hashPassword(newPassword); delete user.recoveryHash;
      try { saveTable('users'); } catch (error) { user.passwordHash = previousHash; user.recoveryHash = previousRecovery; throw error; }
      return true;
    },
    logout: function () { activeUser = null; storageRemove(STORAGE_PREFIX + 'session'); storageRemove('currentUser'); dispatch('haname:session', {user:null}); },
    book: async function (input) {
      await Core.ready; assertAuth('paciente'); input = input || {};
      return withLock(function () {
        refreshTransactionState(); assertAuth('paciente');
        var data = bookingData(input, activeUser.id);
        var appointment = {id:id('apt'),userId:activeUser.id,patientName:activeUser.name,doctorId:data.doctor.id,doctorName:data.doctor.name,specialty:data.doctor.specialty,date:data.date,time:data.time,notes:data.notes,status:'confirmed'};
        table.appointments.push(appointment);
        try { saveTable('appointments'); } catch (error) { table.appointments.pop(); throw error; }
        return clone(appointment);
      });
    },
    reschedule: async function (appointmentId, input) {
      await Core.ready; assertAuth('paciente'); input = input || {};
      return withLock(function () {
        refreshTransactionState(); assertAuth('paciente');
        var appointment = table.appointments.find(function (a) { return a.id === appointmentId && a.userId === activeUser.id && a.status === 'confirmed'; });
        if (!appointment) throw new Error('Consulta não encontrada ou já encerrada.');
        var data = bookingData(input, activeUser.id, appointment.id);
        var previous = clone(appointment);
        appointment.date = data.date; appointment.time = data.time; appointment.doctorId = data.doctor.id; appointment.doctorName = data.doctor.name; appointment.specialty = data.doctor.specialty; appointment.notes = data.notes;
        try { saveTable('appointments'); } catch (error) { Object.keys(previous).forEach(function (key) { appointment[key] = previous[key]; }); throw error; }
        return clone(appointment);
      });
    },
    cancel: async function (appointmentId) {
      await Core.ready; if (!activeUser) throw new Error('É necessário entrar para cancelar.');
      return withLock(function () {
        refreshTransactionState(); if (!activeUser) throw new Error('É necessário entrar para cancelar.');
        var appointment = table.appointments.find(function (a) { return a.id === appointmentId; });
        if (!appointment || (activeUser.role === 'paciente' && appointment.userId !== activeUser.id) || (activeUser.role === 'medico' && appointment.doctorId !== activeUser.doctorId) || (activeUser.role !== 'paciente' && activeUser.role !== 'medico' && activeUser.role !== 'admin')) throw new Error('Consulta não encontrada.');
        if (appointment.status !== 'confirmed') throw new Error('Essa consulta não está confirmada.');
        appointment.status = 'cancelled';
        try { saveTable('appointments'); } catch (error) { appointment.status = 'confirmed'; throw error; }
        return clone(appointment);
      });
    },
    complete: async function (appointmentId, reportInput) {
      await Core.ready; assertAuth('medico');
      return withLock(function () {
        refreshTransactionState(); assertAuth('medico');
        var appointment = table.appointments.find(function (a) { return a.id === appointmentId && a.doctorId === activeUser.doctorId; });
        if (!appointment || appointment.status !== 'confirmed') throw new Error('Consulta não encontrada ou já encerrada.');
        if (appointment.date > today() || (appointment.date === today() && clockMinutes(appointment.time) > nowMinutes())) throw new Error('Uma consulta futura não pode ser concluída.');
        var doctor = table.doctors.find(function (item) { return item.id === activeUser.doctorId; });
        var report = validateMedicalReport(reportInput, doctor || {id:activeUser.doctorId,name:activeUser.name});
        var previousStatus = appointment.status, previousReport = appointment.report;
        appointment.status = 'completed'; appointment.report = report;
        try { saveTable('appointments'); } catch (error) { appointment.status = previousStatus; if (previousReport === undefined) delete appointment.report; else appointment.report = previousReport; throw error; }
        return clone(appointment);
      });
    },
    createPayment: async function (input) {
      await Core.ready; assertAuth('admin'); input = input || {};
      return withLock(function () {
        refreshTransactionState(); assertAuth('admin');
        var appointmentId = String(input.appointmentId || ''), appointment = table.appointments.find(function (item) { return item.id === appointmentId; });
        var amountCents = Number(input.amountCents), method = String(input.method || '');
        if (!appointment || appointment.status === 'cancelled') throw new Error('Selecione uma consulta válida e não cancelada.');
        if (!Number.isSafeInteger(amountCents) || amountCents < 1 || amountCents > 100000000) throw new Error('Informe um valor entre R$ 0,01 e R$ 1.000.000,00.');
        if (['pix','cartao','dinheiro','transferencia','outro'].indexOf(method) < 0) throw new Error('Selecione uma forma de pagamento válida.');
        var payment = cleanPayment({id:id('pag'),appointmentId:appointment.id,amountCents:amountCents,method:method,status:'pending',createdAt:new Date().toISOString()});
        table.payments.push(payment);
        try { saveTable('payments'); } catch (error) { table.payments.pop(); throw error; }
        return clone(payment);
      });
    },
    setPaymentStatus: async function (paymentId, nextStatus) {
      await Core.ready; assertAuth('admin'); nextStatus = String(nextStatus || '');
      return withLock(function () {
        refreshTransactionState(); assertAuth('admin');
        var payment = table.payments.find(function (item) { return item.id === String(paymentId); });
        if (!payment) throw new Error('Pagamento não encontrado.');
        if (payment.status === nextStatus) return clone(payment);
        var transitions = {pending:['paid','cancelled'],paid:['cancelled'],cancelled:[]};
        if (!transitions[payment.status] || transitions[payment.status].indexOf(nextStatus) < 0) throw new Error('Esta alteração de situação não é permitida.');
        var previous = clone(payment); payment.status = nextStatus; payment.updatedAt = new Date().toISOString();
        try { saveTable('payments'); } catch (error) { Object.keys(payment).forEach(function (key) { delete payment[key]; }); Object.keys(previous).forEach(function (key) { payment[key] = previous[key]; }); throw error; }
        return clone(payment);
      });
    },
    updateProfile: async function (payload) {
      await Core.ready; assertAuth('paciente'); payload = payload || {};
      var user = table.users.find(function (u) { return u.id === activeUser.id; });
      var previous = clone(user);
      ['name','phone','ddd','cep','endereco','birthDate','city','state'].forEach(function (key) { if (payload[key] !== undefined) user[key] = String(payload[key]).trim().slice(0,160); });
      if (!user.name || user.name.length < 2) { Object.keys(user).forEach(function (key) { delete user[key]; }); Object.keys(previous).forEach(function (key) { user[key] = previous[key]; }); throw new Error('Informe seu nome.'); }
      if (!isAdultDate(user.birthDate)) { Object.keys(user).forEach(function (key) { delete user[key]; }); Object.keys(previous).forEach(function (key) { user[key] = previous[key]; }); throw new Error('Informe uma data de nascimento válida. O acesso de pacientes é permitido somente a partir de 18 anos.'); }
      if (!String(user.state || '').trim() || !String(user.city || '').trim()) { Object.keys(user).forEach(function (key) { delete user[key]; }); Object.keys(previous).forEach(function (key) { user[key] = previous[key]; }); throw new Error('Selecione o estado e a cidade.'); }
      if (user.ddd && !/^\d{2}$/.test(String(user.ddd))) { Object.keys(user).forEach(function (key) { delete user[key]; }); Object.keys(previous).forEach(function (key) { user[key] = previous[key]; }); throw new Error('O DDD deve conter dois números.'); }
      try { saveTable('users'); } catch (error) { Object.keys(user).forEach(function (key) { delete user[key]; }); Object.keys(previous).forEach(function (key) { user[key] = previous[key]; }); throw error; }
      var updatedUser = publicUser(user); if (!storageSet(STORAGE_PREFIX + 'session', updatedUser)) throw storageFailure();
      activeUser = updatedUser; dispatch('haname:session', {user:publicUser(activeUser)}); return publicUser(user);
    },
    favorites: function (type) { if (!activeUser) return []; return clone(table.favorites.filter(function (f) { return f.userId === activeUser.id && (!type || f.type === type); })); },
    toggleFavorite: async function (item) {
      await Core.ready; assertAuth(); item = item || {}; var type = String(item.type || 'doctor'); var dataId = String(item.id || '');
      if (!dataId) throw new Error('Favorito inválido.');
      var index = table.favorites.findIndex(function (f) { return f.userId === activeUser.id && f.type === type && f.id === dataId; });
      if (index >= 0) {
        var removed = table.favorites.splice(index,1)[0];
        try { saveTable('favorites'); } catch (error) { table.favorites.splice(index,0,removed); throw error; }
        return false;
      }
      var favorite = {id:dataId,userId:activeUser.id,type:type,title:String(item.title || ''),data:clone(item.data || {})}; table.favorites.push(favorite);
      try { saveTable('favorites'); } catch (error) { table.favorites.pop(); throw error; }
      return true;
    },
    setDoctorActive: async function (doctorId, active) {
      await Core.ready; assertAuth('admin'); var doctor = findDoctor(doctorId); if (!doctor) throw new Error('Médico não encontrado.'); var previous = doctor.active; doctor.active = !!active; try { saveTable('doctors'); } catch (error) { doctor.active = previous; throw error; } return clone(doctor);
    },
    addMessage: function (message) { var item = clone(message || {}); item.id = id('msg'); item.createdAt = new Date().toISOString(); table.messages.push(item); try { saveTable('messages'); } catch (error) { table.messages.pop(); throw error; } return clone(item); },
    downloadBackup: function () {
      assertAuth('admin');
      function redact(value) {
        if (Array.isArray(value)) return value.map(redact);
        if (!value || typeof value !== 'object') return value;
        var out = {};
        Object.keys(value).forEach(function (key) { var lower = key.toLowerCase(); if (lower.indexOf('password') >= 0 || lower.indexOf('hash') >= 0 || lower.indexOf('recovery') >= 0 || lower === 'pass' || lower === 'session' || lower === 'token') return; out[key] = redact(value[key]); });
        return out;
      }
      return {version:1,exportedAt:new Date().toISOString(),notice:'Exportação de dados sem senhas, hashes, códigos de recuperação ou sessão.',users:table.users.map(function (user) { return redact(publicUser(user)); }),doctors:redact(table.doctors),appointments:redact(table.appointments),payments:redact(table.payments),favorites:redact(table.favorites),messages:redact(table.messages)};
    },
    _debug: function () { return {initialized:initialized,storageAvailable:storageAvailable,apiConnected:apiConnected}; }
  };

  try {
    if (typeof g.addEventListener === 'function') {
      g.addEventListener('storage', function (event) {
        if (event && event.key === null) {
          table = {users:clone(defaults.users),doctors:clone(defaults.doctors),appointments:[],favorites:[],messages:[],payments:[]};
          activeUser = null;
          dispatch('haname:db', {external:true,cleared:true});
          dispatch('haname:session', {user:null,external:true});
          return;
        }
        if (!event || !event.key) return;
        if (event.key.indexOf(STORAGE_PREFIX) !== 0) return;
        var name = event.key.slice(STORAGE_PREFIX.length);
        if (TABLES.indexOf(name) >= 0) { refreshTable(name); dispatch('haname:db', {table:name,external:true}); }
        if (name === 'session') { loadSession(); dispatch('haname:session', {user:publicUser(activeUser),external:true}); }
      });
    }
  } catch (e) { /* optional */ }
  g.Core = Core;
}(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this)));
