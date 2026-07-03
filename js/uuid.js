function create_UUID(){
    var dt = new Date().getTime();
    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = (dt + Math.random()*16)%16 | 0;
        dt = Math.floor(dt/16);
        return (c=='x' ? r :(r&0x3|0x8)).toString(16);
    });
    return uuid;
}

function print_uuid(){
    document.getElementById("p_BACIA_Av").value = document.getElementById("nm_bacia").innerHTML;
    document.getElementById("p_NM_RESPONSAVEL_Av").value = document.getElementById("nm_usuario").innerHTML;
    document.getElementById("p_NM_EMPREENDIMENTO_Av").value = document.getElementById("nm_empreendimento_desc").innerHTML;
    document.getElementById("p_NM_EQUIP_Av").value = document.getElementById("nm_usuario").innerHTML;
    document.getElementById("p_NU_CNARH_Av").value = document.getElementById("nu_cnarh_desc").innerHTML;      
    document.getElementById("p_NM_EQUIP_Av").value = document.getElementById("nm_equipamento").innerHTML;                                       
    document.getElementById("p_TP_EQUIP_Av").value = document.getElementById("tp_equipamento_desc").innerHTML;

    document.getElementById("modal_leitura_avulsa").click();
}

function print_uuid2(){

    const urlParams = new URLSearchParams(window.location.search);

    let pID_ARQUIVO   = create_UUID();
    let pDS_ARQUIVO   = 'data:image/jpeg;base64'; 
    let pID_TIPO_ARQUIVO  = 2;
    let pDT_ARQUIVO       = null;
    let pNU_LATITUDE      = null;
    let pNU_LONGITUDE     = null;
    let pDT_SINCRONIZACAO = null; 
    
    var token =  getCookie("token");
    headers = {"Authorization": token};

    // chamar serviço de post pra arquivo.

    let pID_LEITURA_EQUIPAMENTO =  create_UUID();
    let pNU_LEITURA = null;
    let pDT_LEITURA = null;
    let pDS_COMENTARIO = 'Leitura realizada pela equipe campo. Inserção avulsa.';
    let pID_EQUIPAMENTO    = urlParams.get('id_equipamento');
    let pNU_VAZAO_NOMINAL  = null;
    //pDT_SINCRONIZACAO  - será preenchido pelo serviço: sysdate
    let pNU_VAZAO_MEDIDA   = null;
    let pID_UNIDADE_VAZAO  = null;
    let pNU_LEITURA_PADRAO = null;
    let pNU_VAZAO_NOMINAL_PADRAO = null;
    let pNU_VAZAO_MEDIDA_PADRAO  =  null;
    let pIC_LEITURA_VALIDA       = 1; 
    //pNU_LEITURA_QUALIFICADA  = a mesma da leitura
    //pDT_QUALIFICACAO - será preenchido no serviço
    //pNM_TECNICO_QUALIFICACAO - será preenchido no serviço a partir do token

    // chamar serviço de post pra leitura.

    console.log(create_UUID());
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

