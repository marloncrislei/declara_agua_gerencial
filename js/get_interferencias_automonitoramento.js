function get_int_monit(url) {
    let request = new XMLHttpRequest()
    request.open("GET", url, false)
    request.send()
    return request.responseText
}

function initial() {

    let int_automonit_str = get_int_monit("https://ows.snirh.gov.br/ords/servicos/declara_agua_gerencial/monit_ger_ls_int_obrigatorio");

    let int_automonit_json = JSON.parse(int_automonit_str);
    int_automonit_json = int_automonit_json.items;

    let tabela = document.getElementById("tb_int_automonit");

    // REFRESH DA TABELA
    $('#tb_int_automonit').DataTable().destroy();

    let n_tr = tabela.rows.length;

    // limpar dados já carregados
    if (n_tr > 1) {
        for (let j = 1; j < n_tr; j++) {
            tabela.rows[1].remove();
        }
    };

    let leitura_tbody = tabela.getElementsByTagName("tbody");
    if (leitura_tbody.length == 0) {
        leitura_tbody = document.createElement("tbody");
    } else { leitura_tbody = leitura_tbody[0]; }

    // adicionar registros na tabela
    for (let i = 0; i < int_automonit_json.length; i++) {
        let leitura_row = AddRow(int_automonit_json[i]);
        leitura_tbody.appendChild(leitura_row);
    }
    tabela.appendChild(leitura_tbody);
    table = $('#tb_int_automonit').DataTable({
        "pageLength": 10
        , "order": [[1, "asc"]]
        , language: {
            lengthMenu: 'Apresentando _MENU_ resultados por página:',
            zeroRecords: 'Nenhum resultado encontrado.',
            info: 'Apresentando página _PAGE_ de _PAGES_ do total de _MAX_ registros',
            infoEmpty: 'Nenhum registo encontrado',
            infoFiltered: '(filtrado do total de _MAX_ registros)', //Showing 1 to 3 of 3 entries (filtered from 495 total entries)
        }
    });


}

