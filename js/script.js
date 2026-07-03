/* =====================================
   CPF MASK
===================================== */

const cpfInput = document.getElementById('cpf');

cpfInput.addEventListener('input', () => {
    let value = cpfInput.value.replace(/\D/g, '');
    value = value.replace(/(\d{3})(\d)/, '$1.$2');
    value = value.replace(/(\d{3})(\d)/, '$1.$2');
    value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    cpfInput.value = value;
});

/* =====================================
   PASSWORD TOGGLE
===================================== */

const togglePassword = document.getElementById('togglePassword');
const senhaInput     = document.getElementById('senha');

togglePassword.addEventListener('click', () => {
    senhaInput.type = senhaInput.type === 'password' ? 'text' : 'password';
});

/* =====================================
   RECUPERAÇÃO DE SENHA — MAPEAMENTO
===================================== */

const RECOVERY_MESSAGES = {
    'A senha foi enviada com sucesso.': {
        type: 'success',
        title: 'Senha enviada!',
        text: 'Uma nova senha foi enviada para o seu e-mail cadastrado.'
    },
    'O e-mail informado é divergente do e-mail cadastrado.': {
        type: 'error',
        title: 'E-mail incorreto',
        text: 'O e-mail informado não corresponde ao cadastrado para este CPF.'
    },
    'O usuário está inativo ou não pode trocar sua senha.': {
        type: 'warning',
        title: 'Usuário inativo',
        text: 'Este usuário está inativo ou não tem permissão para redefinir a senha. Contate o administrador.'
    }
};

/* =====================================
   ALTERNÂNCIA DE MODO (login / recuperação)
===================================== */

let isRecoveryMode = false;

const SUBTITLE_LOGIN    = 'Faça login para acessar o sistema';
const SUBTITLE_RECOVERY = 'Preencha o e-mail para receber nova senha';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validarEmail(valor) {
    return EMAIL_REGEX.test(valor.trim());
}

function showRecovery() {
    isRecoveryMode = true;
    document.getElementById('formSubtitle').textContent  = SUBTITLE_RECOVERY;
    document.getElementById('senhaGroup').style.display  = 'none';
    document.getElementById('emailGroup').style.display  = '';
    document.getElementById('optionsDiv').style.display  = 'none';
    document.getElementById('btnVoltar').style.display   = '';
    document.getElementById('btnLabel').innerHTML        = 'Enviar Nova Senha&nbsp;<i class="fa fa-envelope"></i>';
    document.getElementById('emailRecuperacao').value    = '';
    document.getElementById('loginBtn').disabled         = true;
    document.getElementById('emailRecuperacao').focus();
}

function showLogin() {
    isRecoveryMode = false;
    document.getElementById('formSubtitle').textContent  = SUBTITLE_LOGIN;
    document.getElementById('senhaGroup').style.display  = '';
    document.getElementById('emailGroup').style.display  = 'none';
    document.getElementById('optionsDiv').style.display  = '';
    document.getElementById('btnVoltar').style.display   = 'none';
    document.getElementById('btnLabel').innerHTML        = 'Entrar &nbsp;<i class="fa fa-sign-in"></i>';
    document.getElementById('emailRecuperacao').value    = '';
    document.getElementById('loginBtn').disabled         = false;
}

/* Habilita/desabilita o botão conforme validação do e-mail */
document.getElementById('emailRecuperacao').addEventListener('input', function () {
    document.getElementById('loginBtn').disabled = !validarEmail(this.value);
});

/* =====================================
   SERVIÇO RECUPERAÇÃO DE SENHA
===================================== */

async function enviarRecuperacaoSenha(cpf, email) {
    const btn       = document.getElementById('loginBtn');
    const btnLabel  = document.getElementById('btnLabel');
    const original  = btnLabel.innerHTML;

    btn.disabled      = true;
    btnLabel.innerHTML = '<i class="fa fa-spinner fa-spin"></i> &nbsp;Enviando...';

    toastr.options = {
        closeButton: true,
        progressBar: true,
        timeOut: '5000',
        extendedTimeOut: '2000',
        showMethod: 'fadeIn',
        hideMethod: 'fadeOut'
    };

    try {
        const url = 'https://www.snirh.gov.br/sso/rest/password/esqueciSenha'
                  + '?identificador=' + encodeURIComponent(cpf)
                  + '&email='         + encodeURIComponent(email);

        const response = await fetch(url, { method: 'POST' });
        const data     = await response.json();

        const msgKey = data.error_description || data.status || '';
        const mapped = RECOVERY_MESSAGES[msgKey];

        if (mapped) {
            if (mapped.type === 'success') {
                toastr.success(mapped.text, mapped.title);
                setTimeout(() => showLogin(), 3500);
            } else if (mapped.type === 'error') {
                toastr.error(mapped.text, mapped.title);
            } else {
                toastr.warning(mapped.text, mapped.title);
            }
        } else {
            // Mensagem não mapeada — exibe o retorno bruto
            const raw = data.error_description || data.status || 'Resposta inesperada do servidor.';
            toastr.info(raw, 'Aviso');
        }

    } catch (e) {
        toastr.error('Não foi possível contactar o servidor. Verifique sua conexão e tente novamente.', 'Erro de conexão');
    } finally {
        btn.disabled      = false;
        btnLabel.innerHTML = original;
    }
}

/* =====================================
   SUBMIT
===================================== */

const form = document.getElementById('loginForm');

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (isRecoveryMode) {
        const cpfVal   = cpfInput.value.replace(/\D/g, '');
        const emailVal = document.getElementById('emailRecuperacao').value.trim();

        if (cpfVal.length !== 11) {
            toastr.error('Informe um CPF válido (11 dígitos).', 'CPF inválido');
            cpfInput.focus();
            return;
        }
        if (!emailVal || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
            toastr.error('Informe um e-mail válido.', 'E-mail inválido');
            document.getElementById('emailRecuperacao').focus();
            return;
        }

        await enviarRecuperacaoSenha(cpfVal, emailVal);

    } else {
        const data = { cpf: cpfInput.value, senha: senhaInput.value };
        autenticar_usuario(data);
    }
});

/* =====================================
   CAROUSEL
===================================== */

const slides = document.querySelectorAll('.slide');
const dots   = document.querySelectorAll('.dot');

let currentSlide = 0;
let autoPlay     = null;

function showSlide(index) {
    slides.forEach((slide) => { slide.classList.remove('active'); });
    dots.forEach((dot)     => { dot.classList.remove('active');   });
    slides[index].classList.add('active');
    dots[index].classList.add('active');
    currentSlide = index;
}

function nextSlide()   { showSlide((currentSlide + 1) % slides.length); }
function startAutoPlay(){ stopAutoPlay(); autoPlay = setInterval(nextSlide, 4000); }
function stopAutoPlay() { if (autoPlay) clearInterval(autoPlay); }

/* CLIQUE NOS DOTS */
dots.forEach((dot, i) => {
    dot.addEventListener('click', () => { showSlide(i); startAutoPlay(); });
});

startAutoPlay();
