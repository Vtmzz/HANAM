/* Busca de CEP, DDD e seleção encadeada de estado/cidade. */
(function (window, document, $) {
  'use strict';
  if (!$) return;

  var cepSelector = 'input[name="cep"], #cep, #profileCep';
  var statesUrl = 'https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome';
  function formFor(input) { return input && (input.form || (input.closest && input.closest('form'))) || document; }
  function cepInput(form) { return form && form.querySelector ? form.querySelector(cepSelector) : null; }
  function statusNode(input, create) {
    var form = formFor(input);
    var node = form.querySelector && (form.querySelector('[data-cep-status]') || form.querySelector('#cepStatus'));
    if (!node && create && input) {
      node = document.createElement('span'); node.className = 'helper cep-status'; node.setAttribute('data-cep-status', ''); node.setAttribute('role', 'status');
      var field = input.closest && input.closest('.field');
      if (field) field.appendChild(node); else if (input.parentNode) input.parentNode.insertBefore(node, input.nextSibling);
    }
    return node;
  }
  function status(input, text, error) {
    var node = statusNode(input, true); if (!node) return;
    node.textContent = text; node.className = error ? 'field-error cep-status' : 'helper cep-status';
    node.setAttribute('role', error ? 'alert' : 'status'); node.setAttribute('aria-live', error ? 'assertive' : 'polite');
  }
  function clearStatus(input) { var node = statusNode(input, false); if (node) { node.textContent = ''; node.className = 'helper cep-status'; node.setAttribute('role', 'status'); } }
  function digitsOf(input) { return input ? input.value.replace(/\D/g, '') : ''; }
  function manualButton(input) { var form = formFor(input); return form.querySelector && form.querySelector('#buscarCep'); }
  function setButton(button, busy) { if (button) $(button).prop('disabled', !!busy).attr('aria-busy', busy ? 'true' : 'false').text(busy ? 'Buscando CEP…' : 'Buscar CEP'); }
  function escapeText(value) { return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]; }); }
  function setOptions(select, items, placeholder, selected, labelKey, valueKey) {
    if (!select) return;
    var html = '<option value="">' + escapeText(placeholder) + '</option>';
    items.forEach(function (item) {
      var label = item[labelKey], value = item[valueKey];
      html += '<option value="' + escapeText(value) + '"' + (String(value) === String(selected || '') ? ' selected' : '') + '>' + escapeText(label) + '</option>';
    });
    select.innerHTML = html;
  }
  function loadCities(stateSelect, citySelect, selectedCity) {
    var sequence = (citySelect.__hanameCitiesSequence || 0) + 1;
    citySelect.__hanameCitiesSequence = sequence;
    var uf = stateSelect && stateSelect.value;
    if (!uf) { setOptions(citySelect, [], 'Selecione primeiro o estado', '', 'nome', 'nome'); citySelect.disabled = true; return; }
    citySelect.disabled = true; setOptions(citySelect, [], 'Carregando cidades…', '', 'nome', 'nome');
    var request = $.ajax({url:'https://servicodados.ibge.gov.br/api/v1/localidades/estados/' + encodeURIComponent(uf) + '/municipios?orderBy=nome', dataType:'json', timeout:15000});
    request.done(function (items) { if (citySelect.__hanameCitiesSequence !== sequence) return; setOptions(citySelect, Array.isArray(items) ? items : [], 'Selecione a cidade', selectedCity, 'nome', 'nome'); citySelect.disabled = false; });
    request.fail(function () { if (citySelect.__hanameCitiesSequence !== sequence) return; setOptions(citySelect, [], 'Não foi possível carregar as cidades', '', 'nome', 'nome'); citySelect.disabled = true; });
  }
  function setFromCep(form, uf, cityName) {
    var state = form && form.querySelector('#registerState, #state, [name="state"]');
    var city = form && form.querySelector('#registerCity, #city, [name="city"]');
    if (!state || !city) return;
    state.__hanamePendingState = uf; state.__hanamePendingCity = cityName;
    if (!state.disabled && Array.prototype.some.call(state.options || [], function (option) { return option.value === uf; })) {
      state.value = uf; loadCities(state, city, cityName);
    }
  }
  function initializeLocations(form, initial) {
    if (!form || form.__hanameLocationReady) return;
    var state = form.querySelector('#registerState, #state, [name="state"]');
    var city = form.querySelector('#registerCity, #city, [name="city"]');
    if (!state || !city) return;
    initial = initial || {}; var selectedState = initial.state || state.value || ''; var selectedCity = initial.city || city.value || '';
    state.disabled = true;
    var request = $.ajax({url:statesUrl, dataType:'json', timeout:15000});
    request.done(function (items) {
      var wantedState = state.__hanamePendingState || selectedState;
      setOptions(state, Array.isArray(items) ? items : [], 'Selecione o estado', wantedState, 'nome', 'sigla');
      state.disabled = false;
      if (wantedState) { state.value = wantedState; loadCities(state, city, state.__hanamePendingCity || selectedCity); }
    });
    request.fail(function () { setOptions(state, [], 'Não foi possível carregar os estados', '', 'nome', 'sigla'); state.disabled = true; });
    state.addEventListener('change', function () { loadCities(state, city, ''); });
    form.__hanameLocationReady = true;
  }
  window.HanameLocations = {init:initializeLocations, loadCities:loadCities, setFromCep:setFromCep};

  function lookupCep(input, button) {
    if (!input) return;
    var cep = digitsOf(input);
    if (!/^\d{8}$/.test(cep)) { status(input, 'Informe um CEP válido com oito números.', true); if (button) input.focus(); return; }
    var sequence = (input.__hanameCepSequence || 0) + 1; input.__hanameCepSequence = sequence; input.__hanameLastRequestedCep = cep;
    button = button || manualButton(input); setButton(button, !!button); input.setAttribute('aria-busy', 'true'); status(input, 'Buscando endereço…', false);
    $.ajax({url:'https://viacep.com.br/ws/' + cep + '/json/', dataType:'json', timeout:10000})
      .done(function (data) {
        if (input.__hanameCepSequence !== sequence) return;
        if (!data || data.erro) { status(input, 'CEP não encontrado. Confira os números ou preencha o endereço manualmente.', true); return; }
        var form = formFor(input);
        var addressInput = form.querySelector && form.querySelector('#endereco, #profileAddress, [name="endereco"]');
        var city = form.querySelector && form.querySelector('#cidade, #city, #registerCity, [name="city"]');
        var state = form.querySelector && form.querySelector('#estado, #state, #registerState, [name="state"]');
        var ddd = form.querySelector && form.querySelector('#registerDdd, #profileDdd, [name="ddd"]');
        var phone = form.querySelector && form.querySelector('#registerPhone, #profilePhone, [name="phoneDisplay"]');
        var previousDdd = ddd ? String(ddd.value || '').replace(/\D/g, '').slice(0, 2) : '';
        var addressParts = [data.logradouro, data.bairro];
        if (!city || city.tagName === 'SELECT') addressParts.push(data.localidade);
        if (!state || state.tagName === 'SELECT') addressParts.push(data.uf);
        if (addressInput) addressInput.value = addressParts.filter(Boolean).join(', ');
        if (ddd && data.ddd) {
          var newDdd = String(data.ddd).replace(/\D/g, '').slice(0, 2);
          var phoneDigits = digitsOf(phone);
          if (previousDdd && phoneDigits.slice(0, 2) === previousDdd && phoneDigits.length > 9) phoneDigits = phoneDigits.slice(2);
          else if (phoneDigits.slice(0, 4) === '55' + newDdd) phoneDigits = phoneDigits.slice(4);
          else if (phoneDigits.slice(0, 2) === newDdd && phoneDigits.length > 9) phoneDigits = phoneDigits.slice(2);
          ddd.value = newDdd;
          if (phone) {
            if (phoneDigits.length === 9) phoneDigits = phoneDigits.slice(0, 5) + '-' + phoneDigits.slice(5);
            else if (phoneDigits.length === 8) phoneDigits = phoneDigits.slice(0, 4) + '-' + phoneDigits.slice(4);
            phone.value = '(' + newDdd + ')' + (phoneDigits ? ' ' + phoneDigits : ' ');
          }
        }
        if (state && city && state.tagName === 'SELECT') setFromCep(form, data.uf || '', data.localidade || '');
        else { if (city) city.value = data.localidade || ''; if (state) state.value = data.uf || ''; }
        status(input, 'Endereço, cidade, estado e DDD preenchidos quando disponíveis. Confira os dados antes de salvar.', false);
      })
      .fail(function () { if (input.__hanameCepSequence === sequence) status(input, 'Não foi possível consultar o CEP agora. Você pode preencher o endereço manualmente.', true); })
      .always(function () { if (input.__hanameCepSequence !== sequence) return; input.removeAttribute('aria-busy'); setButton(button, false); });
  }
  function scheduleLookup(input, immediate) {
    var cep = digitsOf(input);
    if (input.__hanameCepTimer) window.clearTimeout(input.__hanameCepTimer);
    if (cep !== input.__hanameLastValue) { input.__hanameLastValue = cep; input.__hanameLastRequestedCep = ''; input.__hanameCepSequence = (input.__hanameCepSequence || 0) + 1; input.removeAttribute('aria-busy'); setButton(manualButton(input), false); clearStatus(input); }
    if (!/^\d{8}$/.test(cep) || cep === input.__hanameLastRequestedCep) return;
    input.__hanameCepTimer = window.setTimeout(function () { lookupCep(input); }, immediate ? 0 : 450);
  }
  $(document).on('input.hanameCep', cepSelector, function () { scheduleLookup(this, false); });
  $(document).on('change.hanameCep', cepSelector, function () { scheduleLookup(this, true); });
  $(document).on('click.hanameCep', '#buscarCep', function (event) { event.preventDefault(); var input = cepInput(formFor(this)); if (!input) return; input.__hanameLastRequestedCep = ''; if (input.__hanameCepTimer) window.clearTimeout(input.__hanameCepTimer); lookupCep(input, this); });
}(window, document, window.jQuery));
