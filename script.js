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
    db.ref('usuarios').on('value', (snapshot) => {
        let usuarios = snapshot.val();
        if (!usuarios) {
            const contasPadrao = {
                "1º Sgt Simas": { usuario: "1º Sgt Simas", senha: "Damer1986@", reparticao: "ST/SGT", nivelAcesso: "Administrador" },
                "3º Sgt Silva": { usuario: "3º Sgt Silva", senha: "123", reparticao: "ST/SGT", nivelAcesso: "Militar" },
                "3º Sgt Pimentel": { usuario: "3º Sgt Pimentel", senha: "123", reparticao: "ST/SGT", nivelAcesso: "Militar" }
            };
            db.ref('usuarios').set(contasPadrao);
        } else {
            for (let id in usuarios) {
                if (padronizarTexto(usuarios[id].usuario) === "sgtsimas") {
                    db.ref(`usuarios/${id}`).remove();
                }
            }
        }
    });

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

// Função global para o botão de logout
function fazerLogout() {
    usuarioLogado = null;
    document.getElementById('telaLogin').style.display = 'block';
    document.getElementById('telaPrincipal').style.display = 'none';
    document.getElementById('painelAdmin').style.display = 'none';
    alert("Sessão encerrada!");
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
// CONTROLE DE INTERFACE E ESTRUTURA
// ==========================================
function configurarTelaPorNivel() {
    const painelAdmin = document.getElementById('painelAdmin');
    const telaLogin = document.getElementById('telaLogin');
    const telaPrincipal = document.getElementById('telaPrincipal');

    if (usuarioLogado.nivelAcesso === "Administrador") {
        if (painelAdmin) painelAdmin.style.display = 'block';
        atualizarPainelAdmin();
    } else {
        if (painelAdmin) painelAdmin.style.display = 'none';
    }
    if (telaLogin) telaLogin.style.display = 'none';
    if (telaPrincipal) telaPrincipal.style.display = 'block';
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

// ==========================================
// INICIALIZADOR SEGURO DA PÁGINA
// ==========================================
function iniciarSistemaGarantido() {
    inicializarBancoDeDados();
    
    // Garante que a tela de login esteja visível e o resto oculto no início
    const telaLogin = document.getElementById('telaLogin');
    const telaPrincipal = document.getElementById('telaPrincipal') || document.getElementById('painel-sistema');
    const painelAdmin = document.getElementById('painelAdmin') || document.getElementById('conteudo-admin');

    if (telaLogin) telaLogin.style.display = 'block';
    if (telaPrincipal) {
        telaPrincipal.style.display = 'none';
        // Remove classes do Bootstrap/CSS antigo que forçavam ocultação estática
        telaPrincipal.classList.remove('hidden');
    }
    if (painelAdmin) {
        painelAdmin.style.display = 'none';
        painelAdmin.classList.remove('hidden');
    }
}

// Tenta executar imediatamente e também quando o DOM estiver pronto
iniciarSistemaGarantido();
document.addEventListener('DOMContentLoaded', iniciarSistemaGarantido);
window.onload = iniciarSistemaGarantido;