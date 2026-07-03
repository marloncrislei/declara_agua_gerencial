(function () {

    function get_leituras(url) {
        let request = new XMLHttpRequest();
        request.open("GET", url, false);
        request.send();
        return request.responseText;
    }

    function main(id_equipamento) {
        // 1. Descrição do equipamento
        try {
            let eq_str  = get_leituras("https://ows.snirh.gov.br/ords/prd11/servicos/declara_agua_gerencial/equipamento?in_id_equipamento=" + id_equipamento);
            let eq_json = JSON.parse(eq_str).items || [];
            if (eq_json.length > 0) {
                var eq = eq_json[0];
                document.getElementById("eq_nm_equipamento").textContent  = eq.nm_equipamento          || '-';
                document.getElementById("eq_nm_empreendimento").textContent = eq.emp_nm_empreendimento || '-';
                document.getElementById("eq_nu_cnarh").textContent         = eq.emp_nu_cnarh           || '-';
                document.getElementById("eq_tp_equipamento").textContent   = eq.nm_tipo_equipamento    || '-';
                document.getElementById("eq_interferencia").textContent    = eq.id_interferencia       || '-';
                document.getElementById("eq_corpohidrico").textContent     = eq.corpohidrico           || '-';
                document.getElementById("eq_nm_usuario").textContent       = eq.emp_nm_responsavel     || '-';
                document.getElementById("eq_nome_equipamento").textContent = eq.nm_equipamento         || '-';
                document.getElementById("eq_dt_instalacao").textContent    = eq.dt_instalacao          || '-';
                document.getElementById("eq_nm_unidade").textContent       = eq.sg_unidade_equipamento || '-';
                document.getElementById("eq_nu_cpf_cnpj").textContent      = eq.emp_nu_cpfcnpj  || '-';
                document.getElementById("eq_ds_orgao").textContent         = eq.org_nm === 'ANA' ? eq.org_nm : eq.org_nm + "/" + eq.org_uf;
            }
        } catch (e) { console.error("Erro ao carregar dados do equipamento:", e); }

        // 2. Leituras
        try {
            let leituras_str  = get_leituras("https://ows.snirh.gov.br/ords/prd11/servicos/declara_agua_gerencial/leituras_por_equipamento?in_id_equipamento=" + id_equipamento);
            let leituras_json = JSON.parse(leituras_str).items || [];

            let tabela = document.getElementById("tb_leituras_equip");

            if ($.fn.DataTable.isDataTable('#tb_leituras_equip')) {
                $('#tb_leituras_equip').DataTable().destroy();
            }

            let n_tr = tabela.rows.length;
            for (let j = n_tr - 1; j >= 1; j--) { tabela.deleteRow(j); }

            let tbody = tabela.getElementsByTagName("tbody");
            tbody = tbody.length === 0 ? document.createElement("tbody") : tbody[0];

            // nm_bacia vem das leituras (não do endpoint de equipamento)
            if (leituras_json.length > 0 && leituras_json[0].nm_bacia) {
                var el = document.getElementById("eq_nm_bacia");
                if (el) el.textContent = leituras_json[0].nm_bacia;
            }

            let filter_bruto = document.getElementById("eq_filter_bruto").checked;
            for (let i = 0; i < leituras_json.length; i++) {
                let l = leituras_json[i];
                if (filter_bruto && !(l.nu_leitura_qualificada == null && l.ic_leitura_valida == 1)) continue;
                tbody.appendChild(AddRow(l));
            }
            tabela.appendChild(tbody);
            window._equip_datatable = $('#tb_leituras_equip').DataTable({ pageLength: 100 });

            // Atualiza o gráfico com os dados já carregados
            window._equip_dados_grafico = leituras_json;
            if (typeof equip_drawChart === 'function') equip_drawChart();
        } catch (e) { console.error("Erro ao carregar leituras do equipamento:", e); }
    }

    function AddRow(leituras) {
        // IMPORTANTE: a ordem de colunas espelha EXATAMENTE a tabela de consistência
        // para que popularModal() funcione sem alteração de índices de células.
        //
        // Índice → campo:
        //  0  icon (situação)
        //  1  nu_leitura
        //  2  dt_leitura
        //  3  nm_equipamento     (hidden)
        //  4  id_interferencia   (hidden)
        //  5  nu_cnarh           (hidden)
        //  6  nm_bacia           (hidden)
        //  7  emp_nm_responsavel (hidden)
        //  8  emp_nm_empreendimento (hidden)
        //  9  ic_leitura_valida  (hidden)
        // 10  nu_leitura_qualificada
        // 11  dt_qualificacao
        // 12  nm_tecnico_qualificacao
        // 13  nm_tipo_equipamento (hidden)
        // 14  id_leitura_equipamento (hidden — chave)
        // 15  id_arquivo         (hidden)
        // 16  ds_comentario      (hidden)
        // 17  id_tipo_ocorr      (hidden)
        // 18  id_equipamento     (hidden)
        // 19  dt_sincronizacao   (visível no equipamento)

        var row = document.createElement("tr");

        function td(html, hidden) {
            var c = document.createElement("td");
            c.innerHTML = (html != null ? html : '');
            if (hidden) c.style.display = 'none';
            return c;
        }

        var icon;
        if (leituras.ic_leitura_valida == 0) {
            icon = '<i class="fa fa-times text-danger" data-toggle="tooltip" title="Leitura descartada (invalidada)"></i>';
        } else if (leituras.dt_qualificacao == null) {
            icon = '<i class="fa fa-exclamation-triangle text-warning" data-toggle="tooltip" title="Leitura não consistida"></i>';
        } else if (leituras.id_tipo_ocorr != null && leituras.id_tipo_ocorr !== '') {
            icon = '<i class="fa fa-edit text-primary" data-toggle="tooltip" title="Consistida com ocorrência"></i>';
        } else {
            icon = '<i class="fa fa-check text-success" data-toggle="tooltip" title="Leitura já consistida"></i>';
        }
        var tdIcon = document.createElement("td");
        tdIcon.className = "text-center";
        tdIcon.innerHTML = icon;

        row.appendChild(tdIcon);
        row.appendChild(td(leituras.nu_leitura + ' ' + (leituras.sg_unidade_equipamento || '')));
        row.appendChild(td(leituras.dt_leitura));
        row.appendChild(td(leituras.nm_equipamento,            true));
        row.appendChild(td(leituras.id_interferencia,          true));
        row.appendChild(td(leituras.nu_cnarh,                  true));
        row.appendChild(td(leituras.nm_bacia,                  true));
        row.appendChild(td(leituras.emp_nm_responsavel,        true));
        row.appendChild(td(leituras.emp_nm_empreendimento,     true));
        row.appendChild(td(leituras.ic_leitura_valida,         true));
        row.appendChild(td(leituras.nu_leitura_qualificada));
        row.appendChild(td(leituras.dt_qualificacao));
        row.appendChild(td(leituras.nm_tecnico_qualificacao));
        row.appendChild(td(leituras.nm_tipo_equipamento,       true));
        row.appendChild(td(leituras.id_leitura_equipamento,    true));
        row.appendChild(td(leituras.id_arquivo,                true));
        row.appendChild(td(leituras.ds_comentario,             true));
        row.appendChild(td(leituras.id_tipo_ocorr,             true));
        row.appendChild(td(leituras.id_equipamento,            true));
        row.appendChild(td(leituras.dt_sincronizacao));        // índice 19 — visível

        return row;
    }

    function popular_ocorrencias() {
        var select = document.getElementById("list_ocorrencia");
        if (!select || select.options.length > 1) return; // já populado
        let req = new XMLHttpRequest();
        req.open("GET", "https://ows.snirh.gov.br/ords/servicos/declara_agua_gerencial/ocorrencias_consolidacao", false);
        req.send();
        if (req.status === 200) {
            let items = JSON.parse(req.responseText).items || [];
            items.forEach(function (oc) {
                let opt = document.createElement('option');
                opt.value = oc.id_tipo_ocorr;
                opt.textContent = oc.id_tipo_ocorr + ' - ' + oc.nm_tipo_ocorr;
                select.appendChild(opt);
            });
        }
    }

    function formatNuCnarh(value) {
        if (value == null || value === '') return '';
        var digits = String(value).replace(/\D/g, '');
        if (digits.length !== 12) return value;
        return digits.replace(/(\d{2})(\d{1})(\d{7})(\d{2})/, "$1.$2.$3/$4");
    }

    function obterMapaOcorrencias() {
        var mapa = {};
        var select = document.getElementById('list_ocorrencia');
        if (select && select.options.length > 1) {
            for (var i = 1; i < select.options.length; i++) {
                mapa[select.options[i].value] = select.options[i].textContent.replace(/^\d+\s*-\s*/, '');
            }
            return mapa;
        }
        // Select ainda não populado (modal de leitura nunca foi aberto) — busca direto do serviço
        try {
            var req = new XMLHttpRequest();
            req.open('GET', 'https://ows.snirh.gov.br/ords/servicos/declara_agua_gerencial/ocorrencias_consolidacao', false);
            req.send();
            if (req.status === 200) {
                var items = JSON.parse(req.responseText).items || [];
                items.forEach(function (oc) { mapa[oc.id_tipo_ocorr] = oc.nm_tipo_ocorr; });
            }
        } catch (e) { console.error('Erro ao buscar ocorrências para exportação:', e); }
        return mapa;
    }

    function exportar_excel() {
        var tabela = document.getElementById('tb_leituras_equip');
        var linhas = tabela ? Array.prototype.slice.call(tabela.querySelectorAll('tbody tr')) : [];
        if (!linhas.length) {
            if (typeof toastr !== 'undefined') toastr.warning('Não há leituras para exportar.');
            else alert('Não há leituras para exportar.');
            return false;
        }

        function cel(tr, idx) {
            var c = tr.cells[idx];
            return c ? c.textContent.trim() : '';
        }

        var mapaOcorrencias = obterMapaOcorrencias();

        var dados = linhas.map(function (tr) {
            var idTipoOcorr = cel(tr, 17);
            return {
                'Interferência':            cel(tr, 4),
                'NU_CNARH':                 formatNuCnarh(cel(tr, 5)),
                'Nome do Usuário':          cel(tr, 7),
                'Empreendimento':           cel(tr, 8),
                'Bacia':                    cel(tr, 6),
                'Nome do Equipamento':      cel(tr, 3),
                'Tipo de Equipamento':      cel(tr, 13),
                'Leitura Bruta':            cel(tr, 1),
                'Data da Leitura':          cel(tr, 2),
                'Data de Sincronização':    cel(tr, 19),
                'Leitura Válida':           cel(tr, 9) === '1' ? 'Sim' : 'Não',
                'Leitura Qualificada':      cel(tr, 10),
                'Data de Qualificação':     cel(tr, 11),
                'Técnico Responsável':      cel(tr, 12),
                'Comentário':               cel(tr, 16),
                'Observação/Ocorrência':    idTipoOcorr ? (mapaOcorrencias[idTipoOcorr] || idTipoOcorr) : ''
            };
        });

        var planilha = XLSX.utils.json_to_sheet(dados);
        var livro    = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(livro, planilha, 'Leituras do Equipamento');

        var agora = new Date();
        var pad = function (n) { return String(n).padStart(2, '0'); };
        var dataHora = agora.getFullYear() + pad(agora.getMonth() + 1) + pad(agora.getDate()) +
            '_' + pad(agora.getHours()) + pad(agora.getMinutes()) + pad(agora.getSeconds());

        XLSX.writeFile(livro, 'leituras_equipamento_' + dataHora + '.xlsx');
        return true;
    }

    function exportar_excel_ui(btn) {
        var label = btn.querySelector('.bx-label');
        var xls   = btn.querySelector('.xls');
        var iconeOriginal = xls ? xls.outerHTML : '<span class="xls">XLS</span>';
        var textoOriginal = label ? label.textContent : 'Exportar Excel';

        btn.disabled = true;
        if (xls)   xls.outerHTML = '<span class="spin"></span>';
        if (label) label.textContent = 'Gerando…';

        setTimeout(function () {
            var sucesso = false;
            try { sucesso = exportar_excel(); } catch (e) { console.error('Erro ao exportar Excel:', e); }

            var spin = btn.querySelector('.spin');
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
                var iconeAtual = btn.querySelector('.spin, svg');
                if (iconeAtual) iconeAtual.outerHTML = iconeOriginal;
                if (label) label.textContent = textoOriginal;
                btn.disabled = false;
            }, 1500);
        }, 600);
    }

    function baixarFotosLeituras(onProgress) {
        var tabela = document.getElementById('tb_leituras_equip');
        var linhas = tabela ? Array.prototype.slice.call(tabela.querySelectorAll('tbody tr')) : [];
        if (!linhas.length) {
            if (typeof toastr !== 'undefined') toastr.warning('Não há leituras para baixar fotos.');
            else alert('Não há leituras para baixar fotos.');
            return Promise.resolve(false);
        }

        if (typeof JSZip === 'undefined') {
            if (typeof toastr !== 'undefined') toastr.error('Biblioteca de compactação (JSZip) não carregada.');
            else alert('Biblioteca de compactação (JSZip) não carregada.');
            return Promise.resolve(false);
        }

        // Coleta ids de arquivo únicos (coluna 15), nomeando o arquivo com data/leitura para facilitar identificação
        var vistos = {};
        var itens = [];
        linhas.forEach(function (tr) {
            var idArquivo = tr.cells[15] ? tr.cells[15].textContent.trim() : '';
            if (!idArquivo || vistos[idArquivo]) return;
            vistos[idArquivo] = true;
            var nuLeitura = tr.cells[1] ? tr.cells[1].textContent.trim().replace(/[\\/:*?"<>|]/g, '-') : idArquivo;
            var dtLeitura = tr.cells[2] ? tr.cells[2].textContent.trim().replace(/[\\/:*?"<>|]/g, '-') : '';
            itens.push({ id: idArquivo, nome: 'leitura_' + (dtLeitura || 'sem_data') + '_' + nuLeitura + '_' + idArquivo + '.jpg' });
        });

        if (!itens.length) {
            if (typeof toastr !== 'undefined') toastr.warning('Nenhuma foto associada às leituras exibidas.');
            else alert('Nenhuma foto associada às leituras exibidas.');
            return Promise.resolve(false);
        }

        var zip = new JSZip();
        var falhas = 0;
        var concluidos = 0;

        var promessas = itens.map(function (item) {
            var url = 'https://ana.serpro.gov.br/fisc-declaratorio-distribuicao/imagens/' + item.id;
            return fetch(url)
                .then(function (resp) {
                    if (!resp.ok) throw new Error('HTTP ' + resp.status);
                    return resp.blob();
                })
                .then(function (blob) {
                    zip.file(item.nome, blob);
                })
                .catch(function (e) {
                    falhas++;
                    console.error('Falha ao baixar foto ' + item.id + ':', e);
                })
                .finally(function () {
                    concluidos++;
                    if (typeof onProgress === 'function') onProgress(concluidos, itens.length);
                });
        });

        return Promise.all(promessas).then(function () {
            if (concluidos - falhas === 0) {
                if (typeof toastr !== 'undefined') {
                    toastr.error('Não foi possível baixar nenhuma foto (provável bloqueio de CORS pelo servidor de imagens).');
                } else {
                    alert('Não foi possível baixar nenhuma foto.');
                }
                return false;
            }

            return zip.generateAsync({ type: 'blob' }).then(function (conteudoZip) {
                var urlZip = URL.createObjectURL(conteudoZip);
                var a = document.createElement('a');
                a.href = urlZip;
                a.download = 'fotos_leituras_equipamento.zip';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                setTimeout(function () { URL.revokeObjectURL(urlZip); }, 1000);

                if (falhas > 0 && typeof toastr !== 'undefined') {
                    toastr.warning(falhas + ' de ' + itens.length + ' foto(s) não puderam ser baixadas.');
                }
                return true;
            });
        });
    }

    function baixarFotosLeiturasUI(btn) {
        var label = btn.querySelector('.bx-label');
        var zipBadge = btn.querySelector('.zip');
        var iconeOriginal = zipBadge ? zipBadge.outerHTML : '<span class="zip">ZIP</span>';
        var textoOriginal = label ? label.textContent : 'Baixar Fotos das Leituras';

        btn.disabled = true;
        if (zipBadge) zipBadge.outerHTML = '<span class="spin"></span>';
        if (label) label.textContent = 'Preparando…';

        baixarFotosLeituras(function (concluidos, total) {
            if (label) label.textContent = 'Baixando ' + concluidos + '/' + total + '…';
        }).then(function (sucesso) {
            var spin = btn.querySelector('.spin');
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
                var iconeAtual = btn.querySelector('.spin, svg');
                if (iconeAtual) iconeAtual.outerHTML = iconeOriginal;
                if (label) label.textContent = textoOriginal;
                btn.disabled = false;
            }, 1500);
        }).catch(function (e) {
            console.error('Erro inesperado ao baixar fotos das leituras:', e);
            var spin = btn.querySelector('.spin');
            if (spin) spin.outerHTML = iconeOriginal;
            if (label) label.textContent = textoOriginal;
            btn.disabled = false;
        });
    }

    window.equip_main                = main;
    window.equip_popular_ocorrencias = popular_ocorrencias;
    window.equip_exportar_excel      = exportar_excel;
    window.equip_exportar_excel_ui   = exportar_excel_ui;
    window.equip_baixar_fotos        = baixarFotosLeituras;
    window.equip_baixar_fotos_ui     = baixarFotosLeiturasUI;

})();
