// ==========================================
// CONFIGURAÇÃO DO FIREBASE (BANCO DE DADOS)
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyCJ9wWsIMG_t9pY9KrX99TC3y58_Yjk_Bo",
  authDomain: "arranchamento-7rcmec.firebaseapp.com",
  databaseURL: "https://arranchamento-7rcmec-default-rtdb.firebaseio.com",
  projectId: "arranchamento-7rcmec",
  storageBucket: "arranchamento-7rcmec.firebasestorage.app",
  messagingSenderId: "284122873915",
  appId: "1:284122873915:web:175f3f8b1d9f7f3626dc1e",
  measurementId: "G-STZQVFCJ2K"
};

// Inicializa o Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// Variáveis Globais de Controle
let usuarioLogado = null;

// ==========================================
// INICIALIZAÇÃO E CONTROLE DE NUVEM
// ==========================================
function padronizarTexto(texto) {
    return texto ? texto.toLowerCase().trim().replace(/\s+/g, '') : '';
}

function inicializarBancoDeDados() {
    db.ref('usuarios').on('value', (snapshot) => {
        let usuarios = snapshot.val();
        if (!usuarios) {
            const contasPadrao = {
                "1º Sgt Simas": { usuario: "1º Sgt Simas", senha: "Damer1986@", reparticao: "ST/SGT", nivelAcesso: "Administrador" },
                "3º Sgt Silva": { usuario: "3º Sgt Silva", senha: "123", reparticao: "ST/SGT", nivelAcesso: "Militar" },
                "3º Sgt Pimentel": { usuario: "3º Sgt Pimentel", senha: "123", reparticao: "ST/SGT", nivelAcesso: "Militar" }
            };
            db.ref('usuarios').set(contasPadrao);
        }
    });

    db.ref('registrosArranchamento').on('value', (snapshot) => {
        window.todosRegistros = snapshot.val() ? Object.values(snapshot.val()) : [];
    });
}

// ==========================================
// FLUXO DE ACESSO / LOGIN
// ==========================================
function efetuarAcesso() {
    const reparticaoInput = document.getElementById('login-reparticao').value;
    const nomeInput = document.getElementById('login-usuario').value;
    const senhaInput = document.getElementById('login-senha').value;

    db.ref('usuarios').once('value', (snapshot) => {
        const usuarios = snapshot.val();
        let usuarioEncontrado = null;

        for (let id in usuarios) {
            if (padronizarTexto(usuarios[id].usuario) === padronizarTexto(nomeInput)) {
                usuarioEncontrado = usuarios[id];
                break;
            }
        }

        if (usuarioEncontrado) {
            // Usuário existe: valida a senha
            if (usuarioEncontrado.senha === senhaInput) {
                usuarioLogado = usuarioEncontrado;
                alert(`Bem-vindo de volta, ${usuarioLogado.usuario}!`);
                configurarTelaPorNivel();
            } else {
                alert("Senha incorreta para este usuário!");
            }
        } else {
            // Primeiro acesso: Cadastra automaticamente na nuvem
            const novoId = db.ref('usuarios').push().key;
            const novoUsuario = {
                usuario: nomeInput,
                senha: senhaInput,
                reparticao: reparticaoInput,
                nivelAcesso: "Militar" // Padrão inicial
            };

            db.ref(`usuarios/${novoId}`).set(novoUsuario)
                .then(() => {
                    usuarioLogado = novoUsuario;
                    alert(`Conta criada com sucesso! Bem-vindo, ${nomeInput}.`);
                    configurarTelaPorNivel();
                })
                .catch(() => alert("Erro ao criar conta automaticamente."));
        }
    });
}

function fazerLogout() {
    usuarioLogado = null;
    document.getElementById('tela-login').classList.remove('hidden');
    document.getElementById('painel-sistema').classList.add('hidden');
    alert("Sessão encerrada!");
}

// ==========================================
// CONTROLE DE INTERFACE POR NÍVEL
// ==========================================
function configurarTelaPorNivel() {
    const telaLogin = document.getElementById('tela-login');
    const painelSistema = document.getElementById('painel-sistema');
    const militarLogadoSpan = document.getElementById('militar-logado');

    if (militarLogadoSpan) militarLogadoSpan.innerText = usuarioLogado.usuario;

    // Gerencia visibilidade das abas restritas com base nas classes do HTML
    document.querySelectorAll('.adm-only').forEach(el => {
        if (usuarioLogado.nivelAcesso === "Administrador") el.classList.remove('hidden');
        else el.classList.add('hidden');
    });

    document.querySelectorAll('.furriel-only').forEach(el => {
        if (usuarioLogado.nivelAcesso === "Furriel" || usuarioLogado.nivelAcesso === "Administrador") el.classList.remove('hidden');
        else el.classList.add('hidden');
    });

    if (telaLogin) telaLogin.classList.add('hidden');
    if (painelSistema) painelSistema.classList.remove('hidden');
}

function alternarAba(nomeAba) {
    document.querySelectorAll('.aba-conteudo').forEach(aba => aba.classList.add('hidden'));
    document.querySelectorAll('.btn-aba').forEach(btn => btn.classList.remove('ativo'));

    const abaAlvo = document.getElementById(`conteudo-${nomeAba}`);
    const btnAlvo = document.getElementById(`btn-aba-${nomeAba}`);

    if (abaAlvo) abaAlvo.classList.remove('hidden');
    if (btnAlvo) btnAlvo.classList.add('ativo');
}

// ==========================================
// ACESSO MOBILE - GERAR QR CODE
// ==========================================
function gerarQRCodeConexao() {
    const container = document.getElementById('container-qrcode');
    const img = document.getElementById('img-qrcode');
    const txt = document.getElementById('txt-url-qrcode');

    const urlSistema = "https://marcosdamersimas-ctrl.github.io/ARRANCHAMENTO-2026/";
    
    if (container && img && txt) {
        img.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(urlSistema)}`;
        txt.innerText = urlSistema;
        container.style.display = 'block';
    }
}

// ==========================================
// DEMAIS FUNÇÕES E ROTINAS AUXILIARES
// ==========================================
function alterarMinhaSenha() {
    const novaSenha = document.getElementById('senha-nova').value;
    if (!novaSenha) return alert("Digite a nova senha!");

    db.ref('usuarios').once('value', (snapshot) => {
        const usuarios = snapshot.val();
        for (let id in usuarios) {
            if (padronizarTexto(usuarios[id].usuario) === padronizarTexto(usuarioLogado.usuario)) {
                db.ref(`usuarios/${id}/senha`).set(novaSenha).then(() => {
                    alert("Senha alterada com sucesso!");
                });
                break;
            }
        }
    });
}

function salvarArranchamento(e) {
    e.preventDefault();
    alert("Funcionalidade de salvamento integrada ao Firebase!");
}

// Inicializador automático na inicialização
document.addEventListener('DOMContentLoaded', () => {
    inicializarBancoDeDados();
});