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
let dataSelecionadaGlobal = new Date().toISOString().slice(0, 10);
let indiceCarrosselInicio = 0;

// ==========================================
// INICIALIZAÇÃO DO SISTEMA
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // Define a data de hoje no calendário global
    const inputDataGlobal = document.getElementById('data-sistema-global');
    if (inputDataGlobal) {
        inputDataGlobal.value = dataSelecionadaGlobal;
    }
    
    inicializarBancoDeDados();
    gerarDiasCarrosselDinamico();
});

function padronizarTexto(texto) {
    return texto ? texto.toLowerCase().trim().replace(/\s+/g, '') : '';
}

function inicializarBancoDeDados() {
    // Escuta usuários cadastrados
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

    // Escuta os registros de arranchamento em tempo real
    db.ref('registrosArranchamento').on('value', (snapshot) => {
        window.todosRegistros = snapshot.val() ? Object.values(snapshot.val()) : [];
        atualizarVisualizacaoNominal();
        atualizarVisualizacaoFurriel();
    });
}

// ==========================================
// FLUXO DE ACESSO / LOGIN E CADASTRO
// ==========================================
function efetuarAcesso() {
    const reparticaoInput = document.getElementById('login-reparticao').value;
    const nomeInput = document.getElementById('login-usuario').value;
    const senhaInput = document.getElementById('login-senha').value;

    if (!nomeInput || !senhaInput) {
        return alert("Por favor, preencha todos os campos!");
    }

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
            if (usuarioEncontrado.senha === senhaInput) {
                usuarioLogado = usuarioEncontrado;
                alert(`Bem-vindo, ${usuarioLogado.usuario}!`);
                configurarTelaPorNivel();
            } else {
                alert("Senha incorreta para este usuário!");
            }
        } else {
            // Autocadastro no primeiro acesso
            const novoId = db.ref('usuarios').push().key;
            const novoUsuario = {
                usuario: nomeInput,
                senha: senhaInput,
                reparticao: reparticaoInput,
                nivelAcesso: "Militar"
            };

            db.ref(`usuarios/${novoId}`).set(novoUsuario)
                .then(() => {
                    usuarioLogado = novoUsuario;
                    alert(`Conta criada com sucesso! Bem-vindo, ${nomeInput}.`);
                    configurarTelaPorNivel();
                })
                .catch(() => alert("Erro ao criar sua conta."));
        }
    });
}

function fazerLogout() {
    usuarioLogado = null;
    document.getElementById('tela-login').classList.remove('hidden');
    document.getElementById('painel-sistema').classList.add('hidden');
    alert("Sessão encerrada!");
}

function configurarTelaPorNivel() {
    const militarLogadoSpan = document.getElementById('militar-logado');
    if (militarLogadoSpan) militarLogadoSpan.innerText = usuarioLogado.usuario;

    // Gerencia botões de abas administrativas/furriel
    document.querySelectorAll('.adm-only').forEach(el => {
        if (usuarioLogado.nivelAcesso === "Administrador") el.classList.remove('hidden');
        else el.classList.add('hidden');
    });

    document.querySelectorAll('.furriel-only').forEach(el => {
        if (usuarioLogado.nivelAcesso === "Furriel" || usuarioLogado.nivelAcesso === "Administrador") el.classList.remove('hidden');
        else el.classList.add('hidden');
    });

    // Atualiza badges visuais se houver
    const containerBadge = document.getElementById('nivel-badge-container');
    if (containerBadge) {
        containerBadge.innerHTML = `<span class="badge">${usuarioLogado.nivelAcesso}</span>`;
    }

    document.getElementById('tela-login').classList.add('hidden');
    document.getElementById('painel-sistema').classList.remove('hidden');
    
    // FORÇA O CARROSSEL DE DIAS A GERAR NO MOMENTO DO LOGIN
    gerarDiasCarrosselDinamico();
    
    alternarAba('arranchamento');
}

