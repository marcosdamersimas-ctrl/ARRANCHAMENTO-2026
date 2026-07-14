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
    if (!texto) return '';
    return texto
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove acentos
        .replace(/[^a-z0-9]/g, "")                      // Remove espaços, pontos, traços e o 'º'
        .trim();
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
    
    container.style.display = "flex";
    container.style.flexDirection = "row";
    container.style.overflowX = "hidden"; 
    container.style.scrollBehavior = "smooth"; 
    container.style.alignItems = "center";
    container.style.justifyContent = "flex-start";
    container.style.width = "100%";

    const diasSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    const usuarioId = usuarioLogado ? padronizarTexto(usuarioLogado.usuario) : '';

    db.ref('registrosArranchamento').once('value', (snapshot) => {
        const registros = snapshot.val() || {};
        const agora = new Date();

        for (let i = 0; i < 7; i++) {
            const dataFoco = new Date();
            dataFoco.setDate(dataFoco.getDate() + i);
            
            const ano = dataFoco.getFullYear();
            const mes = String(dataFoco.getMonth() + 1).padStart(2, '0');
            const dia = String(dataFoco.getDate()).padStart(2, '0');
            const dataStr = `${ano}-${mes}-${dia}`;
            
            const diaS = diasSemana[dataFoco.getDay()];
            const diaM = dia;

            const chaveRegistro = `${usuarioId}_${dataStr}`;
            const dadosSalvos = registros[chaveRegistro] || { cafe: false, almoco: false, jantar: false };

            // ==========================================
            // CÁLCULO DA DATA/HORA LIMITE DE BLOQUEIO
            // ==========================================
            const limiteMudar = new Date(dataFoco);
            limiteMudar.setDate(limiteMudar.getDate() - 1); // Um dia antes
            limiteMudar.setHours(15, 30, 0, 0);            // 15:30

            // Formata a data do bloqueio para exibição (DD/MM/AAAA)
            const diaLim = String(limiteMudar.getDate()).padStart(2, '0');
            const mesLim = String(limiteMudar.getMonth() + 1).padStart(2, '0');
            const anoLim = limiteMudar.getFullYear();
            const dataBloqueioFormatada = `${diaLim}/${mesLim}/${anoLim}`;

            // O bloqueio acontece se o momento atual passou das 15:30 do dia anterior
            const diaBloqueado = agora > limiteMudar;

            const stringDisabled = diaBloqueado ? "disabled" : "";
            const estiloLabel = diaBloqueado ? "opacity: 0.5; cursor: not-allowed;" : "cursor: pointer;";

            const cardDia = document.createElement('div');
            cardDia.className = "dia-card";
            
            cardDia.style.flex = "0 0 100%"; 
            cardDia.style.width = "100%";
            cardDia.style.boxSizing = "border-box";
            cardDia.style.display = "flex";
            cardDia.style.flexDirection = "column";
            cardDia.style.alignItems = "center";
            cardDia.style.justifyContent = "center";
            cardDia.style.padding = "10px";

            cardDia.innerHTML = `
                <div class="dia-titulo" style="font-weight: bold; margin-bottom: 5px; font-size: 1.1rem; color: #f1c40f;">
                    ${diaS} (${diaM})
                </div>
                <div class="opcoes-refeicao" style="display: flex; gap: 15px; justify-content: center; align-items: center; width: 100%;">
                    <label style="display: inline-flex; align-items: center; gap: 5px; ${estiloLabel}">
                        <input type="checkbox" name="c-${dataStr}" value="Cafe" ${dadosSalvos.cafe ? 'checked' : ''} ${stringDisabled}> ☕ Café
                    </label>
                    <label style="display: inline-flex; align-items: center; gap: 5px; ${estiloLabel}">
                        <input type="checkbox" name="a-${dataStr}" value="Almoco" ${dadosSalvos.almoco ? 'checked' : ''} ${stringDisabled}> 🍽️ Almoço
                    </label>
                    <label style="display: inline-flex; align-items: center; gap: 5px; ${estiloLabel}">
                        <input type="checkbox" name="j-${dataStr}" value="Jantar" ${dadosSalvos.jantar ? 'checked' : ''} ${stringDisabled}> 🍕 Jantar
                    </label>
                </div>
                <!-- MENSAGEM DE BLOQUEIO ABAIXO DOS ÍCONES -->
                ${diaBloqueado ? `
                    <div style="font-size: 0.75rem; color: #e74c3c; margin-top: 8px; font-weight: bold; text-align: center;">
                        ⚠️ Sistema bloqueado às 15:30 do dia ${dataBloqueioFormatada}
                    </div>
                ` : ''}
            `;
            container.appendChild(cardDia);
        }
    });
}
function mudarDiaCarrossel(direcao) {
    const container = document.getElementById('container-dias-dinamicos');
    if (container) {
        // Rola exatamente a largura de um card (100% da largura visível do contêiner)
        const larguraCard = container.clientWidth;
        container.scrollBy({
            left: direcao * larguraCard,
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
    
    inputs.forEach(input => {
        const dataKey = input.name.substring(2); 
        const refeicao = input.value.toLowerCase(); 

        if (!escolhas[dataKey]) {
            escolhas[dataKey] = { cafe: false, almoco: false, jantar: false };
        }
        if (input.checked) {
            escolhas[dataKey][refeicao] = true;
        }
    });

    const promises = Object.keys(escolhas).map(dataStr => {
        // A chave do Firebase continua única por data/militar padronizado
        const idRegistro = `${padronizarTexto(usuarioLogado.usuario)}_${dataStr}`;
        return db.ref(`registrosArranchamento/${idRegistro}`).set({
            usuario: usuarioLogado.usuario, // Grava o nome de exibição original (ex: "1º Sgt Simas")
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

    // Filtra pela data e repartição
    const filtrados = window.todosRegistros.filter(reg => {
        return reg.dataRegistro === dataSelecionadaGlobal && 
               padronizarTexto(reg.reparticao) === padronizarTexto(filtroSub);
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
            // Garante leitura robusta de qualquer tipo de dado (booleano ou string)
            const cafeOk = reg.cafe === true || reg.cafe === "true";
            const almocoOk = reg.almoco === true || reg.almoco === "true";
            const jantarOk = reg.jantar === true || reg.jantar === "true";

            tabelaHTML += `
                <tr>
                    <td>${reg.usuario}</td>
                    <td>${cafeOk ? '✅' : '❌'}</td>
                    <td>${almocoOk ? '✅' : '❌'}</td>
                    <td>${jantarOk ? '✅' : '❌'}</td>
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

    // Filtra aplicando padronização de texto na repartição para evitar erros de digitação (ex: "st/sgt" vs "ST / SGT")
    const filtrados = window.todosRegistros.filter(reg => {
        return reg.dataRegistro === dataSelecionadaGlobal && 
               padronizarTexto(reg.reparticao) === padronizarTexto(filtroSub);
    });

    let tabelaHTML = `
        <table class="tabela-sistema" id="tabela-furriel-oficial">
            <thead>
                <tr>
                    <th style="border: 1px solid #ccc; padding: 8px;">Militar</th>
                    <th style="border: 1px solid #ccc; padding: 8px;">Repartição</th>
                    <th style="border: 1px solid #ccc; padding: 8px;">Café</th>
                    <th style="border: 1px solid #ccc; padding: 8px;">Almoço</th>
                    <th style="border: 1px solid #ccc; padding: 8px;">Jantar</th>
                </tr>
            </thead>
            <tbody>
    `;

    if (filtrados.length === 0) {
        tabelaHTML += `<tr><td colspan="5" style="text-align:center; padding: 12px;">Sem registros para esta data.</td></tr>`;
    } else {
        filtrados.forEach(reg => {
            // Garante consistência absoluta se gravou true/false ou "true"/"false"
            const cafeOk = reg.cafe === true || reg.cafe === "true";
            const almocoOk = reg.almoco === true || reg.almoco === "true";
            const jantarOk = reg.jantar === true || reg.jantar === "true";

            tabelaHTML += `
                <tr>
                    <td style="border: 1px solid #ccc; padding: 8px; font-weight: bold;">${reg.usuario}</td>
                    <td style="border: 1px solid #ccc; padding: 8px;">${reg.reparticao}</td>
                    <td style="border: 1px solid #ccc; padding: 8px; text-align: center;">${cafeOk ? 'Sim' : 'Não'}</td>
                    <td style="border: 1px solid #ccc; padding: 8px; text-align: center;">${almocoOk ? 'Sim' : 'Não'}</td>
                    <td style="border: 1px solid #ccc; padding: 8px; text-align: center;">${jantarOk ? 'Sim' : 'Não'}</td>
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
                    alert("Senha altered com sucesso!");
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

    const tabelaOriginal = document.getElementById('tabela-furriel-oficial');
    if (!tabelaOriginal) return alert("Nenhum dado disponível na tabela para imprimir!");

    // Formata a data para o cabeçalho oficial
    const partesData = dataSelecionadaGlobal.split('-');
    const dataFormatada = `${partesData[2]}/${partesData[1]}/${partesData[0]}`;

    // Cria uma nova janela temporária no Firefox focando apenas no documento de impressão
    const janelaImpressao = window.open('', '_blank');
    
    // Injeta um HTML limpo, estilo Exército, com fundo branco e linhas pretas para assinatura
    janelaImpressao.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Relatório de Arranchamento - ${filtroSub}</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    background-color: #ffffff;
                    color: #000000;
                    padding: 20px;
                    margin: 0;
                }
                .cabecalho {
                    text-align: center;
                    margin-bottom: 30px;
                    border-bottom: 2px solid #000;
                    padding-bottom: 10px;
                }
                .cabecalho h2 {
                    margin: 0;
                    font-size: 16pt;
                    text-transform: uppercase;
                }
                .cabecalho h3 {
                    margin: 5px 0 0 0;
                    font-size: 12pt;
                    font-weight: normal;
                }
                .tabela-sistema {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 20px;
                }
                .tabela-sistema th, .tabela-sistema td {
                    border: 1px solid #000000 !important;
                    padding: 10px;
                    text-align: center;
                    font-size: 11pt;
                }
                .tabela-sistema th {
                    background-color: #f2f2f2 !important;
                    font-weight: bold;
                }
                .assinaturas {
                    margin-top: 60px;
                    display: flex;
                    justify-content: space-around;
                }
                .campo-assinatura {
                    text-align: center;
                    width: 250px;
                    border-top: 1px solid #000;
                    padding-top: 5px;
                    font-size: 10pt;
                }
                @media print {
                    body { padding: 0; }
                }
            </style>
        </head>
        <body>
            <div class="cabecalho">
                <h2>7º Regimento de Cavalaria Mecanizado</h2>
                <h3>Relatório Oficial de Arranchamento - Subdivisão: ${filtroSub}</h3>
                <p><strong>Data de Referência:</strong> ${dataFormatada}</p>
            </div>
            
            ${tabelaOriginal.outerHTML}

            <div class="assinaturas">
                <div class="campo-assinatura">
                    Sargento Furriel / Responsável
                </div>
                <div class="campo-assinatura">
                    Fiscal de Dia / Oficial de Dia
                </div>
            </div>

            <script>
                // Executa a caixa de diálogo de impressão e fecha a janela extra ao terminar
                window.onload = function() {
                    window.print();
                    setTimeout(function() { window.close(); }, 500);
                };
            <\/script>
        </body>
        </html>
    `);

    janelaImpressao.document.close();
}