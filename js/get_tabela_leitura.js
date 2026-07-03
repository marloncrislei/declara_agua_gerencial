(function () {

function get_orgao_gestor() {
    const cookies = document.cookie.split(';');
    let token      = null;
    let perfilAtivo = null;

    for (const c of cookies) {
        const part = c.trim();
        if (part.startsWith("token="))
            token = part.slice("token=".length);
        if (part.startsWith("__Perfil_Ativo="))
            perfilAtivo = parseInt(part.split('=')[1]);
    }

    // Mapeamento completo: código → órgão para in_uf_orgao e permissão de edição
    const MAP = {
        765: { orgao: "BR", permissao_edit: true  }, // Gestor Federal        (ANA)
        766: { orgao: "TO", permissao_edit: true  }, // Gestor TO             (NATURATINS)
        767: { orgao: "BR", permissao_edit: false }, // Visualização Federal  (ANA)
        768: { orgao: "SP", permissao_edit: true  }, // Gestor SP             (SP AGUAS)
        769: { orgao: "TO", permissao_edit: false }, // Visualização TO       (NATURATINS)
        770: { orgao: "SP", permissao_edit: false }, // Visualização SP       (SP AGUAS)
        771: { orgao: "RJ", permissao_edit: true  }, // Gestor RJ             (INEA)
        772: { orgao: "RJ", permissao_edit: false }, // Visualização RJ       (INEA)
        773: { orgao: "BR", permissao_edit: true, permissao_root: true }, // Root Federal (ANA) — acesso a dados restritos
    };

    // Usa o perfil ativo selecionado pelo usuário, se disponível
    if (perfilAtivo && MAP[perfilAtivo]) {
        const temCookie = cookies.some(c => c.trim().startsWith(`__Secure_Perfil_${perfilAtivo}=`));
        if (temCookie) return { ...MAP[perfilAtivo], token };
    }

    // Fallback: primeiro perfil disponível nos cookies
    for (const c of cookies) {
        const part = c.trim();
        if (part.startsWith("__Secure_Perfil_")) {
            const codigo = parseInt(part.split('=')[0].replace("__Secure_Perfil_", ""));
            if (MAP[codigo]) return { ...MAP[codigo], token };
        }
    }

    return { orgao: null, permissao_edit: false, token };
}

async function initial() {
    const orgao = get_orgao_gestor().orgao;

    try {
        const response = await fetch(
            'https://ows.snirh.gov.br/ords/servicos/declara_agua_gerencial/ultimo_dia_leitura_max_sincronizacao?in_uf_orgao=' + orgao
        );
        if (!response.ok) throw new Error("Status " + response.status);
        const json = await response.json();
        const items = json.items || [];
        if (items.length > 0) {
            document.getElementById("calendario").value = items[0].last_dt_sincronizacao;
        }
    } catch (e) {
        console.warn("Não foi possível obter a data de sincronismo. Usando data atual.", e);
        const dateNow = new Date();
        const dia = String(dateNow.getDate()).padStart(2, '0');
        const mes = String(dateNow.getMonth() + 1).padStart(2, '0');
        document.getElementById("calendario").value = dia + "/" + mes + "/" + dateNow.getFullYear();
    }

    // Leituras + bacias + anos em paralelo
    await Promise.all([
        main(),
        popular_bacia(),
        popular_ano_leitura('%')
    ]);

    try { window.parent.postMessage({ type: 'consistencia-data-ready' }, '*'); } catch (e) {}
}

async function get_leituras(url, token) {
    const response = await fetch(url, { headers: { "Authorization": token } });
    if (!response.ok) throw new Error("Erro ao buscar leituras: " + response.status);
    return response.json();
}

(function ($) {
    remove = function (item) {
        var tr = $(item).closest('tr');
        tr.remove();
        return false;
    };
})(jQuery);

async function verificar_token_leitura() {
    function getCookieLocal(name) {
        var match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
        return match ? match[2] : null;
    }

    try {
        if (typeof valida_token === "function") {
            let ic_token = valida_token(getCookieLocal("token"));
            if (ic_token == null || ic_token == 0) {
                window.location.href = "login.html";
                return false;
            }
            return true;
        }

        const token = getCookieLocal("token");
        if (!token) {
            window.location.href = "login.html";
            return false;
        }
        const response = await fetch(
            "https://ows.snirh.gov.br:443/ords/servicos/seguranca/valida-token?token=" + token
        );
        if (response.ok) {
            const data = await response.json();
            if (data && data.items && data.items.length > 0 && data.items[0].token_valido == 1) {
                return true;
            }
        }
        window.location.href = "login.html";
        return false;
    } catch (e) {
        console.error("Erro na verificação do token:", e);
        window.location.href = "login.html";
        return false;
    }
}

async function main() {
    if (!await verificar_token_leitura()) return;

    const orgao = get_orgao_gestor().orgao;
    const token = get_orgao_gestor().token;

    let leituras_json = { items: [] };

    try {
        if (document.getElementById("radio_data").checked) {
            const data = document.getElementById("calendario").value;
            leituras_json = await get_leituras(
                "https://ows.snirh.gov.br/ords/servicos/declara_agua_gerencial/consistir_leitura?in_data_envio_leitura=" + data + "&in_uf_orgao=" + orgao,
                token
            );
        } else if (document.getElementById("radio_filtro").checked) {
            const sistema = document.getElementById("list_bacia_consist").value == 0 ? "%" : document.getElementById("list_bacia_consist").value;
            const ano     = document.getElementById("list_ano_consist").value == 0 ? "%" : document.getElementById("list_ano_consist").value;
            if (sistema !== '%' || ano !== '%') {
                leituras_json = await get_leituras(
                    "https://ows.snirh.gov.br/ords/servicos/declara_agua_gerencial/consistir_leitura_filtro?in_sistema_hidrico=" + sistema + "&in_ano_leitura=" + ano + "&in_uf_orgao=" + orgao,
                    token
                );
            }
        }
    } catch (e) {
        console.error("Erro ao carregar leituras:", e);
    }

    const leituras = leituras_json.items || [];
    const tabela   = document.getElementById("tb_leituras");

    if ($.fn.DataTable.isDataTable('#tb_leituras')) {
        $('#tb_leituras').DataTable().destroy();
    }

    const n_tr = tabela.rows.length;
    for (let j = n_tr - 1; j >= 1; j--) {
        tabela.deleteRow(j);
    }

    let tbody = tabela.getElementsByTagName("tbody");
    tbody = tbody.length === 0 ? document.createElement("tbody") : tbody[0];

    const filter_bruto = document.getElementById("filter_bruto").checked;
    for (let i = 0; i < leituras.length; i++) {
        const l = leituras[i];
        if (filter_bruto && !(l.nu_leitura_qualificada == null && l.ic_leitura_valida == 1)) continue;
        tbody.appendChild(AddRow(l));
    }
    tabela.appendChild(tbody);
    table = $('#tb_leituras').DataTable({ "pageLength": 100 });
}

function AddRow(leituras) {
    leitura_row               = document.createElement("tr");
    td_ID_LEITURA             = document.createElement("td");
    td_NU_LEITURA             = document.createElement("td");
    td_DT_LEITURA             = document.createElement("td");
    td_NM_EQUIPAMENTO         = document.createElement("td");
    td_ID_INTERFERENCIA       = document.createElement("td");
    td_NU_CNARH               = document.createElement("td");
    td_BACIA                  = document.createElement("td");
    td_NM_RESPONSAVEL         = document.createElement("td");
    td_NM_EMPREENDIMENTO      = document.createElement("td");
    td_IC_LEITURA_VALIDA      = document.createElement("td");
    td_NU_LEITURA_QUALIFICADA = document.createElement("td");
    td_DT_QUALIFICACAO        = document.createElement("td");
    td_NM_TECNICO_QUALIFICACAO= document.createElement("td");
    td_NM_TIPO_EQUIPAMENTO    = document.createElement("td");
    td_ID_LEITURA_EQUIPAMENTO = document.createElement("td");
    td_ID_ARQUIVO             = document.createElement("td");
    td_DS_COMENTARIO          = document.createElement("td");
    td_NU_OCORRENCIA          = document.createElement("td");
    td_ID_EQUIPAMENTO         = document.createElement("td");
    td_DT_SINCRONISMO         = document.createElement("td");

    td_ID_LEITURA.className = "text-center";
    if (leituras.ic_leitura_valida == 0) {
        td_ID_LEITURA.innerHTML = '<i class="fa fa-times text-danger" data-toggle="tooltip" data-placement="right" title="Leitura descartada (invalidada)"></i>';
    } else if (leituras.dt_qualificacao == null) {
        td_ID_LEITURA.innerHTML = '<i class="fa fa-exclamation-triangle text-warning" data-toggle="tooltip" data-placement="right" title="Leitura não consistida"></i>';
    } else if (leituras.id_tipo_ocorr != null && leituras.id_tipo_ocorr != "") {
        td_ID_LEITURA.innerHTML = '<i class="fa fa-edit text-primary" data-toggle="tooltip" data-placement="right" title="Leitura já consistida com ocorrência/observação"></i>';
    } else {
        td_ID_LEITURA.innerHTML = '<i class="fa fa-check text-success" data-toggle="tooltip" data-placement="right" title="Leitura já consistida"></i>';
    }

    td_NU_LEITURA.innerHTML             = leituras.nu_leitura + ' ' + leituras.sg_unidade_equipamento;
    td_DT_LEITURA.innerHTML             = leituras.dt_leitura;
    td_NM_EQUIPAMENTO.innerHTML         = leituras.nm_equipamento;
    td_ID_INTERFERENCIA.innerHTML       = leituras.id_interferencia;
    td_NU_CNARH.innerHTML               = leituras.nu_cnarh;
    td_BACIA.innerHTML                  = leituras.nm_bacia;
    td_NM_RESPONSAVEL.innerHTML         = leituras.emp_nm_responsavel;
    td_NM_EMPREENDIMENTO.innerHTML      = leituras.emp_nm_empreendimento;
    td_IC_LEITURA_VALIDA.style          = "display:none";
    td_IC_LEITURA_VALIDA.innerHTML      = leituras.ic_leitura_valida;
    td_NU_LEITURA_QUALIFICADA.innerHTML = leituras.nu_leitura_qualificada;
    td_DT_QUALIFICACAO.innerHTML        = leituras.dt_qualificacao;
    td_NM_TECNICO_QUALIFICACAO.innerHTML= leituras.nm_tecnico_qualificacao;
    td_NM_TIPO_EQUIPAMENTO.innerHTML    = leituras.nm_tipo_equipamento;
    td_ID_LEITURA_EQUIPAMENTO.style     = "display:none";
    td_ID_LEITURA_EQUIPAMENTO.innerHTML = leituras.id_leitura_equipamento;
    td_ID_ARQUIVO.style                 = "display:none";
    td_ID_ARQUIVO.innerHTML             = leituras.id_arquivo;
    td_DS_COMENTARIO.style              = "display:none";
    td_DS_COMENTARIO.innerHTML          = leituras.ds_comentario;
    td_NU_OCORRENCIA.style              = "display:none";
    td_NU_OCORRENCIA.innerHTML          = leituras.id_tipo_ocorr;
    td_ID_EQUIPAMENTO.style             = "display:none";
    td_ID_EQUIPAMENTO.innerHTML         = leituras.id_equipamento;
    td_DT_SINCRONISMO.innerHTML         = leituras.dt_sincronizacao;
    td_DT_SINCRONISMO.style             = "display:none";

    leitura_row.appendChild(td_ID_LEITURA);
    leitura_row.appendChild(td_NU_LEITURA);
    leitura_row.appendChild(td_DT_LEITURA);
    leitura_row.appendChild(td_NM_EQUIPAMENTO);
    leitura_row.appendChild(td_ID_INTERFERENCIA);
    leitura_row.appendChild(td_NU_CNARH);
    leitura_row.appendChild(td_BACIA);
    leitura_row.appendChild(td_NM_RESPONSAVEL);
    leitura_row.appendChild(td_NM_EMPREENDIMENTO);
    leitura_row.appendChild(td_IC_LEITURA_VALIDA);
    leitura_row.appendChild(td_NU_LEITURA_QUALIFICADA);
    leitura_row.appendChild(td_DT_QUALIFICACAO);
    leitura_row.appendChild(td_NM_TECNICO_QUALIFICACAO);
    leitura_row.appendChild(td_NM_TIPO_EQUIPAMENTO);
    leitura_row.appendChild(td_ID_LEITURA_EQUIPAMENTO);
    leitura_row.appendChild(td_ID_ARQUIVO);
    leitura_row.appendChild(td_DS_COMENTARIO);
    leitura_row.appendChild(td_NU_OCORRENCIA);
    leitura_row.appendChild(td_ID_EQUIPAMENTO);
    leitura_row.appendChild(td_DT_SINCRONISMO);

    return leitura_row;
}

async function popular_ocorrencias() {
    try {
        const response = await fetch("https://ows.snirh.gov.br/ords/servicos/declara_agua_gerencial/ocorrencias_consolidacao");
        const json = await response.json();
        const select = document.getElementById("list_ocorrencia");
        (json.items || []).forEach(function (ocorrencia) {
            const opt = document.createElement('option');
            opt.value = ocorrencia.id_tipo_ocorr;
            opt.textContent = ocorrencia.id_tipo_ocorr + ' - ' + ocorrencia.nm_tipo_ocorr;
            select.appendChild(opt);
        });
    } catch (e) {
        console.error("Erro ao popular ocorrências:", e);
    }
}

async function popular_bacia() {
    try {
        const response = await fetch("https://ows.snirh.gov.br/ords/servicos/declara_agua_gerencial/listar_bacia");
        const json = await response.json();
        const select = document.getElementById("list_bacia_consist");
        (json.items || []).forEach(function (bacia) {
            const opt = document.createElement('option');
            opt.value = bacia.nm_bacia;
            opt.textContent = bacia.nm_bacia;
            select.appendChild(opt);
        });
    } catch (e) {
        console.error("Erro ao popular bacias:", e);
    }
}

async function popular_ano_leitura(in_sistema_hidrico) {
    try {
        const response = await fetch(
            "https://ows.snirh.gov.br/ords/servicos/declara_agua_gerencial/listar_ano_leituras_por_sishid?in_sistema_hidrico=" + in_sistema_hidrico
        );
        const json = await response.json();
        const select = document.getElementById("list_ano_consist");
        while (select.options.length > 1) select.remove(1);
        (json.items || []).forEach(function (ano_leitura) {
            const opt = document.createElement('option');
            opt.textContent = ano_leitura.ano_leituras;
            select.appendChild(opt);
        });
    } catch (e) {
        console.error("Erro ao popular anos de leitura:", e);
    }
}

/* Expose consistency functions to global scope */
window.consist_initial             = initial;
window.consist_main                = main;
window.consist_popular_ocorrencias = popular_ocorrencias;
window.get_orgao_gestor            = get_orgao_gestor;

})();