function alternarAba(nomeAba) {
    document.querySelectorAll('.aba-conteudo').forEach(aba => aba.classList.add('hidden'));
    document.querySelectorAll('.btn-aba').forEach(btn => btn.classList.remove('ativo'));

    const abaAlvo = document.getElementById(`conteudo-${nomeAba}`);
    const btnAlvo = document.getElementById(`btn-aba-${nomeAba}`);

    if (abaAlvo) abaAlvo.classList.remove('hidden');
    if (btnAlvo) btnAlvo.classList.add('ativo');

    if (nomeAba === 'admin') {
        renderizarListaDeUsuariosParaAdmin();
    }
}

// ==========================================
// CONTROLE DO CARROSSEL DE DIAS E SALVAMENTO
// ==========================================
function gerarDiasCarrosselDinamico() {
    const container = document.getElementById('container-dias-dinamicos');
    if (!container) return;

    container.innerHTML = "";
    const diasSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    const usuarioId = usuarioLogado ? padronizarTexto(usuarioLogado.usuario) : '';

    // 1. Buscamos primeiro os registros existentes na nuvem para não resetar os checks na tela
    db.ref('registrosArranchamento').once('value', (snapshot) => {
        const registros = snapshot.val() || {};

        // 2. Gera os próximos 7 dias utilizando a data LOCAL do navegador (evita bug de fuso horário)
        for (let i = 0; i < 7; i++) {
            const dataFoco = new Date();
            dataFoco.setDate(dataFoco.getDate() + i);
            
            // Extrai ano, mês e dia locais de forma segura
            const ano = dataFoco.getFullYear();
            const mes = String(dataFoco.getMonth() + 1).padStart(2, '0');
            const dia = String(dataFoco.getDate()).padStart(2, '0');
            const dataStr = `${ano}-${mes}-${dia}`;
            
            const diaS = diasSemana[dataFoco.getDay()];
            const diaM = dia;

            // Busca se o militar já tem algo salvo para este dia específico
            const chaveRegistro = `${usuarioId}_${dataStr}`;
            const dadosSalvos = registros[chaveRegistro] || { cafe: false, almoco: false, jantar: false };

            const cardDia = document.createElement('div');
            cardDia.className = "dia-card";
            cardDia.innerHTML = `
                <div class="dia-titulo">${diaS} (${diaM})</div>
                <div class="opcoes-refeicao">
                    <label><input type="checkbox" name="c-${dataStr}" value="Cafe" ${dadosSalvos.cafe ? 'checked' : ''}> Café</label>
                    <label><input type="checkbox" name="a-${dataStr}" value="Almoco" ${dadosSalvos.almoco ? 'checked' : ''}> Almoço</label>
                    <label><input type="checkbox" name="j-${dataStr}" value="Jantar" ${dadosSalvos.jantar ? 'checked' : ''}> Jantar</label>
                </div>
            `;
            container.appendChild(cardDia);
        }
    });
}

function mudarDiaCarrossel(direcao) {
    const container = document.getElementById('container-dias-dinamicos');
    if (container) {
        // Aumentado o valor do scroll para deslizar o card inteiro visivelmente
        container.scrollBy({
            left: direcao * 180,
            behavior: 'smooth'
        });
    }
}

function sincronizarDataGlobal() {
    const inputDataGlobal = document.getElementById('data-sistema-global');
    if (inputDataGlobal) {
        dataSelecionadaGlobal = inputDataGlobal.value;
        atualizarVisualizacaoNominal();
        atualizarVisualizacaoFurriel();
    }
}

