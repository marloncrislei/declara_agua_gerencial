(function () {

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

    function formatarDataHora(valor) {
        if (!valor) return '';
        var data = new Date(valor);
        if (isNaN(data.getTime())) return valor;
        var dia  = String(data.getUTCDate()).padStart(2, '0');
        var mes  = String(data.getUTCMonth() + 1).padStart(2, '0');
        var ano  = data.getUTCFullYear();
        var hora = String(data.getUTCHours()).padStart(2, '0');
        var min  = String(data.getUTCMinutes()).padStart(2, '0');
        return dia + '/' + mes + '/' + ano + ' ' + hora + ':' + min;
    }

    async function carregar_chaves() {
        var token = (typeof getCookie === 'function') ? getCookie("token") : null;
        var itens = [];
        try {
            const response = await fetch("https://ows.snirh.gov.br/ords/servicos/declara_agua_gerencial/def_chave_acesso", {
                headers: { "Authorization": token || "" }
            });
            if (!response.ok) throw new Error("Status " + response.status);
            const json = await response.json();
            itens = json.items || [];
        } catch (e) {
            console.error("Erro ao carregar chaves de acesso:", e);
            if (typeof toastr !== 'undefined') toastr.error('Erro ao carregar chaves de acesso.');
        }
        return itens;
    }

    function td(html, opts) {
        const c = document.createElement("td");
        c.innerHTML = (html != null && html !== '') ? html : '-';
        if (opts && opts.center) c.style.textAlign = 'center';
        return c;
    }

    function AddRow(it, idx) {
        const row = document.createElement("tr");
        row.appendChild(td(it.id_chave_acesso, { center: true }));
        row.appendChild(td(formatNuCnarh(it.nu_cnarh), { center: true }));
        row.appendChild(td(formatCnpjCpf(it.emp_nu_cpfcnpj), { center: true }));
        row.appendChild(td(fixMojibake(it.emp_nm_responsavel)));
        row.appendChild(td(fixMojibake(it.emp_nm_empreendimento)));
        row.appendChild(td('<span style="font-family:monospace; font-size:11px;">' + (it.ds_chave || '') + '</span>'));
        row.appendChild(td(it.nm_device, { center: true }));
        row.appendChild(td(it.qtd_int_cd, { center: true }));
        row.appendChild(td(formatarDataHora(it.dt_registro), { center: true }));
        row.appendChild(td(formatarDataHora(it.dt_ativacao), { center: true }));
        row.appendChild(td(it.dt_expiracao ? formatarDataHora(it.dt_expiracao) : '-', { center: true }));

        const tdAcoes = document.createElement("td");
        tdAcoes.className = "text-center";
        tdAcoes.innerHTML =
            '<button type="button" class="btn btn-default btn-sm" onclick="chaves_copiar_link(' + idx + ')" data-toggle="tooltip" title="Copiar link da chave"><i class="fa fa-clipboard"></i></button> ' +
            '<button type="button" class="btn btn-default btn-sm" onclick="chaves_abrir_whatsapp(' + idx + ')" data-toggle="tooltip" title="Enviar via WhatsApp"><i class="fa fa-whatsapp" style="color:#25D366;"></i></button>';
        row.appendChild(tdAcoes);

        return row;
    }

    function renderizar(items) {
        const tabela = document.getElementById("tb_chaves_acesso");

        if ($.fn.DataTable.isDataTable('#tb_chaves_acesso')) {
            $('#tb_chaves_acesso').DataTable().destroy();
        }

        const n_tr = tabela.rows.length;
        for (let j = n_tr - 1; j >= 1; j--) tabela.deleteRow(j);

        let tbody = tabela.getElementsByTagName("tbody");
        tbody = tbody.length === 0 ? document.createElement("tbody") : tbody[0];

        window._chavesItensRenderizados = items;
        for (let i = 0; i < items.length; i++) tbody.appendChild(AddRow(items[i], i));
        tabela.appendChild(tbody);

        $('#tb_chaves_acesso').DataTable({
            pageLength: 10,
            order: [[8, "desc"]],
            // Colunas NU_CNARH (1) e CPF/CNPJ (2): a busca ("Procurar") passa a considerar
            // também a versão sem pontuação do texto, permitindo digitar "80615490506" e
            // encontrar "806.154.905-06" (ou "31.0.0051684/88" para NU_CNARH).
            columnDefs: [{
                targets: [1, 2],
                render: function (data, type) {
                    if (type === 'filter') {
                        return data + ' ' + String(data).replace(/\D/g, '');
                    }
                    return data;
                }
            }],
            language: {
                lengthMenu:  'Apresentando _MENU_ resultados por página:',
                zeroRecords: 'Nenhum resultado encontrado.',
                info:        'Apresentando página _PAGE_ de _PAGES_ do total de _MAX_ registros',
                infoEmpty:   'Nenhum registo encontrado',
                infoFiltered:'(filtrado do total de _MAX_ registros)'
            }
        });
    }

    async function chaves_initial() {
        const items = await carregar_chaves();
        renderizar(items);
    }

    function copiar_link(idx) {
        const it = (window._chavesItensRenderizados || [])[idx];
        if (!it) return;
        const link = 'https://fisc-decl-dist-ul1.ana.serpro.gov.br/chave?id=' + (it.ds_chave || '');

        navigator.clipboard.writeText(link).then(function () {
            if (typeof toastr !== 'undefined') toastr.success('Link copiado para a área de transferência.');
        }).catch(function () {
            if (typeof toastr !== 'undefined') toastr.error('Não foi possível copiar o link.');
            else alert('Não foi possível copiar o link.');
        });
    }

    // Recarrega a lista (após criar uma nova chave, por ex.) e filtra pelo NU_CNARH informado
    async function recarregar_e_filtrar(nuCnarh) {
        await chaves_initial();
        if (nuCnarh && $.fn.DataTable.isDataTable('#tb_chaves_acesso')) {
            $('#tb_chaves_acesso').DataTable().search(formatNuCnarh(nuCnarh)).draw();
        }
    }

    window.chaves_initial             = chaves_initial;
    window.chaves_copiar_link         = copiar_link;
    window.chaves_recarregar_e_filtrar = recarregar_e_filtrar;

})();
