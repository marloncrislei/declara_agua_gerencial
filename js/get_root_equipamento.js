(function () {

    // PUT — id_equipamento, new_tipo_equipamento e new_unidade_equipamento são enviados
    // via HEADER (não query string/body), junto com Authorization. O retorno (:mensagem)
    // é um SYS_REFCURSOR, então o ORDS expõe como { "mensagem": [ {...uma linha...} ] },
    // com colunas variando por caminho (sucesso inclui "id_equipamento"; erros trazem
    // só "info", "autenticacao" ou "erro"+"detalhe").
    var URL_SALVAR_EQUIPAMENTO = "https://ows.snirh.gov.br/ords/servicos/declara_agua_gerencial/atualizar_tipo_unidade_equipamento";

    var _backdrop = null;
    var _FADE = 300;
    var _itemAtual = null;
    var _tiposCarregados = false;
    var _unidadesCarregadas = false;
    // Callback executado após salvar com sucesso. Cada ponto de entrada define o seu
    // (lista de equipamentos → recarrega a busca; consistência → recarrega leituras).
    var _aoSalvar = null;

    // Endpoint de descrição do equipamento (mesmo usado na view "Detalhar Equipamento").
    var URL_EQUIPAMENTO = "https://ows.snirh.gov.br/ords/prd11/servicos/declara_agua_gerencial/equipamento?in_id_equipamento=";

    function avisar(tipo, msg) {
        if (typeof toastr !== 'undefined') toastr[tipo](msg);
        else alert(msg);
    }

    function valor(v) {
        return (v != null && v !== '') ? v : '–';
    }

    function formatarUnidade(nome, sigla) {
        if (!nome) return '';
        return sigla ? (nome + ' (' + sigla + ')') : nome;
    }

    // ===== Modal open/close (mesmo padrão dos demais modais do app) =====
    function fecharModal() {
        var $m = $('#rootEquipModal');
        $m.removeClass('in').attr('aria-hidden', 'true');
        $('body').removeClass('modal-open');
        var bd = _backdrop;
        _backdrop = null;
        setTimeout(function () {
            $m.css('display', 'none');
            if (bd) bd.remove();
            $('.modal-backdrop').remove();
            // Se este modal foi aberto por cima de outro (ex.: consistência de leituras),
            // restaura o backdrop/estado do modal que continua aberto ao fundo.
            if ($('.modal.in').length) {
                $('body').append('<div class="modal-backdrop fade in"></div>');
                $('body').addClass('modal-open');
            }
        }, _FADE);
    }

    $(document).on('click', '#rootEquipModal [data-dismiss="modal"]', function (e) {
        e.preventDefault();
        fecharModal();
    });

    function abrirModal() {
        var $m = $('#rootEquipModal');
        if ($m.hasClass('in')) return;
        _backdrop = $('<div class="modal-backdrop fade"></div>');
        $('body').append(_backdrop);
        _backdrop[0].offsetWidth;
        _backdrop.addClass('in');
        $m.css('display', 'block').removeAttr('aria-hidden');
        $m[0].offsetWidth;
        $m.addClass('in');
        $('body').addClass('modal-open');
        _backdrop.one('click', fecharModal);
    }

    // ===== Popular select "Tipo de Equipamento" (serviço com id_tipo_equipamento) =====
    async function popularTiposEquipamento() {
        var select = document.getElementById('root_edit_tipo_equipamento');
        if (_tiposCarregados) return;
        try {
            const response = await fetch("https://ows.snirh.gov.br/ords/servicos/declara_agua_gerencial/relaciona_tipo_equipamento");
            if (!response.ok) throw new Error("Status " + response.status);
            const json = await response.json();
            (json.items || []).forEach(function (tp) {
                const nome = tp.nm_tipo_equipamento || tp.tipo_equipamento || '';
                const opt = document.createElement('option');
                opt.value = tp.id_tipo_equipamento;
                opt.textContent = nome;
                select.appendChild(opt);
            });
            _tiposCarregados = true;
        } catch (e) {
            console.error("Erro ao popular tipos de equipamento:", e);
        }
    }

    // ===== Popular select "Unidade do Equipamento" =====
    async function popularUnidadesEquipamento() {
        var select = document.getElementById('root_edit_unidade_equipamento');
        if (_unidadesCarregadas) return;
        try {
            const response = await fetch("https://ows.snirh.gov.br/ords/servicos/declara_agua_gerencial/listar_unidade_equipamento");
            if (!response.ok) throw new Error("Status " + response.status);
            const json = await response.json();
            (json.items || []).forEach(function (u) {
                const nome = u.nm_unidade_equipamento || u.unidade_equipamento || '';
                const opt = document.createElement('option');
                opt.value = u.id_unidade_equipamento;
                opt.textContent = formatarUnidade(nome, u.sg_unidade_equipamento);
                opt.dataset.nome = nome;
                opt.dataset.sigla = u.sg_unidade_equipamento || '';
                select.appendChild(opt);
            });
            _unidadesCarregadas = true;
        } catch (e) {
            console.error("Erro ao popular unidades de equipamento:", e);
        }
    }

    // Seleciona a opção de um <select> cujo dataset[campo] (normalizado) casa com o alvo
    function selecionarPorDataset(select, campo, alvo) {
        var esperado = normalizar(alvo);
        if (!esperado) return false;
        for (var i = 0; i < select.options.length; i++) {
            if (normalizar(select.options[i].dataset[campo]) === esperado) {
                select.value = select.options[i].value;
                return true;
            }
        }
        return false;
    }

    // Pré-seleciona o tipo atual: por id quando disponível, senão pelo nome exibido
    function preselecionarTipo(it) {
        var select = document.getElementById('root_edit_tipo_equipamento');
        select.value = '';
        if (it.id_tipo_equipamento != null && it.id_tipo_equipamento !== '') {
            select.value = String(it.id_tipo_equipamento);
        }
        if (!select.value && it.nm_tipo_equipamento) {
            for (var i = 0; i < select.options.length; i++) {
                if (normalizar(select.options[i].textContent) === normalizar(it.nm_tipo_equipamento)) {
                    select.value = select.options[i].value;
                    break;
                }
            }
        }
    }

    // Pré-seleciona a unidade atual: por id quando disponível, senão por nome, senão por sigla
    function preselecionarUnidade(it) {
        var select = document.getElementById('root_edit_unidade_equipamento');
        select.value = '';
        if (it.id_unidade_equipamento != null && it.id_unidade_equipamento !== '') {
            select.value = String(it.id_unidade_equipamento);
        }
        if (!select.value) preselecionarUnidadePorNomeSigla(select, it);
    }

    function preselecionarUnidadePorNomeSigla(select, it) {
        if (selecionarPorDataset(select, 'nome', it.nm_unidade_equipamento)) return;
        selecionarPorDataset(select, 'sigla', it.sg_unidade_equipamento);
    }

    // ===== Preenche o modal a partir de um item já resolvido =====
    async function preencherModal(it) {
        _itemAtual = it;

        var unidadeAtual = it.nm_unidade_equipamento
            ? formatarUnidade(it.nm_unidade_equipamento, it.sg_unidade_equipamento)
            : (it.sg_unidade_equipamento || '');

        document.getElementById('root_eq_cpfcnpj').textContent       = valor(it.emp_nu_cpfcnpj);
        document.getElementById('root_eq_nm_usuario').textContent    = valor(it.emp_nm_responsavel);
        document.getElementById('root_eq_nu_cnarh').textContent      = valor(it.nu_cnarh);
        document.getElementById('root_eq_empreendimento').textContent = valor(it.emp_nm_empreendimento);
        document.getElementById('root_eq_interferencia').textContent = valor(it.nm_interferencia);
        document.getElementById('root_eq_tipo_atual').textContent    = valor(it.nm_tipo_equipamento);
        document.getElementById('root_eq_unidade_atual').textContent = valor(unidadeAtual);

        document.getElementById('root_btn_salvar').disabled = true;

        await Promise.all([popularTiposEquipamento(), popularUnidadesEquipamento()]);

        preselecionarTipo(it);
        preselecionarUnidade(it);

        validarSalvar();
        abrirModal();
    }

    // ===== Abertura a partir da "Lista de Equipamentos" (item já renderizado) =====
    async function abrirIdentificacao(idx) {
        var it = (window._equipItensRenderizados || [])[idx];
        if (!it) return;
        _aoSalvar = (typeof window.buscar === 'function') ? window.buscar : null;
        await preencherModal(it);
    }

    // ===== Abertura a partir do modal de consistência (busca dados por id) =====
    async function abrirIdentificacaoEquip(idEquip, aoSalvar) {
        if (!idEquip) return;
        _aoSalvar = (typeof aoSalvar === 'function') ? aoSalvar : null;
        try {
            var token = (typeof getCookie === 'function') ? getCookie('token') : null;
            const response = await fetch(URL_EQUIPAMENTO + encodeURIComponent(idEquip), {
                headers: { 'Authorization': token || '' }
            });
            if (!response.ok) throw new Error("Status " + response.status);
            const json = await response.json();
            var eq = (json.items && json.items[0]) || {};
            var it = {
                id_equipamento:         idEquip,
                emp_nu_cpfcnpj:         eq.emp_nu_cpfcnpj,
                emp_nm_responsavel:     eq.emp_nm_responsavel,
                nu_cnarh:               eq.emp_nu_cnarh,
                emp_nm_empreendimento:  eq.emp_nm_empreendimento,
                nm_interferencia:       eq.nm_interferencia || eq.id_interferencia,
                nm_tipo_equipamento:    eq.nm_tipo_equipamento,
                id_tipo_equipamento:    eq.id_tipo_equipamento,
                nm_unidade_equipamento: eq.nm_unidade_equipamento,
                sg_unidade_equipamento: eq.sg_unidade_equipamento,
                id_unidade_equipamento: eq.id_unidade_equipamento
            };
            await preencherModal(it);
        } catch (e) {
            console.error("Erro ao carregar equipamento para edição:", e);
            avisar('error', 'Não foi possível carregar os dados do equipamento.');
        }
    }

    // Só libera "Salvar" quando equipamento + novo tipo + nova unidade estiverem identificados
    function validarSalvar() {
        var idTipo    = document.getElementById('root_edit_tipo_equipamento').value;
        var idUnidade = document.getElementById('root_edit_unidade_equipamento').value;
        var habilitado = !!(_itemAtual && _itemAtual.id_equipamento && idTipo && idUnidade);
        document.getElementById('root_btn_salvar').disabled = !habilitado;
    }

    function removerAcentos(s) {
        return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '');
    }

    function normalizar(s) {
        return removerAcentos(s).toUpperCase();
    }

    // Tipo "Horímetro" implica, por padrão, unidade "Horas (H)"
    function aplicarRegraHorimetro() {
        var selectTipo = document.getElementById('root_edit_tipo_equipamento');
        var opcaoTipo  = selectTipo.options[selectTipo.selectedIndex];
        if (!opcaoTipo || normalizar(opcaoTipo.textContent) !== 'HORIMETRO') return;

        var selectUnidade = document.getElementById('root_edit_unidade_equipamento');
        for (var i = 0; i < selectUnidade.options.length; i++) {
            if (normalizar(selectUnidade.options[i].dataset.nome) === 'HORAS') {
                selectUnidade.value = selectUnidade.options[i].value;
                break;
            }
        }
    }

    $(document).on('change', '#root_edit_tipo_equipamento', function () {
        aplicarRegraHorimetro();
        validarSalvar();
    });
    $(document).on('change', '#root_edit_unidade_equipamento', validarSalvar);

    // ===== Salvar alterações =====
    async function salvar() {
        if (!_itemAtual) return;

        var selectTipo    = document.getElementById('root_edit_tipo_equipamento');
        var novoIdTipo    = selectTipo.value;
        var novoNomeTipo  = (selectTipo.options[selectTipo.selectedIndex] || {}).textContent || '';
        var novoIdUnidade = document.getElementById('root_edit_unidade_equipamento').value;
        var btnSalvar     = document.getElementById('root_btn_salvar');

        if (!_itemAtual.id_equipamento || !novoIdTipo || !novoIdUnidade) {
            avisar('warning', 'Equipamento, tipo e unidade precisam estar identificados para salvar.');
            return;
        }

        if (!confirm('Confirma a alteração do tipo e da unidade deste equipamento?')) return;

        btnSalvar.disabled = true;
        try {
            var token = (typeof getCookie === 'function') ? getCookie('token') : null;
            const response = await fetch(URL_SALVAR_EQUIPAMENTO, {
                method: 'PUT',
                headers: {
                    'Authorization': token || '',
                    'id_equipamento': String(_itemAtual.id_equipamento),
                    'new_tipo_equipamento': String(novoIdTipo),
                    'new_unidade_equipamento': String(novoIdUnidade)
                }
            });

            const json = await response.json();
            var linha = (json.mensagem && json.mensagem[0]) || {};

            // Sucesso é a única linha do cursor que traz "id_equipamento" de volta.
            var sucesso = response.ok && linha.id_equipamento != null;
            var textoMsg = linha.info || linha.autenticacao || linha.erro ||
                (sucesso ? 'Equipamento atualizado com sucesso.' : 'Não foi possível atualizar o equipamento.');

            if (!sucesso) {
                avisar('error', textoMsg);
                btnSalvar.disabled = false;
                return;
            }

            avisar('success', textoMsg);
            fecharModal();

            if (typeof _aoSalvar === 'function') _aoSalvar(novoNomeTipo);
            else if (typeof window.buscar === 'function') window.buscar();
        } catch (e) {
            console.error('Erro ao salvar identificação do equipamento:', e);
            avisar('error', 'Erro ao salvar as alterações do equipamento.');
            btnSalvar.disabled = false;
        }
    }

    window.root_abrir_identificacao      = abrirIdentificacao;
    window.root_abrir_identificacao_equip = abrirIdentificacaoEquip;
    window.root_salvar_identificacao     = salvar;

})();
