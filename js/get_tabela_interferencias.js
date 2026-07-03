(function () {

    var _todasInterferencias  = null;
    var _carregamentoCompleto = false;

    var _BASE_URL  = "https://ows.snirh.gov.br/ords/servicos/declara_agua_gerencial/listar_int_obrigatoriedade";
    var _CACHE_KEY = 'gerencial_int_cache_v1';
    var _CACHE_TTL = 15 * 60 * 1000; // 15 minutos

    // Mapeia o órgão do perfil ativo (get_orgao_gestor) para o org_nm retornado pela API
    var ORGAO_TO_ORGNM = { BR: 'ANA', TO: 'NATURATINS', SP: 'SP AGUAS', RJ: 'INEA' };

    function fixMojibake(str) {
        if (typeof str !== 'string') return str;
        try { return decodeURIComponent(escape(str)); } catch (e) { return str; }
    }

    function formatCnpjCpf(value) {
        if (value == null || value === '') return '';
        var digits = String(value).replace(/\D/g, '');
        if (digits.length === 11) {
            return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
        }
        if (digits.length === 14) {
            return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
        }
        return digits;
    }

    function formatNuCnarh(value) {
        if (value == null || value === '') return '';
        var digits = String(value).replace(/\D/g, '');
        if (digits.length !== 12) return value;
        return digits.replace(/(\d{2})(\d{1})(\d{7})(\d{2})/, "$1.$2.$3/$4");
    }

    function _lerCache() {
        try {
            var raw = localStorage.getItem(_CACHE_KEY);
            if (!raw) return null;
            var data = JSON.parse(raw);
            if ((Date.now() - data.ts) < _CACHE_TTL) return data.items;
        } catch (e) { /* ignore */ }
        return null;
    }

    function _salvarCache(items) {
        try {
            localStorage.setItem(_CACHE_KEY, JSON.stringify({ ts: Date.now(), items: items }));
        } catch (e) { /* ignore QuotaExceededError */ }
    }

    function _setStatusBar(visivel, texto) {
        var bar  = document.getElementById('int-status-bar');
        var text = document.getElementById('int-status-text');
        if (!bar) return;
        bar.style.display = visivel ? 'flex' : 'none';
        if (visivel && texto && text) text.textContent = texto;
    }

    async function carregar_interferencias() {
        if (_carregamentoCompleto) return _todasInterferencias;

        // Cache hit: mostra dados instantaneamente e refresca em background
        var cached = _lerCache();
        if (cached) {
            _todasInterferencias  = cached;
            _carregamentoCompleto = true;
            setTimeout(_refrescarCacheBackground, 200);
            return _todasInterferencias;
        }

        // Phase 1: busca só os primeiros 10 registros (~0.8s)
        try {
            var resp1 = await fetch(_BASE_URL + "?limit=10&offset=0");
            if (!resp1.ok) throw new Error("Status " + resp1.status);
            var json1 = await resp1.json();
            _todasInterferencias = json1.items || [];
            if (!json1.hasMore) {
                _carregamentoCompleto = true;
                _salvarCache(_todasInterferencias);
            }
            // Se hasMore=true, Phase 2 será disparada por int_initial()
        } catch (e) {
            console.error("Erro ao carregar interferências:", e);
            _todasInterferencias  = [];
            _carregamentoCompleto = true;
        }
        return _todasInterferencias;
    }

    // Phase 2: carrega o dataset completo em background e atualiza a UI
    async function _carregarRestanteBackground() {
        try {
            var resp = await fetch(_BASE_URL);
            if (!resp.ok) throw new Error("Status " + resp.status);
            var json = await resp.json();
            var items = json.items || [];

            _todasInterferencias  = items;
            _carregamentoCompleto = true;
            _salvarCache(items);

            // Re-renderiza com o dataset completo aplicando os filtros atuais
            if (typeof window.int_buscar === 'function') window.int_buscar();

            _setStatusBar(true, items.length + ' interferências carregadas.');
            setTimeout(function() { _setStatusBar(false); }, 2500);
        } catch (e) {
            console.error("Erro no carregamento em background:", e);
            _setStatusBar(false);
        }
    }

    // Atualiza o cache em background sem tocar na UI (para cache expirado)
    async function _refrescarCacheBackground() {
        try {
            var resp = await fetch(_BASE_URL);
            if (!resp.ok) return;
            var json = await resp.json();
            var items = json.items || [];
            _todasInterferencias = items;
            _salvarCache(items);
        } catch (e) { /* ignore */ }
    }

    async function popular_bacia_int() {
        try {
            const response = await fetch("https://ows.snirh.gov.br/ords/servicos/declara_agua_gerencial/listar_bacia");
            if (!response.ok) throw new Error("Status " + response.status);
            const json = await response.json();
            const select = document.getElementById("int_list_bacia");
            (json.items || []).forEach(function (bacia) {
                const opt = document.createElement('option');
                opt.value = bacia.nm_bacia;
                opt.textContent = bacia.nm_bacia + '        [' + bacia.total_equipamentos + ']';
                select.appendChild(opt);
            });
        } catch (e) {
            console.error("Erro ao popular bacias:", e);
        }
    }

    async function popular_corpohidrico_int() {
        try {
            const response = await fetch("https://ows.snirh.gov.br/ords/servicos/declara_agua_gerencial/listar_corpohidrico");
            if (!response.ok) throw new Error("Status " + response.status);
            const json = await response.json();
            const select = document.getElementById("int_list_corpohidrico");
            (json.items || []).forEach(function (ch) {
                const opt = document.createElement('option');
                opt.value = ch.nm_corpohidrico;
                opt.textContent = ch.nm_corpohidrico + '        [' + ch.total_corpohidrico + ']';
                select.appendChild(opt);
            });
        } catch (e) {
            console.error("Erro ao popular corpos hídricos:", e);
        }
    }

    function limpar() {
        document.getElementById("int_cpfcnpj").value        = "";
        document.getElementById("int_nome_usr").value       = "";
        document.getElementById("int_nm_emp").value         = "";
        document.getElementById("int_nu_cnarh").value       = "";
        document.getElementById("int_cd_filter").value      = "";
        document.getElementById("int_list_irregular").value = "0";
        document.getElementById("int_list_envio_obrigatorio").value = "0";

        $('#int_list_bacia, #int_list_corpohidrico').val('0').trigger('change');

        buscar();
    }

    function buscar() {
        const nu_cnarh     = document.getElementById("int_nu_cnarh").value.replace(/\D/g, '');
        const int_cd       = document.getElementById("int_cd_filter").value.trim();
        const nm_bacia     = document.getElementById("int_list_bacia").value;
        const corpohidrico = document.getElementById("int_list_corpohidrico").value;
        const irregular    = document.getElementById("int_list_irregular").value;
        const envioObrig   = document.getElementById("int_list_envio_obrigatorio").value;
        const cpfcnpj      = document.getElementById("int_cpfcnpj").value.replace(/\D/g, '');
        const nome_usr     = document.getElementById("int_nome_usr").value.trim().toLowerCase();
        const nm_emp       = document.getElementById("int_nm_emp").value.trim().toLowerCase();

        // Restringe ao órgão gestor do perfil ativo
        let orgNmFiltro = null;
        if (typeof get_orgao_gestor === 'function') {
            const orgao = get_orgao_gestor().orgao;
            if (orgao && ORGAO_TO_ORGNM[orgao]) orgNmFiltro = ORGAO_TO_ORGNM[orgao];
        }

        const filtrados = (_todasInterferencias || []).filter(function (it) {
            if (orgNmFiltro && it.org_nm !== orgNmFiltro) return false;
            if (nu_cnarh && String(it.nu_cnarh || '').replace(/\D/g, '').indexOf(nu_cnarh) === -1) return false;
            if (int_cd && String(it.int_cd || '').indexOf(int_cd) === -1 && String(it.int_cd_origem || '').indexOf(int_cd) === -1) return false;
            if (nm_bacia && nm_bacia !== '0' && it.nm_bacia !== nm_bacia) return false;
            if (corpohidrico && corpohidrico !== '0' && it.corpohidrico !== corpohidrico) return false;
            if (irregular === '1' && it.ic_irregular != 1) return false;
            if (irregular === '2' && it.ic_irregular == 1) return false;
            if (envioObrig === '1' && !it.tfm_ds) return false;
            if (envioObrig === '2' && it.tfm_ds) return false;
            if (cpfcnpj && String(it.emp_nu_cpfcnpj || '').replace(/\D/g, '').indexOf(cpfcnpj) === -1) return false;
            if (nome_usr && fixMojibake(it.emp_nm_responsavel || '').toLowerCase().indexOf(nome_usr) === -1) return false;
            if (nm_emp && fixMojibake(it.emp_nm_empreendimento || '').toLowerCase().indexOf(nm_emp) === -1) return false;
            return true;
        });

        renderizar(filtrados);
    }

    function renderizar(items) {
        const tabela = document.getElementById("tb_interferencias");

        if ($.fn.DataTable.isDataTable('#tb_interferencias')) {
            $('#tb_interferencias').DataTable().destroy();
        }

        // Toda atualização da lista desfaz a seleção e desativa "Detalhar Interferência"
        window._selectedIntCd = null;
        const navLiInt   = document.getElementById('nav-detalhar-int-li');
        const navHintInt = document.getElementById('nav-detalhar-int-hint');
        if (navLiInt)   navLiInt.classList.add('nav-disabled');
        if (navHintInt) {
            navHintInt.textContent = 'Selecione uma interferência';
            navHintInt.classList.remove('nav-hint-active');
        }

        const n_tr = tabela.rows.length;
        for (let j = n_tr - 1; j >= 1; j--) tabela.deleteRow(j);

        let tbody = tabela.getElementsByTagName("tbody");
        tbody = tbody.length === 0 ? document.createElement("tbody") : tbody[0];

        window._intItensRenderizados = items;
        for (let i = 0; i < items.length; i++) tbody.appendChild(AddRow(items[i], i));
        tabela.appendChild(tbody);

        const btnMapaResultados = document.getElementById('int_btn_mapa_resultados');
        if (btnMapaResultados) btnMapaResultados.disabled = false;

        $('#tb_interferencias').DataTable({
            pageLength: 10,
            order: [[2, "asc"]],
            language: {
                lengthMenu:  'Apresentando _MENU_ resultados por página:',
                zeroRecords: 'Nenhum resultado encontrado.',
                info:        'Apresentando página _PAGE_ de _PAGES_ do total de _MAX_ registros',
                infoEmpty:   'Nenhum registo encontrado',
                infoFiltered:'(filtrado do total de _MAX_ registros)'
            }
        });
    }

    function AddRow(it, idx) {
        const row = document.createElement("tr");

        function td(html, opts) {
            const c = document.createElement("td");
            c.innerHTML = (html != null && html !== '') ? html : '-';
            if (opts && opts.center) c.style.textAlign = 'center';
            if (opts && opts.hidden) c.style.display = 'none';
            return c;
        }

        const tdSituacao = document.createElement("td");
        tdSituacao.className = "text-center";
        if (it.ic_irregular == 1) {
            tdSituacao.innerHTML = '<i class="fa fa-ban text-danger" style="font-size: 1.4em;" data-toggle="tooltip" title="Interferência irregular"></i>';
        } else {
            tdSituacao.innerHTML = '<i class="fa fa-check text-success" style="font-size: 1.4em;" data-toggle="tooltip" title="Interferência regular"></i>';
        }

        const orgao = (it.org_nm === 'ANA') ? it.org_nm : (it.org_nm + '/' + it.org_uf);

        row.appendChild(tdSituacao);
        row.appendChild(td(it.int_cd, { center: true }));
        row.appendChild(td(orgao, { center: true }));
        row.appendChild(td(fixMojibake(it.tipo)));
        row.appendChild(td(formatCnpjCpf(it.emp_nu_cpfcnpj), { center: true }));
        row.appendChild(td(fixMojibake(it.emp_nm_responsavel)));
        row.appendChild(td(formatNuCnarh(it.nu_cnarh), { center: true }));
        row.appendChild(td(fixMojibake(it.emp_nm_empreendimento)));
        row.appendChild(td(fixMojibake(it.nm_bacia)));
        row.appendChild(td((it.tfm_ds ? '<span class="badge-envio-obrigatorio">Sim</span>' : 'Não'), { center: true }));
        row.appendChild(td(it.qtd_equipamentos, { center: true }));
        row.appendChild(td(it.total_leituras, { center: true }));

        const tdAcoes = document.createElement("td");
        tdAcoes.className = "text-center";
        tdAcoes.innerHTML =
            '<div class="eq-acoes" style="justify-content:center;">' +
                '<button type="button" class="eq-ab eq-ab--round" data-tip="Detalhar interferência" aria-label="Detalhar interferência" onclick="int_abrir_detalhe(' + idx + ')">' +
                    '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><circle cx="12" cy="7.6" r=".6" fill="currentColor" stroke="none"/></svg>' +
                '</button>' +
                '<button type="button" class="eq-ab" data-tip="Ver no mapa" aria-label="Ver no mapa" onclick="int_abrir_mapa(' + idx + ')">' +
                    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21.5c4.2-4.1 6.5-7.3 6.5-10.6a6.5 6.5 0 1 0-13 0c0 3.3 2.3 6.5 6.5 10.6Z"/><circle cx="12" cy="10.7" r="2.4"/></svg>' +
                '</button>' +
            '</div>';
        row.appendChild(tdAcoes);

        row.appendChild(td(fixMojibake(it.nm_interferencia), { hidden: true }));
        row.appendChild(td(fixMojibake(it.situacao_outorga), { center: true, hidden: true }));
        row.appendChild(td(it.ic_irregular, { hidden: true }));

        return row;
    }

    function _mostrarSkeleton() {
        const tabela = document.getElementById("tb_interferencias");
        const tbody = tabela.tBodies[0] || tabela.createTBody();
        while (tbody.rows.length > 0) tbody.deleteRow(0);

        const widths = ['20px','50px','40px','60px','80px','115px','65px','140px','85px','35px','25px','25px','50px'];
        for (var r = 0; r < 10; r++) {
            var tr = document.createElement('tr');
            widths.forEach(function(w) {
                var td = document.createElement('td');
                td.style.textAlign = 'center';
                td.style.paddingTop = '10px';
                td.style.paddingBottom = '10px';
                var div = document.createElement('div');
                div.className = 'sk-cell';
                div.style.width = w;
                td.appendChild(div);
                tr.appendChild(td);
            });
            for (var c = 0; c < 3; c++) {
                var tdHidden = document.createElement('td');
                tdHidden.style.display = 'none';
                tr.appendChild(tdHidden);
            }
            tbody.appendChild(tr);
        }
    }

    function _setCarregando(ativo) {
        var btnBusc = document.getElementById('int_btn_buscar');
        var btnLimp = document.getElementById('int_btn_limpar');
        if (btnBusc) btnBusc.disabled = ativo;
        if (btnLimp) btnLimp.disabled = ativo;
        if (ativo) _setStatusBar(true, 'Carregando interferências, aguarde...');
        else        _setStatusBar(false);
    }

    async function int_initial() {
        _setCarregando(true);
        _mostrarSkeleton();

        await Promise.all([popular_bacia_int(), popular_corpohidrico_int(), carregar_interferencias()]);

        buscar();          // Phase 1: mostra cache ou primeiros 10 registros
        _setCarregando(false);

        if (!_carregamentoCompleto) {
            // Phase 2: carrega dataset completo em background
            _setStatusBar(true, 'Carregando dados completos...');
            _carregarRestanteBackground(); // fire-and-forget
        }
    }

    function exportar_excel() {
        const items = window._intItensRenderizados || [];
        if (!items.length) {
            if (typeof toastr !== 'undefined') toastr.warning('Não há registros para exportar.');
            else alert('Não há registros para exportar.');
            return false;
        }

        const linhas = items.map(function (it) {
            const orgao = (it.org_nm === 'ANA') ? it.org_nm : (it.org_nm + '/' + it.org_uf);
            return {
                'Situação Regularidade': (it.ic_irregular == 1) ? 'Situação Irregular' : 'Situação Regular',
                'Nº Interferência':       it.int_cd,
                'Órgão Gestor':           orgao,
                'Tipo':                   fixMojibake(it.tipo),
                'CPF/CNPJ':               formatCnpjCpf(it.emp_nu_cpfcnpj),
                'Nome do Usuário':        fixMojibake(it.emp_nm_responsavel),
                'NU_CNARH':               formatNuCnarh(it.nu_cnarh),
                'Empreendimento':         fixMojibake(it.emp_nm_empreendimento),
                'Bacia':                  fixMojibake(it.nm_bacia),
                'Envio Obrigatório':      it.tfm_ds ? 'Sim' : 'Não',
                'Qtd. Equipamentos':      it.qtd_equipamentos,
                'Total Leituras':         it.total_leituras,
                'Nome Interferência':     fixMojibake(it.nm_interferencia),
                'Situação Outorga':       fixMojibake(it.situacao_outorga)
            };
        });

        const planilha = XLSX.utils.json_to_sheet(linhas);
        const livro    = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(livro, planilha, 'Interferências');

        const agora = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        const dataHora = agora.getFullYear() + pad(agora.getMonth() + 1) + pad(agora.getDate()) +
            '_' + pad(agora.getHours()) + pad(agora.getMinutes()) + pad(agora.getSeconds());

        XLSX.writeFile(livro, 'lista_interferencias_' + dataHora + '.xlsx');
        return true;
    }

    function exportar_excel_ui(btn) {
        const label = btn.querySelector('.bx-label');
        const xls   = btn.querySelector('.xls');
        const iconeOriginal = xls ? xls.outerHTML : '<span class="xls">XLS</span>';
        const textoOriginal = label ? label.textContent : 'Exportar Excel';

        btn.disabled = true;
        if (xls)   xls.outerHTML = '<span class="spin"></span>';
        if (label) label.textContent = 'Gerando…';

        setTimeout(function () {
            let sucesso = false;
            try { sucesso = exportar_excel(); } catch (e) { console.error('Erro ao exportar Excel:', e); }

            const spin = btn.querySelector('.spin');
            if (sucesso) {
                if (spin) {
                    spin.outerHTML =
                        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" ' +
                        'stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">' +
                        '<path d="M5 13l4 4 10-11"/></svg>';
                }
                if (label) label.textContent = 'Pronto!';
            } else {
                if (spin) spin.outerHTML = iconeOriginal;
                if (label) label.textContent = textoOriginal;
                btn.disabled = false;
                return;
            }

            setTimeout(function () {
                const iconeAtual = btn.querySelector('.spin, svg');
                if (iconeAtual) iconeAtual.outerHTML = iconeOriginal;
                if (label) label.textContent = textoOriginal;
                btn.disabled = false;
            }, 1500);
        }, 600);
    }

    window.int_initial = int_initial;
    window.int_buscar  = buscar;
    window.int_limpar  = limpar;
    window.int_exportar_excel    = exportar_excel;
    window.int_exportar_excel_ui = exportar_excel_ui;

})();
