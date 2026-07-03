(function () {

    // Busca por CPF/CNPJ e/ou NU_CNARH — filtro feito no servidor via query string.
    var URL_LISTAR_EMPREENDIMENTOS = "https://ows.snirh.gov.br/ords/servicos/declara_agua_gerencial/listar_em_urh_declara";
    var URL_CRIAR_CHAVE = "https://ows.snirh.gov.br/ords/servicos/declara_agua_gerencial/def_chave_acesso";
    var REGEX_UUID_CHAVE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    var _itensBusca = [];
    var _selecionado = null;

    function fixMojibake(str) {
        if (typeof str !== 'string') return str;
        try { return decodeURIComponent(escape(str)); } catch (e) { return str; }
    }

    function formatCnpjCpf(value) {
        if (value == null || value === '') return '';
        var digits = String(value).replace(/\D/g, '');
        if (digits.length === 11) return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
        if (digits.length === 14) return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
        return digits;
    }

    function formatNuCnarh(value) {
        if (value == null || value === '') return '';
        var digits = String(value).replace(/\D/g, '');
        if (digits.length !== 12) return value;
        return digits.replace(/(\d{2})(\d{1})(\d{7})(\d{2})/, "$1.$2.$3/$4");
    }

    function avisar(tipo, msg) {
        if (typeof toastr !== 'undefined') toastr[tipo](msg);
        else alert(msg);
    }

    // Máscara automática CPF (11 dígitos) / CNPJ (14 dígitos)
    function nkMaskDoc(v) {
        var d = v.replace(/\D/g, '').slice(0, 14);
        if (d.length <= 11) {
            return d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
        }
        return d.replace(/^(\d{2})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1/$2').replace(/(\d{4})(\d{1,2})$/, '$1-$2');
    }

    var nk = {};

    function carregarRefs() {
        nk.overlay = document.getElementById('nkModal');
        nk.form    = document.getElementById('nkForm');
        nk.doc     = document.getElementById('nkDoc');
        nk.cnarh   = document.getElementById('nkCnarh');
        nk.table   = document.getElementById('nkTable');
        nk.rhead   = document.getElementById('nkRHead');
        nk.count   = document.getElementById('nkCount');
        nk.sel     = document.getElementById('nkSel');
        nk.create  = document.getElementById('nkCreate');
        nk.btn     = document.getElementById('nkSearchBtn');
    }

    function estadoInicialHtml() {
        return '<div class="nk-state" id="nkInitial">' +
            '<span class="nk-eic"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg></span>' +
            '<p>Nenhum resultado ainda</p>' +
            '<small>Informe CPF/CNPJ ou NU_CNARH e clique em Buscar.</small></div>';
    }

    function nkSkeleton() {
        return '<div class="nk-skel">' + Array(3).fill(
            '<div class="nk-row">' + Array(5).fill('<span class="nk-bar"></span>').join('') + '</div>'
        ).join('') + '</div>';
    }

    function nkUpdateFooter() {
        nk.create.disabled = !_selecionado;
        nk.sel.innerHTML = _selecionado
            ? 'Selecionado: <b>' + (formatNuCnarh(_selecionado.nu_cnarh) || '-') + ' - ' + (fixMojibake(_selecionado.nome_empreendimento) || '-') + '</b>'
            : 'Nenhum item selecionado';
    }

    function nkSetLoading(on) {
        nk.btn.disabled = on;
        nk.btn.querySelector('.nk-label').textContent = on ? 'Buscando…' : 'Buscar';
        nk.btn.querySelector('svg').style.display = on ? 'none' : '';
        if (on) {
            if (!nk.btn.querySelector('.nk-spin')) nk.btn.insertAdjacentHTML('afterbegin', '<span class="nk-spin"></span>');
            nk.rhead.style.display = 'none';
            nk.table.innerHTML = nkSkeleton();
        } else {
            var s = nk.btn.querySelector('.nk-spin');
            if (s) s.remove();
        }
    }

    function nkRender(items) {
        _itensBusca = items;
        _selecionado = null;
        nkUpdateFooter();

        if (!items.length) {
            nk.rhead.style.display = 'none';
            nk.table.innerHTML =
                '<div class="nk-state"><span class="nk-eic"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9.2 9.2a3 3 0 1 1 3.6 4.6c-.5.4-.8.7-.8 1.4"/><circle cx="12" cy="17.6" r=".4" fill="currentColor"/></svg></span>' +
                '<p>Nenhum empreendimento encontrado</p>' +
                '<small>Revise o CPF/CNPJ ou o NU_CNARH e tente novamente.</small></div>';
            return;
        }

        nk.rhead.style.display = 'flex';
        nk.count.textContent = items.length + (items.length === 1 ? ' encontrado' : ' encontrados');

        nk.table.innerHTML =
            '<div class="nk-thead"><span>NU_CNARH</span><span>CPF/CNPJ</span><span>Empreendimento</span><span>Usuário</span><span class="nk-c">Selecionar</span></div>' +
            items.map(function (it, idx) {
                return '<div class="nk-row" data-i="' + idx + '">' +
                    '<span class="nk-mono">' + (formatNuCnarh(it.nu_cnarh) || '-') + '</span>' +
                    '<span class="nk-mono">' + (formatCnpjCpf(it.cpfcnpj) || '-') + '</span>' +
                    '<span>' + (fixMojibake(it.nome_empreendimento) || '-') + '</span>' +
                    '<span>' + (fixMojibake(it.nome_usuario) || '-') + '</span>' +
                    '<span class="nk-radio"><i></i></span></div>';
            }).join('');

        nk.table.querySelectorAll('.nk-row').forEach(function (row) {
            row.onclick = function () {
                nk.table.querySelectorAll('.nk-row').forEach(function (r) { r.classList.remove('nk-on'); });
                row.classList.add('nk-on');
                _selecionado = _itensBusca[+row.dataset.i];
                nkUpdateFooter();
            };
        });
    }

    // ===== Pesquisa de CNARH — filtro feito no servidor (cpfcnpj e/ou nu_cnarh) =====
    async function pesquisarCnarh(cpfCnpj, nuCnarh) {
        var params = [];
        if (cpfCnpj) params.push('cpfcnpj=' + encodeURIComponent(cpfCnpj));
        if (nuCnarh) params.push('nu_cnarh=' + encodeURIComponent(nuCnarh));
        var url = URL_LISTAR_EMPREENDIMENTOS + (params.length ? ('?' + params.join('&')) : '');

        const response = await fetch(url);
        if (!response.ok) throw new Error('Status ' + response.status);
        const json = await response.json();
        return json.items || [];
    }

    // ===== Criação da chave =====
    // O endpoint já cria a chave no servidor — o código só chama o serviço e interpreta
    // o que ele devolveu (v_response). GUID (LOWER(REGEXP_REPLACE(RAWTOHEX(SYS_GUID()),...)))
    // = sucesso; qualquer outro texto = mensagem de erro do serviço.
    async function criarChaveParaCnarh(item) {
        var token = (typeof getCookie === 'function') ? getCookie('token') : null;
        var url = URL_CRIAR_CHAVE + '?in_nu_cnarh=' + encodeURIComponent(item.nu_cnarh || '');

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Authorization': token || '' }
        });

        var v_response = (await response.text()).trim();
        try {
            var json = JSON.parse(v_response);
            if (typeof json === 'string') {
                v_response = json;
            } else if (json && typeof json === 'object') {
                v_response = json.chave || json.ds_chave || json.mensagem || json.message || json.erro || v_response;
            }
        } catch (e) { /* resposta não é JSON — usa o texto puro */ }

        v_response = String(v_response).trim().replace(/^"|"$/g, '');
        var sucesso = REGEX_UUID_CHAVE.test(v_response);

        if (!response.ok && !sucesso) {
            throw new Error('Status ' + response.status + (v_response ? (' — ' + v_response) : ''));
        }

        return { sucesso: sucesso, chave: sucesso ? v_response : null, mensagem: !sucesso ? v_response : null };
    }

    async function nkCriarChave() {
        if (!_selecionado) return;

        nk.create.disabled = true;
        if (!nk.create.querySelector('.nk-spin')) nk.create.insertAdjacentHTML('afterbegin', '<span class="nk-spin"></span>');

        try {
            var resultado = await criarChaveParaCnarh(_selecionado);

            var spin = nk.create.querySelector('.nk-spin');
            if (spin) spin.remove();

            if (!resultado.sucesso) {
                avisar('error', resultado.mensagem || 'Não foi possível criar a chave de acesso.');
                nk.create.disabled = false;
                return;
            }

            avisar('success', 'Chave de acesso criada com sucesso.');
            var nuCnarhCriado = _selecionado.nu_cnarh;
            nkFecharModal();

            if (typeof window.chaves_recarregar_e_filtrar === 'function') {
                window.chaves_recarregar_e_filtrar(nuCnarhCriado);
            }
        } catch (e) {
            console.error('Erro ao criar chave de acesso:', e);
            avisar('error', 'Erro ao criar chave de acesso.');
            var spin2 = nk.create.querySelector('.nk-spin');
            if (spin2) spin2.remove();
            nk.create.disabled = false;
        }
    }

    // ===== Abertura/fechamento do modal =====
    function nkFecharModal() {
        nk.overlay.classList.remove('open');
    }

    function nkAbrirModal() {
        if (!nk.overlay) carregarRefs();

        nk.doc.value = '';
        nk.cnarh.value = '';
        nk.rhead.style.display = 'none';
        nk.table.innerHTML = estadoInicialHtml();
        _itensBusca = [];
        _selecionado = null;
        nkUpdateFooter();

        nk.overlay.classList.add('open');
    }

    async function nkBuscar(e) {
        if (e) e.preventDefault();

        var cpfCnpj = nk.doc.value.replace(/\D/g, '');
        var nuCnarh = nk.cnarh.value.replace(/\D/g, '');

        if (!cpfCnpj && !nuCnarh) {
            avisar('warning', 'Informe ao menos o CPF/CNPJ ou o NU_CNARH para buscar.');
            return;
        }

        nkSetLoading(true);
        try {
            var items = await pesquisarCnarh(cpfCnpj, nuCnarh);
            nkSetLoading(false);
            nkRender(items);
        } catch (err) {
            nkSetLoading(false);
            console.error('Erro ao pesquisar CNARH:', err);
            avisar('error', 'Erro ao pesquisar CNARH.');
        }
    }

    function inicializarEventos() {
        carregarRefs();

        nk.doc.addEventListener('input', function () { nk.doc.value = nkMaskDoc(nk.doc.value); });
        nk.cnarh.addEventListener('input', function () { nk.cnarh.value = nk.cnarh.value.replace(/\D/g, ''); });

        nk.form.addEventListener('submit', nkBuscar);
        nk.create.addEventListener('click', nkCriarChave);

        nk.overlay.querySelectorAll('[data-nk-close]').forEach(function (b) { b.onclick = nkFecharModal; });
        nk.overlay.addEventListener('mousedown', function (e) { if (e.target === nk.overlay) nkFecharModal(); });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && nk.overlay.classList.contains('open')) nkFecharModal();
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', inicializarEventos);
    } else {
        inicializarEventos();
    }

    window.nc_abrir_modal = nkAbrirModal;

})();