function salvarArranchamento(e) {
    e.preventDefault();
    if (!usuarioLogado) return alert("Faça login primeiro!");

    const escolhas = {};
    const inputs = document.querySelectorAll('#container-dias-dinamicos input[type="checkbox"]');
    
    // Captura o estado de cada uma das caixas do carrossel
    inputs.forEach(input => {
        // Garante que a data YYYY-MM-DD seja extraída de forma limpa, independente do prefixo c-, a- ou j-
        const dataKey = input.name.substring(2); 
        const refeicao = input.value.toLowerCase(); // 'cafe', 'almoco' ou 'jantar'

        if (!escolhas[dataKey]) {
            escolhas[dataKey] = { cafe: false, almoco: false, jantar: false };
        }
        if (input.checked) {
            escolhas[dataKey][refeicao] = true;
        }
    });

    // Envia e atualiza na nuvem
    const promises = Object.keys(escolhas).map(dataStr => {
        const idRegistro = `${padronizarTexto(usuarioLogado.usuario)}_${dataStr}`;
        return db.ref(`registrosArranchamento/${idRegistro}`).set({
            usuario: usuarioLogado.usuario,
            reparticao: usuarioLogado.reparticao,
            dataRegistro: dataStr,
            cafe: escolhas[dataStr].cafe,
            almoco: escolhas[dataStr].almoco,
            jantar: escolhas[dataStr].jantar
        });
    });

    Promise.all(promises)
        .then(() => {
            alert("Arranchamento atualizado com sucesso!");
            // Recarrega as tabelas de relatórios instantaneamente após salvar
            atualizarVisualizacaoNominal();
            atualizarVisualizacaoFurriel();
        })
        .catch((error) => {
            console.error(error);
            alert("Erro ao salvar arranchamento na nuvem.");
        });
}
// ==========================================
// ABAS DE RELATÓRIO E VISUALIZAÇÃO
// ==========================================
function atualizarVisualizacaoNominal() {
    const container = document.getElementById('tabela-preview-nominal');
    const filtroSub = document.getElementById('relatorio-subdivisao')?.value;
    if (!container || !window.todosRegistros) return;

    // Filtra registros pela data global selecionada e esquadrão
    const filtrados = window.todosRegistros.filter(reg => {
        return reg.dataRegistro === dataSelecionadaGlobal && reg.reparticao === filtroSub;
    });

    let tabelaHTML = `
        <table class="tabela-sistema">
            <thead>
                <tr>
                    <th>Nome de Guerra</th>
                    <th>Café</th>
                    <th>Almoço</th>
                    <th>Jantar</th>
                </tr>
            </thead>
            <tbody>
    `;

    if (filtrados.length === 0) {
        tabelaHTML += `<tr><td colspan="4" style="text-align:center;">Nenhum arranchamento para esta data.</td></tr>`;
    } else {
        filtrados.forEach(reg => {
            tabelaHTML += `
                <tr>
                    <td>${reg.usuario}</td>
                    <td>${reg.cafe ? '✅' : '❌'}</td>
                    <td>${reg.almoco ? '✅' : '❌'}</td>
                    <td>${reg.jantar ? '✅' : '❌'}</td>
                </tr>
            `;
        });
    }

    tabelaHTML += `</tbody></table>`;
    container.innerHTML = tabelaHTML;
}

function atualizarVisualizacaoFurriel() {
    const container = document.getElementById('tabela-preview-furriel');
    const filtroSub = document.getElementById('furriel-subdivisao')?.value;
    const zonaImpressao = document.getElementById('zona-impressao-furriel');
    
    if (!container || !window.todosRegistros || !filtroSub) return;

    if (zonaImpressao) zonaImpressao.classList.remove('hidden');

    const filtrados = window.todosRegistros.filter(reg => {
        return reg.dataRegistro === dataSelecionadaGlobal && reg.reparticao === filtroSub;
    });

    let tabelaHTML = `
        <table class="tabela-sistema">
            <thead>
                <tr>
                    <th>Militar</th>
                    <th>Repartição</th>
                    <th>Café</th>
                    <th>Almoço</th>
                    <th>Jantar</th>
                </tr>
            </thead>
            <tbody>
    `;

    if (filtrados.length === 0) {
        tabelaHTML += `<tr><td colspan="5" style="text-align:center;">Sem registros.</td></tr>`;
    } else {
        filtrados.forEach(reg => {
            tabelaHTML += `
                <tr>
                    <td>${reg.usuario}</td>
                    <td>${reg.reparticao}</td>
                    <td>${reg.cafe ? 'Sim' : 'Não'}</td>
                    <td>${reg.almoco ? 'Sim' : 'Não'}</td>
                    <td>${reg.jantar ? 'Sim' : 'Não'}</td>
                </tr>
            `;
        });
    }

    tabelaHTML += `</tbody></table>`;
    container.innerHTML = tabelaHTML;
}

