function put_leitura(url, token, chave_leitura, leitura_consolidada, nu_valida, nu_ocorrencia) {

  var request = new XMLHttpRequest();

  url = url + '?id_leitura_cd=' + chave_leitura + "&leitura_consistida=" + leitura_consolidada + "&ic_leitura_valida=" + nu_valida + "&nu_ocorrencia= " + nu_ocorrencia
  request.open("PUT", url, true);

  //console.log(url);

  headers = { "Authorization": token };
  //, "leitura_consistida": leitura_consolidada, "ic_leitura_valida" : nu_valida};

  //console.log("Leitura_consolidada2: " + leitura_consolidada);

  for (let key in headers) {
    request.setRequestHeader(key, headers[key])
  }
  request.onreadystatechange = function () {
    if (this.readyState === XMLHttpRequest.DONE && this.status === 200) {
      console.log(this.responseText);
    }
  }
  request.send();

  return request.statusText
}


function gravar_leitura_consistida() {
  //preventDefault();
  let chave_leitura = document.getElementById("p_chave_leitura").value;
  let leitura_consolidada = document.getElementById("p_NU_LEITURA_QUALIFICADA").value;

  var nu_valida = "0";
  if (document.getElementById("leitura_valida").checked == true) {
    nu_valida = "1";
  };

  var nu_ocorrencia = document.getElementById("list_ocorrencia").value;

  if (leitura_consolidada != "" || nu_valida == "0") {
    var url = "https://ows.snirh.gov.br/ords/servicos/declara_agua_gerencial/consistir_leitura";
    var token = getCookie("token")

    put_leitura(url, token, chave_leitura, leitura_consolidada, nu_valida, nu_ocorrencia);

    document.getElementById('alert_salvo_sucesso').click();

    setTimeout(function () {

      nextLine();
      consist_main();
      //document.getElementById("bt_cancelar").click();
    }, 1000);
  }
  else {
    document.getElementById('alert_dados_incompletos').click();
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