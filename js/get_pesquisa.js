async function initial() {
    await Promise.all([
        popular_orgao(),
        popular_bacia(),
        popular_corpohidrico(),
        popular_tipo_equipamento(),
        buscar()
    ]);
}

async function popular_orgao() {
    try {
        const response = await fetch("https://ows.snirh.gov.br/ords/servicos/declara_agua_gerencial/pesquisar_orgao");
        if (!response.ok) throw new Error("Status " + response.status);
        const json = await response.json();
        const select = document.getElementById("list_org");
        (json.items || []).forEach(function (orgao) {
            const opt = document.createElement('option');
            opt.value = orgao.org_nm;
            opt.textContent = orgao.org_nm + ' - ' + orgao.org_uf;
            select.appendChild(opt);
        });
    } catch (e) {
        console.error("Erro ao popular órgãos:", e);
    }
}

async function popular_bacia() {
    try {
        const response = await fetch("https://ows.snirh.gov.br/ords/servicos/declara_agua_gerencial/listar_bacia");
        if (!response.ok) throw new Error("Status " + response.status);
        const json = await response.json();
        const select = document.getElementById("list_bacia");
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

async function popular_corpohidrico() {
    try {
        const response = await fetch("https://ows.snirh.gov.br/ords/servicos/declara_agua_gerencial/listar_corpohidrico");
        if (!response.ok) throw new Error("Status " + response.status);
        const json = await response.json();
        const select = document.getElementById("list_corpohidrico");
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

async function popular_tipo_equipamento() {
    try {
        const response = await fetch("https://ows.snirh.gov.br/ords/servicos/declara_agua_gerencial/listar_tipo_equipamento");
        if (!response.ok) throw new Error("Status " + response.status);
        const json = await response.json();
        const select = document.getElementById("tp_equipamento");
        (json.items || []).forEach(function (tp) {
            const opt = document.createElement('option');
            opt.value = tp.tipo_equipamento;
            opt.textContent = tp.tipo_equipamento + '        [' + tp.total_tipo_equipamento + ']';
            select.appendChild(opt);
        });
    } catch (e) {
        console.error("Erro ao popular tipos de equipamento:", e);
    }
}

function desselecionarDetalhamentos() {
    // "Detalhar Equipamento"
    window._selectedIdEquipamento = null;
    $('#tb_leituras_gerencial tbody tr').removeClass('row-selected').css('background-color', '');
    var navEquipLi   = document.getElementById('nav-detalhar-equip-li');
    var navEquipHint = document.getElementById('nav-detalhar-hint');
    if (navEquipLi)   navEquipLi.classList.add('nav-disabled');
    if (navEquipHint) {
        navEquipHint.textContent = 'Selecione um equipamento';
        navEquipHint.classList.remove('nav-hint-active');
    }

    // "Detalhar Interferência"
    window._selectedIntCd = null;
    var navIntLi   = document.getElementById('nav-detalhar-int-li');
    var navIntHint = document.getElementById('nav-detalhar-int-hint');
    if (navIntLi)   navIntLi.classList.add('nav-disabled');
    if (navIntHint) {
        navIntHint.textContent = 'Selecione uma interferência';
        navIntHint.classList.remove('nav-hint-active');
    }
}

function limpar() {
    desselecionarDetalhamentos();

    document.getElementById("nome_usr").value   = "";
    document.getElementById("cpfcnpj").value    = "";
    document.getElementById("nm_equip").value   = "";
    document.getElementById("int_cd").value     = "";
    document.getElementById("nm_emp").value     = "";
    document.getElementById("nu_cnarh").value   = "";
    document.getElementById("min_leituras").value = 0;

    $('.lista-pesquisavel').val('0').trigger('change');

    if ($.fn.DataTable.isDataTable('#tb_leituras_gerencial')) {
        $('#tb_leituras_gerencial').DataTable().destroy();
    }
    $('#tb_leituras_gerencial').find('tbody').empty();
}

async function buscar() {
    desselecionarDetalhamentos();

    const nome_usr       = '%' + document.getElementById("nome_usr").value + '%';
    const nm_equip       = '%' + document.getElementById("nm_equip").value + '%';
    const nm_emp         = '%' + document.getElementById("nm_emp").value + '%';
    let   cpf_cnpj       = document.getElementById("cpfcnpj").value       || '%';
    let   nm_bacia       = document.getElementById("list_bacia").value;
    let   int_cd         = document.getElementById("int_cd").value         || '%';
    let   nu_cnarh       = document.getElementById("nu_cnarh").value       || '%';
    let   min_leitura    = document.getElementById("min_leituras").value   || '0';
    let   min_atraso     = document.getElementById("min_atraso").value     || '0';
    let   nm_corpohidrico= document.getElementById("list_corpohidrico").value;
    let   tp_equipamento = document.getElementById("tp_equipamento").value;

    // Trava o órgão pelo perfil ativo
    const match      = document.cookie.match(new RegExp('(?:^|;\\s*)__Perfil_Ativo=([^;]*)'));
    const perfilAtivo= match ? decodeURIComponent(match[1]) : null;
    const PERFIS_ORG = { 765: 'ANA', 766: 'NATURATINS', 767: 'ANA', 768: 'SP AGUAS', 769: 'NATURATINS', 770: 'SP AGUAS', 771: 'INEA', 772: 'INEA', 773: 'ANA' };
    let   nm_org     = (perfilAtivo && PERFIS_ORG[perfilAtivo]) ? PERFIS_ORG[perfilAtivo] : '%';

    if (nm_bacia      === '0' || nm_bacia      === 'Selecione uma Opção') nm_bacia      = '%';
    if (nm_org        === '0') nm_org        = '%';
    if (nm_corpohidrico === '0') nm_corpohidrico = '%';
    if (tp_equipamento  === '0') tp_equipamento  = '%';

    await main(nome_usr, cpf_cnpj, nm_equip, nm_bacia, int_cd, nm_emp, nu_cnarh, min_leitura, min_atraso, nm_org, nm_corpohidrico, tp_equipamento);
}

async function get_leituras(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Erro ao buscar equipamentos: " + response.status);
    return response.json();
}

(function ($) {
    remove = function (item) {
        $(item).closest('tr').remove();
        return false;
    };
})(jQuery);

async function main(nome_usr, cpf_cnpj, nm_equip, nm_bacia, int_cd, nm_emp, nu_cnarh, min_leitura, min_atraso, nm_org, nm_corpohidrico, tp_equipamento) {
    let url = "https://ows.snirh.gov.br/ords/prd11/servicos/declara_agua_gerencial/pesquisar_equipamento";
    url += "?in_nome_usr="      + nome_usr
        + "&in_cpf_cnpj="       + cpf_cnpj
        + "&in_nm_equip="       + nm_equip
        + "&in_nm_bacia="       + nm_bacia
        + "&in_int_cd="         + int_cd
        + "&in_nm_emp="         + nm_emp
        + "&in_nu_cnarh="       + nu_cnarh
        + "&in_min_leitura="    + min_leitura
        + "&in_min_atraso="     + min_atraso
        + "&in_nm_org="         + nm_org
        + "&in_nm_corpohidrico=" + nm_corpohidrico
        + "&in_tp_equipamento=" + tp_equipamento;

    let items = [];
    try {
        const json = await get_leituras(url);
        items = json.items || [];
    } catch (e) {
        console.error("Erro ao carregar equipamentos:", e);
    }

    const tabela = document.getElementById("tb_leituras_gerencial");

    if ($.fn.DataTable.isDataTable('#tb_leituras_gerencial')) {
        $('#tb_leituras_gerencial').DataTable().destroy();
    }

    const n_tr = tabela.rows.length;
    for (let j = n_tr - 1; j >= 1; j--) {
        tabela.deleteRow(j);
    }

    let tbody = tabela.getElementsByTagName("tbody");
    tbody = tbody.length === 0 ? document.createElement("tbody") : tbody[0];

    window._equipItensRenderizados = items;
    for (let i = 0; i < items.length; i++) {
        tbody.appendChild(AddRow(items[i], i));
    }
    tabela.appendChild(tbody);

    table = $('#tb_leituras_gerencial').DataTable({
        pageLength: 10,
        order: [[3, "desc"]],
        language: {
            lengthMenu:  'Apresentando _MENU_ resultados por página:',
            zeroRecords: 'Nenhum resultado encontrado.',
            info:        'Apresentando página _PAGE_ de _PAGES_ do total de _MAX_ registros',
            infoEmpty:   'Nenhum registo encontrado',
            infoFiltered:'(filtrado do total de _MAX_ registros)'
        }
    });
}

function AddRow(leituras, idx) {
    leitura_row              = document.createElement("tr");
    td_Situacao              = document.createElement("td");
    td_org_nm                = document.createElement("td");
    td_nm_equipamento        = document.createElement("td");
    td_qt_leituras           = document.createElement("td");
    td_dias_ultima           = document.createElement("td");
    td_nm_bacia              = document.createElement("td");
    td_emp_nu_cpfcnpj        = document.createElement("td");
    td_emp_nm_responsavel    = document.createElement("td");
    td_nu_cnarh              = document.createElement("td");
    td_emp_nm_empreendimento = document.createElement("td");
    td_id_interferencia      = document.createElement("td");
    td_nm_tipo_equipamento   = document.createElement("td");
    td_contato_operador      = document.createElement("td");
    td_corpohidrico          = document.createElement("td");
    td_id_equipamento        = document.createElement("td");
    td_id_arquivo            = document.createElement("td");
    td_acoes                 = document.createElement("td");

    td_Situacao.className = "text-center";
    if (leituras.qtd_leituras == 0) {
        td_Situacao.innerHTML = '<i class="fa fa-times text-danger" data-toggle="tooltip" data-placement="right" title="Equipamento não possui leitura transmitida."></i>';
    } else if (leituras.nu_consistidas == leituras.qtd_leituras) {
        td_Situacao.innerHTML = '<i class="fa fa-check text-success" data-toggle="tooltip" data-placement="right" title="Todas as leituras estão consistidas"></i>';
    } else {
        td_Situacao.innerHTML = '<i class="fa fa-exclamation-triangle text-warning" data-toggle="tooltip" data-placement="right" title="Existem ' + (leituras.qtd_leituras - leituras.nu_consistidas) + ' leituras pendentes de consistência para esse equipamento."></i>';
    }

    td_org_nm.innerHTML                = leituras.org_nm;
    td_nm_equipamento.innerHTML        = leituras.nm_equipamento;
    td_qt_leituras.innerHTML           = leituras.qtd_leituras;
    td_dias_ultima.innerHTML           = leituras.dias_da_ultima_leitura;
    td_nm_bacia.innerHTML              = leituras.nm_bacia;
    td_emp_nu_cpfcnpj.innerHTML        = leituras.emp_nu_cpfcnpj;
    td_emp_nm_responsavel.innerHTML    = leituras.emp_nm_responsavel;
    td_nu_cnarh.innerHTML              = leituras.nu_cnarh;
    td_emp_nm_empreendimento.innerHTML = leituras.emp_nm_empreendimento;
    td_id_interferencia.innerHTML      = leituras.id_interferencia;
    td_nm_tipo_equipamento.innerHTML   = leituras.nm_tipo_equipamento;
    td_corpohidrico.innerHTML          = leituras.corpohidrico;
    td_id_equipamento.innerHTML        = leituras.id_equipamento;
    td_id_arquivo.innerHTML            = leituras.id_arquivo;

    var btnDetalhar = document.createElement('button');
    btnDetalhar.type = 'button';
    btnDetalhar.className = 'btn-detalhar-equip';
    btnDetalhar.title = 'Detalhar Equipamento';
    btnDetalhar.style.display = 'none';
    btnDetalhar.dataset.idEquip = leituras.id_equipamento;
    btnDetalhar.dataset.nmEquip = leituras.nm_equipamento || '';
    btnDetalhar.innerHTML = '<img src="icones-menu/menu-equipamentos.svg" style="width:16px;height:16px;vertical-align:middle;" alt="Detalhar">';
    td_acoes.appendChild(btnDetalhar);

    var acoesWrap = document.createElement('div');
    acoesWrap.className = 'eq-acoes';

    var btnFoto = document.createElement('button');
    btnFoto.type = 'button';
    btnFoto.className = 'eq-ab eq-ab--round btn-foto-equip';
    btnFoto.setAttribute('data-tip', 'Detalhar equipamento');
    btnFoto.setAttribute('aria-label', 'Detalhar equipamento');
    btnFoto.dataset.idx = idx;
    btnFoto.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><circle cx="12" cy="7.6" r=".6" fill="currentColor" stroke="none"/></svg>';
    acoesWrap.appendChild(btnFoto);

    // Botão de identificação/edição cadastral do equipamento — disponível aos perfis Gestor
    // (Federal/ANA, TO, SP, RJ e Root), ou seja, todos com permissão de edição. Ocultado para visualização.
    var podeEditarEquip = (typeof get_orgao_gestor === 'function') && get_orgao_gestor().permissao_edit;
    if (podeEditarEquip) {
        var btnRoot = document.createElement('button');
        btnRoot.type = 'button';
        btnRoot.className = 'eq-ab btn-root-equip';
        btnRoot.setAttribute('data-tip', 'Alterar tipo/unidade do equipamento');
        btnRoot.setAttribute('aria-label', 'Alterar tipo e unidade do equipamento');
        btnRoot.dataset.idx = idx;
        btnRoot.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2.3"/><circle cx="8" cy="17" r="2.3"/></svg>';
        acoesWrap.appendChild(btnRoot);
    }

    td_acoes.appendChild(acoesWrap);

    if (leituras.contato_operador == null) {
        td_contato_operador.innerHTML = "";
    } else {
        const c  = leituras.contato_operador;
        const fmt = "(" + c.substr(0,2) + ") " + c.substr(2,5) + "-" + c.substr(7,4);
        td_contato_operador.innerHTML = '<a href="https://api.whatsapp.com/send?phone=55' + c + '" target="_blank"><img class="img_zap" src="images/whatsapp.png" height="25" width="25" alt="Clique para iniciar uma conversa."> ' + fmt + '</a>';
    }

    td_org_nm.style                = "text-align:center;vertical-align:middle";
    td_acoes.style                 = "text-align:center;vertical-align:middle";
    td_qt_leituras.style           = "text-align:center;vertical-align:middle";
    td_dias_ultima.style           = "text-align:left;vertical-align:middle";
    td_nu_cnarh.style              = "text-align:center;vertical-align:middle";
    td_emp_nu_cpfcnpj.style        = "text-align:center;vertical-align:middle";
    td_id_interferencia.style      = "text-align:center;vertical-align:middle";
    td_nm_tipo_equipamento.style   = "text-align:center;vertical-align:middle";
    td_nm_equipamento.style        = "vertical-align:middle";
    td_nm_bacia.style              = "vertical-align:middle";
    td_emp_nm_responsavel.style    = "vertical-align:middle";
    td_emp_nm_empreendimento.style = "vertical-align:middle";
    td_corpohidrico.style          = "vertical-align:middle";
    td_contato_operador.style      = "text-align:center;vertical-align:middle";
    td_id_equipamento.style        = "display:none";
    td_id_arquivo.style            = "display:none";

    leitura_row.appendChild(td_Situacao);
    leitura_row.appendChild(td_org_nm);
    leitura_row.appendChild(td_nm_equipamento);
    leitura_row.appendChild(td_qt_leituras);
    leitura_row.appendChild(td_dias_ultima);
    leitura_row.appendChild(td_nm_bacia);
    leitura_row.appendChild(td_emp_nu_cpfcnpj);
    leitura_row.appendChild(td_emp_nm_responsavel);
    leitura_row.appendChild(td_nu_cnarh);
    leitura_row.appendChild(td_emp_nm_empreendimento);
    leitura_row.appendChild(td_id_interferencia);
    leitura_row.appendChild(td_nm_tipo_equipamento);
    leitura_row.appendChild(td_contato_operador);
    leitura_row.appendChild(td_corpohidrico);
    leitura_row.appendChild(td_id_equipamento);
    leitura_row.appendChild(td_id_arquivo);
    leitura_row.appendChild(td_acoes);

    return leitura_row;
}