// ==========================================
// SEÇÃO ADMINISTRADOR (GERENCIAMENTO)
// ==========================================
function renderizarListaDeUsuariosParaAdmin() {
    const container = document.getElementById('lista-gerenciamento-usuarios');
    const filtroSub = document.getElementById('admin-filtro-esquadrao')?.value;
    if (!container) return;

    db.ref('usuarios').once('value', (snapshot) => {
        const usuarios = snapshot.val();
        container.innerHTML = "";

        for (let id in usuarios) {
            const user = usuarios[id];
            if (filtroSub !== "TODOS" && user.reparticao !== filtroSub) continue;

            const divUser = document.createElement('div');
            divUser.className = "user-admin-card";
            divUser.style = "display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; padding: 6px; background: #222; border-radius: 4px;";
            divUser.innerHTML = `
                <span><strong>${user.usuario}</strong> (${user.reparticao}) - ${user.nivelAcesso}</span>
                <div>
                    <button class="btn btn-primary" style="padding: 2px 6px; font-size: 8pt;" onclick="promoverUsuario('${id}', '${user.nivelAcesso}')">Nível</button>
                    <button class="btn btn-danger" style="padding: 2px 6px; font-size: 8pt; background: #c0392b;" onclick="deletarUsuario('${id}')">Deletar</button>
                </div>
            `;
            container.appendChild(divUser);
        }
    });
}

function incluirUsuarioViaAdmin() {
    const nome = document.getElementById('admin-novo-usuario').value;
    const esquadrao = document.getElementById('admin-novo-esquadrao').value;
    const nivel = document.getElementById('admin-novo-nivel').value;

    if (!nome) return alert("Digite o nome do militar!");

    const novoId = db.ref('usuarios').push().key;
    db.ref(`usuarios/${novoId}`).set({
        usuario: nome,
        senha: "123", // Senha inicial padrão
        reparticao: esquadrao,
        nivelAcesso: nivel
    }).then(() => {
        alert("Militar cadastrado com sucesso!");
        document.getElementById('admin-novo-usuario').value = "";
        renderizarListaDeUsuariosParaAdmin();
    });
}

function promoverUsuario(id, nivelAtual) {
    const niveis = ["Militar", "Furriel", "Administrador"];
    let proximoNivel = niveis[(niveis.indexOf(nivelAtual) + 1) % niveis.length];

    db.ref(`usuarios/${id}/nivelAcesso`).set(proximoNivel).then(() => {
        alert(`Nível de acesso alterado para: ${proximoNivel}`);
        renderizarListaDeUsuariosParaAdmin();
    });
}

function deletarUsuario(id) {
    if (confirm("Tem certeza que deseja deletar este usuário permanentemente?")) {
        db.ref(`usuarios/${id}`).remove().then(() => {
            alert("Usuário excluído.");
            renderizarListaDeUsuariosParaAdmin();
        });
    }
}

function alterarMinhaSenha() {
    const novaSenha = document.getElementById('senha-nova').value;
    if (!novaSenha) return alert("Digite a nova senha!");

    db.ref('usuarios').once('value', (snapshot) => {
        const usuarios = snapshot.val();
        for (let id in usuarios) {
            if (padronizarTexto(usuarios[id].usuario) === padronizarTexto(usuarioLogado.usuario)) {
                db.ref(`usuarios/${id}/senha`).set(novaSenha).then(() => {
                    alert("Senha alterada com sucesso!");
                    usuarioLogado.senha = novaSenha;
                    document.getElementById('senha-nova').value = "";
                });
                break;
            }
        }
    });
}

// ==========================================
// IMPRESSÃO EM PDF E QR CODE
// ==========================================
function gerarRelatorioSeparatedPDF(idSelectElement) {
    const filtroSub = document.getElementById(idSelectElement)?.value;
    if (!filtroSub) return alert("Selecione um Esquadrão para exportar!");

    alert(`Gerando relatório em PDF para o ${filtroSub} na data ${dataSelecionadaGlobal}... (Função de impressão pronta para integração com a biblioteca jsPDF)`);
    window.print();
}

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