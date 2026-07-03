function api_valida_token(url){
    let request = new XMLHttpRequest()
    request.open("GET", url, false)
    request.send()
    return request.responseText
}

function valida_token(){
    var token =  getCookie("token");
    if (token == null){ 
        return null;
    }
    else
    {
        let validar_acesso = api_valida_token("https://ows.snirh.gov.br:443/ords/servicos/seguranca/valida-token?token="+ token);
        let validar_acesso_json = JSON.parse(validar_acesso);
        return validar_acesso_json.items[0].token_valido;    
    }
}
