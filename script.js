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
// INICIALIZAÇÃO DO BANCO DE DADOS NA NUVEM
// ==========================================
function padronizarTexto(texto) {
    return texto ? texto.toLowerCase().trim().replace(/\s+/g, '') : '';
}

function inicializarBancoDeDados() {
    // Escuta os usuários cadastrados na nuvem em tempo real
    db.ref('usuarios').on('value', (snapshot) => {
        let usuarios = snapshot.val();
        
        // Se a nuvem estiver vazia, cria as contas padrão iniciais
        if (!usuarios) {
            const contasPadrao = {
                "1º Sgt Simas": { usuario: "1º Sgt Simas", senha: "Damer1986@", reparticao: "ST/SGT", nivelAcesso: "Administrador" },
                "3º Sgt Silva": { usuario: "3º Sgt Silva", senha: "123", reparticao: "ST/SGT", nivelAcesso: "Militar" },
                "3º Sgt Pimentel": { usuario: "3º Sgt Pimentel", senha: "123", reparticao: "ST/SGT", nivelAcesso: "Militar" }
            };
            db.ref('usuarios').set(contasPadrao);
        } else {
            // Remove contas fantasmas ou residuais
            for (let id in usuarios) {
                if (padronizarTexto(usuarios[id].usuario) === "sgtsimas") {
                    db.ref(`usuarios/${id}`).remove();
                }
            }
        }
    });

    // Escuta os registros de arranchamento em tempo real
    db.ref('registrosArranchamento').on('value', (snapshot) => {
        window.todosRegistros = snapshot.val() ? Object.values(snapshot.val()) : [];
        if (usuarioLogado && usuarioLogado.nivelAcesso === "Administrador") {
            atualizarPainelAdmin();
        }
    });
}

// ==========================================
// FUNÇÕES DE LOGIN, CADASTRO E SENHA
// ==========================================
function realizarLogin(nomeInput, senhaInput) {
    db.ref('usuarios').once('value', (snapshot) => {
        const usuarios = snapshot.val();
        let usuarioEncontrado = null;

        for (let id in usuarios) {
            if (padronizarTexto(usuarios[id].usuario) === padronizarTexto(nomeInput) && usuarios[id].senha === senhaInput) {
                usuarioEncontrado = usuarios[id];
                break;
            }
        }

        if (usuarioEncontrado) {
            usuarioLogado = usuarioEncontrado;
            alert(`Bem-vindo, ${usuarioLogado.usuario}!`);
            configurarTelaPorNivel();
        } else {
            alert("Usuário ou senha incorretos, ou conta ainda não gerada!");
        }
    });
}

function alterarSenha(novaSenha) {
    if (!usuarioLogado) return alert("Nenhum usuário logado!");
    
    db.ref('usuarios').once('value', (snapshot) => {
        const usuarios = snapshot.val();
        let chaveUsuario = null;

        for (let id in usuarios) {
            if (padronizarTexto(usuarios[id].usuario) === padronizarTexto(usuarioLogado.usuario)) {
                chaveUsuario = id;
                break;
            }
        }

        if (chaveUsuario) {
            db.ref(`usuarios/${chaveUsuario}/senha`).set(novaSenha)
                .then(() => {
                    usuarioLogado.senha = novaSenha;
                    alert("Senha alterada com sucesso na nuvem!");
                })
                .catch(() => alert("Erro ao atualizar a senha. Tente novamente."));
        }
    });
}

// ==========================================
// FUNÇÃO DE SALVAR ARRANCHAMENTO
// ==========================================
function salvarArranchamento(dadosArranchamento) {
    if (!usuarioLogado) return alert("Faça login para salvar!");

    const idRegistro = `${padronizarTexto(usuarioLogado.usuario)}_${new Date().toISOString().slice(0,10)}`;
    
    db.ref(`registrosArranchamento/${idRegistro}`).set({
        usuario: usuarioLogado.usuario,
        reparticao: usuarioLogado.reparticao,
        dataRegistro: new Date().toLocaleDateString('pt-BR'),
        ...dadosArranchamento
    }).then(() => {
        alert("Arranchamento salvo com sucesso na nuvem!");
    }).catch(() => {
        alert("Erro ao salvar arranchamento online.");
    });
}

// ==========================================
// FUNÇÃO DO BOTÃO GERAR QR CODE
// ==========================================
function configurarBotaoQRCode() {
    const btnQRCode = document.getElementById('btnGerarQRCode') || document.querySelector('.btn-qrcode') || document.querySelector('.btn-primary');
    
    if (btnQRCode) {
        btnQRCode.addEventListener('click', () => {
            const urlSistema = "https://marcosdamersimas-ctrl.github.io/ARRANCHAMENTO-2026/";
            const urlGerador = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(urlSistema)}`;
            window.open(urlGerador, '_blank');
        });
    }
}

// ==========================================
// CONTROLE DE INTERFACE E ESTRUTURA
// ==========================================
function configurarTelaPorNivel() {
    if (usuarioLogado.nivelAcesso === "Administrador") {
        document.getElementById('painelAdmin').style.display = 'block';
        atualizarPainelAdmin();
    } else {
        document.getElementById('painelAdmin').style.display = 'none';
    }
    document.getElementById('telaLogin').style.display = 'none';
    document.getElementById('telaPrincipal').style.display = 'block';
}

function atualizarPainelAdmin() {
    const tabela = document.getElementById('corpoTabelaAdmin');
    if (!tabela || !window.todosRegistros) return;

    tabela.innerHTML = "";
    window.todosRegistros.forEach(reg => {
        const linha = `<tr>
            <td>${reg.usuario}</td>
            <td>${reg.reparticao}</td>
            <td>${reg.dataRegistro}</td>
            <td>${reg.status || 'Arranchado'}</td>
        </tr>`;
        tabela.innerHTML += linha;
    });
}

// Inicializa tudo quando o documento carrega
document.addEventListener('DOMContentLoaded', () => {
    inicializarBancoDeDados();
    configurarBotaoQRCode();
});