function AddRow(leituras) {

    leitura_row = document.createElement("tr");

    td_atm_cd = document.createElement("td");
    td_atm_int_cd_cnarh = document.createElement("td");
    td_tsp_ds = document.createElement("td");
    td_nu_cnarh = document.createElement("td");
    td_nu_cpfcnpj = document.createElement("td");
    td_tin_ds = document.createElement("td");
    td_tfm_ds = document.createElement("td");
    td_tcm_ds = document.createElement("td");
    td_atm_dt_prazo_inicio = document.createElement("td");
    td_atm_nu_latitude = document.createElement("td");
    td_atm_nu_longitude = document.createElement("td");
    td_atm_ic_obrigatoriedade = document.createElement("td");
    td_atm_nu_volume = document.createElement("td");
    td_atm_nu_dbo = document.createElement("td");
    td_atm_nu_fosforo_total = document.createElement("td");
    //td_int_ds_observacoes     = document.createElement("td"); 
    td_acoes = document.createElement("td");

    /*td_ID_LEITURA.className = "text-center";
    if (leituras.ic_leitura_valida == 0 ){
        td_ID_LEITURA.innerHTML = '<i class="fa fa-times text-danger"  data-toggle="tooltip" data-placement="right" title="Leitura descartada (invalidada)"></i>'; //leituras.id_leitura; fa fa-exclamation-triangle
    } else {
        if (leituras.dt_qualificacao == null ){
            td_ID_LEITURA.innerHTML = '<i class="fa fa-exclamation-triangle text-warning"  data-toggle="tooltip" data-placement="right" title="Leitura não consistida"></i>'; //leituras.id_leitura; fa fa-exclamation-triangle
        } else {
            if (leituras.id_tipo_ocorr != null && leituras.id_tipo_ocorr != ""){
                td_ID_LEITURA.innerHTML = '<i class="fa  fa-edit text-primary" data-toggle="tooltip" data-placement="right" title="Leitura já consistida com ocorrência/observação"></i>'
            } else {
                td_ID_LEITURA.innerHTML = '<i class="fa fa-check text-success" data-toggle="tooltip" data-placement="right" title="Leitura já consistida"></i>'; //leituras.id_leitura;
            }
        }
    };*/
    //text-primary   fa-check-circle-o

    td_atm_cd.innerHTML = leituras.atm_cd;
    td_atm_cd.style = "display:none";
    td_atm_int_cd_cnarh.innerHTML = leituras.atm_int_cd_cnarh;
    td_tsp_ds.innerHTML = leituras.tsp_ds;
    td_nu_cnarh.innerHTML = formatNuCnarh(leituras.nu_cnarh);
    td_nu_cpfcnpj.innerHTML = formatCnpjCpf(leituras.nu_cpfcnpj);
    td_tin_ds.innerHTML = leituras.tin_ds;
    td_tfm_ds.innerHTML = leituras.tfm_ds;
    td_tcm_ds.innerHTML = leituras.tcm_ds;
    td_atm_dt_prazo_inicio.innerHTML = leituras.atm_dt_prazo_inicio;
    td_atm_nu_latitude.innerHTML = leituras.atm_nu_latitude;
    td_atm_nu_longitude.innerHTML = leituras.atm_nu_longitude;
    td_atm_ic_obrigatoriedade.innerHTML = leituras.atm_ic_obrigatoriedade;
    td_atm_nu_volume.innerHTML = leituras.atm_nu_volume;
    td_atm_nu_dbo.innerHTML = leituras.atm_nu_dbo;
    td_atm_nu_fosforo_total.innerHTML = leituras.atm_nu_fosforo_total;
    //td_int_ds_observacoes.innerHTML = leituras.int_ds_observacoes;
    //td_int_ds_observacoes.style = "display:none";

    bview = '<a href="#" onclick="open_modal(' + leituras.atm_cd + ');" class="btn btn-default btn-sm" data-toggle="tooltip" title="Visualizar"  data-original-title="Visualizar"><i class="icon-eye-open"></i></a>';
    b_edit = '<a href="#" onclick="open_modal_edit(' + leituras.atm_cd + ');" class="btn btn-default btn-sm" data-toggle="tooltip" title="Editar"  data-original-title="Editar"><i class="fa fa-edit"></i></a>';

    let ic_token = valida_token(getCookie("token"))
    if (ic_token == null || ic_token == 0) {
        td_acoes.innerHTML = bview;
    } else {
        td_acoes.innerHTML = bview + b_edit;
    }


    td_atm_int_cd_cnarh.className = "text-center";
    td_tsp_ds.className = "text-center";
    td_nu_cnarh.className = "text-center";
    td_nu_cpfcnpj.className = "text-center";
    td_tin_ds.className = "text-center";
    td_tfm_ds.className = "text-right";
    td_tcm_ds.className = "text-right";
    td_atm_dt_prazo_inicio.className = "text-center";
    td_atm_nu_latitude.className = "text-center";
    td_atm_nu_longitude.className = "text-center";
    td_atm_ic_obrigatoriedade.className = "text-center";
    td_atm_nu_volume.className = "text-center";
    td_atm_nu_dbo.className = "text-center";
    td_atm_nu_fosforo_total.className = "text-center";
    //td_int_ds_observacoes.className = "text-center";
    td_acoes.style = "text-align: center; vertical-align:middle";

    leitura_row.appendChild(td_atm_cd);
    leitura_row.appendChild(td_atm_int_cd_cnarh);
    leitura_row.appendChild(td_tsp_ds);
    leitura_row.appendChild(td_nu_cnarh);;
    leitura_row.appendChild(td_nu_cpfcnpj);
    leitura_row.appendChild(td_tin_ds);
    leitura_row.appendChild(td_tfm_ds);
    leitura_row.appendChild(td_tcm_ds);
    leitura_row.appendChild(td_atm_dt_prazo_inicio);
    leitura_row.appendChild(td_atm_nu_latitude);
    leitura_row.appendChild(td_atm_nu_longitude);
    leitura_row.appendChild(td_atm_ic_obrigatoriedade);
    leitura_row.appendChild(td_atm_nu_volume);
    leitura_row.appendChild(td_atm_nu_dbo);
    leitura_row.appendChild(td_atm_nu_fosforo_total);
    //leitura_row.appendChild(td_int_ds_observacoes);
    leitura_row.appendChild(td_acoes);

    return leitura_row;
}

function popular_modal_automonit(atm_cd_selected) {
    let int_detail_str = get_int_monit("https://ows.snirh.gov.br:443/ords/servicos/declara_agua_gerencial/monit_ger_get_int_detalhes?in_atm_cd=" + atm_cd_selected);

    let int_detail_json = JSON.parse(int_detail_str);
    int_detail_json = int_detail_json.items;

    document.getElementById("p_atm_cd").value = int_detail_json[0].atm_cd;
    document.getElementById("p_int_cd_cnarh40").value = int_detail_json[0].int_cd_cnarh40;
    document.getElementById("p_int_cd_regla").value = int_detail_json[0].int_cd_regla;
    document.getElementById("p_BACIA").value = int_detail_json[0].sistema_hidrico;
    document.getElementById("p_cpfcnpj").value = formatCnpjCpf(int_detail_json[0].nu_cpfcnpj);
    document.getElementById("p_nu_cnarh").value = formatNuCnarh(int_detail_json[0].nu_cnarh);
    document.getElementById("p_NM_EMPREENDIMENTO").value = int_detail_json[0].emp_nm_empreendimento;
    document.getElementById("p_NM_RESPONSAVEL").value = int_detail_json[0].emp_nm_responsavel;
    document.getElementById("p_situacao_out").value = int_detail_json[0].tsp_ds;
    document.getElementById("p_dt_inicio").value = int_detail_json[0].out_dt_outorgainicial;
    document.getElementById("p_dt_fim").value = int_detail_json[0].out_dt_outorgafinal;

    document.getElementById("list_tp_interf").value = int_detail_json[0].tin_cd;
    document.getElementById("list_freq_monit").value = int_detail_json[0].tfm_cd;
    document.getElementById("list_clas_monit").value = int_detail_json[0].tcm_cd;
    document.getElementById("calendario").value = int_detail_json[0].atm_dt_prazo_inicio;
    document.getElementById("volume_monit").value = int_detail_json[0].atm_nu_volume;
    document.getElementById("DBO_monit").value = int_detail_json[0].atm_nu_dbo;
    document.getElementById("fosforo_monit").value = int_detail_json[0].atm_nu_fosforo_total;
    document.getElementById("ck_obrigatorio").checked = (int_detail_json[0].atm_ic_obrigatoriedade == 1 ? true : false);
    document.getElementById("observ_monit").value = int_detail_json[0].int_ds_observacoes;

}

