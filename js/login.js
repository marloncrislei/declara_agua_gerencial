// serviço segurança
function get_token_seguranca(usr, pws) {
    url = "https://www.snirh.gov.br/sso/service/rest/api/getAccessToken";

    let request = new XMLHttpRequest()
    request.open("GET", url, false)

    headers = { "contentType": "application/json", "identificador": usr, "senha": pws };
    for (let key in headers) {
        request.setRequestHeader(key, headers[key])
    }
    request.send()
    return request.responseText
}

// salvar um cookie
function setCookie(name, value, duration) {
    var cookie = name + "=" + value + "; duration=" + duration.toGMTString();
    document.cookie = cookie;
}

// apagar um cookie
function eraseCookie(name) {
    document.cookie = name + '=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
}

// listar perfis do usuario
function get_perfil_usuario(token) {
    let url = "https://ows.snirh.gov.br/ords/servicos/seguranca/perfil-usuario?token=" + token;

    /* Lista de códigos de perfis permitidos que deseja verificar
            "codigo_perfil": 765,
            "nome_perfil": "Gestor Federal - Declara Agua Gerencial",
            "descricao_perfil": "Perfil para acesso ao Declara Agua Gerencial com perfil de edição e visualização as leituras de usuários federais."

            "codigo_perfil": 766,
            "nome_perfil": "Gestor TO - Declara Agua Gerencial",
            "descricao_perfil": "Perfil para acesso ao Declara Agua Gerencial com perfil de edição e visualização as leituras de usuários do estado do Tocantins."

            "codigo_perfil": 767,
            "nome_perfil": "Usuario Federal - Declara Agua Gerencial",
            "descricao_perfil": "Perfil para acesso ao Declara Agua Gerencial com perfil exclusivo de visualização (sem edição) das leituras de usuários federais."

           "codigo_perfil": 768,
            "nome_perfil": "Gestor SP - Declara Agua Gerencial",
            "descricao_perfil": "Perfil para acesso ao Declara Agua Gerencial com perfil de edição e visualização as leituras de usuários do estado de São Paulo."

            "codigo_perfil": 769,
            "nome_perfil": "Usuario TO - Declara Agua Gerencial",
            "descricao_perfil": "Perfil para acesso ao Declara Agua Gerencial com perfil exclusivo de visualização (sem edição) das leituras de usuários estaduais do TO."

            "codigo_perfil": 770,
            "nome_perfil": "Usuario SP - Declara Agua Gerencial",
            "descricao_perfil": "Perfil para acesso ao Declara Agua Gerencial com perfil exclusivo de visualização (sem edição) das leituras de usuários estaduais de São Paulo."

            "codigo_perfil": 771,
            "nome_perfil": "Gestor RJ - Declara Agua Gerencial",
            "descricao_perfil": "Perfil para acesso ao Declara Agua Gerencial com perfil de edição e visualização as leituras de usuários do estado do Rio de Janeiro."

            "codigo_perfil": 772,
            "nome_perfil": "Usuario RJ - Declara Agua Gerencial",
            "descricao_perfil": "Perfil para acesso ao Declara Agua Gerencial com perfil exclusivo de visualização (sem edição) das leituras de usuários estaduais do RJ."

            "codigo_perfil": 773,
            "nome_perfil": "Root Federal - Declara Agua Gerencial",
            "descricao_perfil": "Perfil Gerencial de Configuração e acesso a edição de dados restritos do Declara Agua "
    */
    const perfis_permitidos = [765, 766, 768, 767, 769, 770, 771, 772, 773];

    let request = new XMLHttpRequest();
    request.open("GET", url, false); // requisição síncrona
    request.send();

    if (request.status === 200) {
        let response = JSON.parse(request.responseText);
        let items = response.items || [];

        // Data de expiração genérica (4 horas) para os cookies
        let expiracao = new Date();
        expiracao.setHours(expiracao.getHours() + 4);

        items.forEach(function (perfil) {
            if (perfis_permitidos.includes(perfil.codigo_perfil)) {
                // Guarda em cookie se possuir a permissão.
                setCookie("__Secure_Perfil_" + perfil.codigo_perfil, true, expiracao);
            }
        });

        // Busca nome de exibição do usuário logado
        let reqUsr = new XMLHttpRequest();
        reqUsr.open("GET", "https://ows.snirh.gov.br:443/ords/servicos/seguranca/id_user_on_token?token=" + token, false);
        reqUsr.send();
        if (reqUsr.status === 200) {
            let usrResp = JSON.parse(reqUsr.responseText);
            let usrItems = usrResp.items || [];
            if (usrItems.length > 0) {
                let nome = usrItems[0].usu_nm_exibicao || '';
                // Corrige mojibake UTF-8/Latin-1 gerado pelo Oracle ORDS
                try { nome = decodeURIComponent(escape(nome)); } catch (e) {}
                setCookie("__User_Nome", encodeURIComponent(nome), expiracao);
            }
        }
    } else {
        console.error("Erro ao buscar perfis do usuário");
    }
}

function autenticar_usuario(data) {

    usr = data.cpf.replace(/[^0-9]/g, '');
    pws = data.senha;

    let msg = get_token_seguranca(usr, pws);
    let login_json = JSON.parse(msg);
    if (login_json.httpStatus == "OK") {

        let expiracao = new Date();
        expiracao.setHours(expiracao.getHours() + 4);
        setCookie("token", login_json.token, expiracao);

        get_perfil_usuario(login_json.token);

        toastr.options = {
            "closeButton": true,
            //"debug": false,
            //"newestOnTop": false,
            "progressBar": true,
            //"positionClass": "toast-top-center", // Centralizado no topo
            //"preventDuplicates": false,
            //"onclick": null,
            //"showDuration": "300",
            //"hideDuration": "500",
            "timeOut": "2000",
            "extendedTimeOut": "1000",
            "showEasing": "swing",
            "hideEasing": "linear",
            "showMethod": "fadeIn",
            "hideMethod": "fadeOut"
        };
        toastr.success("Autenticação realizada com sucesso.", "Sucesso");

        show_mensage();
        /*setTimeout(function() {
            window.location = "http://portal.snirh.gov.br/declaraagua/index.html";
        }, 1000);*/

    } else {
        toastr.error(login_json.retorno, "Credenciais Inválidas. Tente Novamente.");
    };
}

function show_mensage() {
    setTimeout(function () {
        window.location = "index.html";
    }, 1000);
}