function formatCnpjCpf(value) {
    const CPF_LENGTH = 11;
    if (value == '') {
        return '';
    } else {
        var cnpjCpf = value.replace(/\D/g, '');
        if (cnpjCpf.length === CPF_LENGTH) {
            return cnpjCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/g, "\$1.\$2.\$3-\$4");
        }
        return cnpjCpf.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/g, "\$1.\$2.\$3/\$4-\$5");
    }
}

function formatNuCnarh(valor_nu_cnarh) {
    if (valor_nu_cnarh == '' || valor_nu_cnarh == null) {
        return '';
    } else {
        var nu_cnarh = valor_nu_cnarh.toString().replace(/\D/g, '');
        return nu_cnarh.replace(/(\d{2})(\d{1})(\d{7})(\d{2})/g, "\$1.\$2.\$3/\$4");			//70.0.0000970/26
    }

}

function getCookie(name) {
    var cookies = document.cookie;
    var prefix = name + "=";
    var begin = cookies.indexOf("; " + prefix);
    if (begin == -1) {
        begin = cookies.indexOf(prefix);
        if (begin != 0) {
            return null;
        }
    } else {
        begin += 2;
    }
    var end = cookies.indexOf(";", begin);
    if (end == -1) {
        end = cookies.length;
    }
    return cookies.substring(begin + prefix.length, end);
}

function popular_modal_add_int() {

    let int_new_str = get_int_monit("https://ows.snirh.gov.br/ords/servicos/declara_agua_gerencial/monit_ger_list_new_cnarh" + "?in_bac_cd=7");

    let int_new_str_json = JSON.parse(int_new_str);
    int_new_str_json = int_new_str_json.items;

    let tabela = document.getElementById("tb_add_int");

    // REFRESH DA TABELA
    $('#tb_add_int').DataTable().destroy();

    let n_tr = tabela.rows.length;

    // limpar dados já carregados
    if (n_tr > 1) {
        for (let j = 1; j < n_tr; j++) {
            tabela.rows[1].remove();
        }
    };

    let leitura_tbody = tabela.getElementsByTagName("tbody");
    if (leitura_tbody.length == 0) {
        leitura_tbody = document.createElement("tbody");
    } else { leitura_tbody = leitura_tbody[0]; }

    // adicionar registros na tabela
    for (let i = 0; i < int_new_str_json.length; i++) {
        let leitura_row = AddRowInt(int_new_str_json[i]);
        leitura_tbody.appendChild(leitura_row);
    }
    tabela.appendChild(leitura_tbody);
    table = $('#tb_add_int').DataTable({
        "pageLength": 10
        , "order": [[0, "des"]]
        , language: {
            lengthMenu: 'Apresentando _MENU_ resultados por página:',
            zeroRecords: 'Nenhum resultado encontrado.',
            info: 'Apresentando página _PAGE_ de _PAGES_ do total de _MAX_ registros',
            infoEmpty: 'Nenhum registo encontrado',
            infoFiltered: '(filtrado do total de _MAX_ registros)', //Showing 1 to 3 of 3 entries (filtered from 495 total entries)
        }
    });
}

function AddRowInt(leituras) {
    leitura_row = document.createElement("tr");

    td_int_cd_cnarh40 = document.createElement("td");
    td_int_cd_regla = document.createElement("td");
    td_nu_cnarh = document.createElement("td");
    td_nu_cpfcnpj = document.createElement("td");
    td_tin_cd = document.createElement("td");
    td_sist_hidrico = document.createElement("td");

    td_int_cd_cnarh40.innerHTML = leituras.int_cd_cnarh40;
    td_int_cd_regla.innerHTML = leituras.int_cd_regla;
    td_nu_cnarh.innerHTML = formatNuCnarh(leituras.nu_cnarh);
    td_nu_cpfcnpj.innerHTML = formatCnpjCpf(leituras.nu_cpfcnpj);
    td_tin_cd.innerHTML = leituras.tin_ds;
    td_sist_hidrico.innerHTML = leituras.sistema_hidrico;

    leitura_row.appendChild(td_int_cd_cnarh40);
    leitura_row.appendChild(td_int_cd_regla);
    leitura_row.appendChild(td_nu_cnarh);
    leitura_row.appendChild(td_nu_cpfcnpj);;
    leitura_row.appendChild(td_tin_cd);
    leitura_row.appendChild(td_sist_hidrico);

    return leitura_row;
}