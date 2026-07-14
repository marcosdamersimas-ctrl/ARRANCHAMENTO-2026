// =========================================================================
// CONFIGURAÇÃO DO FIREBASE (BANCO DE DADOS)
// =========================================================================
const firebaseConfig = {
    apiKey: "AIzaSyCJ9wwSIMg_t9pYKrX99Tc3y58_Yjk_Bo",
    authDomain: "arranchamento-7rcmec.firebaseapp.com",
    databaseURL: "https://arranchamento-7rcmec-default-rtdb.firebaseio.com",
    projectId: "arranchamento-7rcmec",
    storageBucket: "arranchamento-7rcmec.appspot.com",
    messagingSenderId: "284122873915",
    appId: "1:284122873915:web:175f3f8b1d9f7f362dc1e",
    measurementId: "G-STZQVFCJ2K"
};

// Inicializa o Firebase v10 Compat
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// Variáveis Globais de Controle
let usuarioLogado = null;
let dataSelecionadaGlobal = new Date().toISOString().slice(0, 10);
let indiceCarrosselInicio = 0; // Controla o deslocamento de dias no carrossel (de 1 em 1)
window.todosRegistros = []; 

// =========================================================================
// INICIALIZAÇÃO DO SISTEMA
// =========================================================================
document.addEventListener('DOMContentLoaded', () => {
    const inputDataGlobal = document.getElementById('data-sistema-global');
    if (inputDataGlobal) {
        inputDataGlobal.value = dataSelecionadaGlobal;
    }
    
    // Sincroniza dados em tempo real
    db.ref('arranchamento').on('value', (snapshot) => {
        window.todosRegistros = [];
        snapshot.forEach((filho) => {
            const dados = filho.val();
            dados.idRegistro = filho.key;
            window.todosRegistros.push(dados);
        });
        
        atualizarVisualizacaoNominal();
        atualizarVisualizacaoFurriel();
    }, (error) => {
        console.error("Erro ao sincronizar banco:", error);
    });
});

// Padronização robusta de strings para ID no Banco
function padronizarTexto(texto) {
    if (!texto) return '';
    return texto.toString().toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove acentos
        .replace(/[.\-_\/\sº°]/g, "") // remove pontos, traços, barras, espaços e símbolos de grau/ordinal
        .trim();
}

function sincronizarDataGlobal() {
    const inputDataGlobal = document.getElementById('data-sistema-global');
    if (inputDataGlobal && inputDataGlobal.value) {
        dataSelecionadaGlobal = inputDataGlobal.value;
        indiceCarrosselInicio = 0; // reseta o desvio ao mudar a data do calendário
        renderizarDiasCarrossel();
        atualizarVisualizacaoNominal();
        atualizarVisualizacaoFurriel();
    }
}

// =========================================================================
// SISTEMA DE ACESSO (LOGIN / AUTO-CADASTRO)
// =========================================================================
function efetuarAcesso() {
    const subdivisao = document.getElementById('login-reparticao').value;
    const nomeGuerra = document.getElementById('login-usuario').value.trim();
    const senhaDigitada = document.getElementById('login-senha').value;

    if (!nomeGuerra || !senhaDigitada) {
        return alert("Preencha todos os campos para prosseguir.");
    }

    const usuarioID = padronizarTexto(nomeGuerra);
    const refUsuario = db.ref('usuarios/' + usuarioID);

    refUsuario.once('value').then((snapshot) => {
        let dadosUser;
        if (snapshot.exists()) {
            dadosUser = snapshot.val();
            if (dadosUser.senha !== senhaDigitada) {
                return alert("Senha incorreta!");
            }
        } else {
            // Conta nova automática
            dadosUser = {
                usuario: nomeGuerra,
                reparticao: subdivisao,
                senha: senhaDigitada,
                nivel: "Militar"
            };
            refUsuario.set(dadosUser);
        }

        // REGRA MASTER: Se for o Sgt Simas de qualquer jeito escrito, força o nível Admin!
        if (usuarioID === '1sgtsimas' || usuarioID === '1ºsgtsimas' || usuarioID === 'sgtsimas') {
            dadosUser.nivel = "Administrador";
            refUsuario.child('nivel').set("Administrador");
        }

        conectarUsuario(dadosUser);
    }).catch(err => {
        alert("Erro na comunicação com o servidor: " + err.message);
    });
}

function conectarUsuario(usuario) {
    usuarioLogado = usuario;
    document.getElementById('militar-logado').innerText = usuario.usuario;
    
    const containerBadge = document.getElementById('nivel-badge-container');
    if (containerBadge) {
        containerBadge.innerHTML = '';
        if (usuario.nivel === 'Administrador') {
            containerBadge.innerHTML = '<span class="user-badge" style="color: #d4af37;">Master Admin</span>';
        } else if (usuario.nivel === 'Furriel') {
            containerBadge.innerHTML = '<span class="user-badge" style="color: #3498db;">Furriel</span>';
        } else {
            containerBadge.innerHTML = '<span class="user-badge" style="color: #2ecc71;">Militar</span>';
        }
    }

    // Controle dinâmico das abas e botões autorizados
    const botoesFurriel = document.querySelectorAll('.furriel-only');
    const botoesAdmin = document.querySelectorAll('.adm-only');

    botoesFurriel.forEach(el => {
        if (usuario.nivel === 'Furriel' || usuario.nivel === 'Administrador') {
            el.classList.remove('hidden');
        } else {
            el.classList.add('hidden');
        }
    });

    botoesAdmin.forEach(el => {
        if (usuario.nivel === 'Administrador') {
            el.classList.remove('hidden');
        } else {
            el.classList.add('hidden');
        }
    });

    document.getElementById('tela-login').classList.add('hidden');
    document.getElementById('painel-sistema').classList.remove('hidden');

    renderizarDiasCarrossel();
    alternarAba('arranchamento');
    
    if (usuario.nivel === 'Administrador') {
        renderizarListaDeUsuariosParaAdmin();
    }
}

function fazerLogout() {
    usuarioLogado = null;
    document.getElementById('login-usuario').value = '';
    document.getElementById('login-senha').value = '';
    document.getElementById('painel-sistema').classList.add('hidden');
    document.getElementById('tela-login').classList.remove('hidden');
}

// =========================================================================
// CONTROLE DE ABAS
// =========================================================================
function alternarAba(abaDestino) {
    document.querySelectorAll('.aba-conteudo').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.btn-aba').forEach(el => el.classList.remove('ativo'));

    if (abaDestino === 'arranchamento') {
        document.getElementById('conteudo-arranchamento').classList.remove('hidden');
        document.getElementById('btn-aba-arranchamento').classList.add('ativo');
    } else if (abaDestino === 'relatorio') {
        document.getElementById('conteudo-relatorio').classList.remove('hidden');
        document.getElementById('btn-aba-relatorio').classList.add('ativo');
        const selectNominal = document.getElementById('relatorio-subdivisao');
        if (selectNominal && usuarioLogado) {
            selectNominal.value = usuarioLogado.reparticao;
        }
        atualizarVisualizacaoNominal();
    } else if (abaDestino === 'senha') {
        document.getElementById('conteudo-senha').classList.remove('hidden');
        document.getElementById('btn-aba-senha').classList.add('ativo');
    } else if (abaDestino === 'furriel') {
        document.getElementById('conteudo-furriel').classList.remove('hidden');
        document.getElementById('btn-aba-furriel').classList.add('ativo');
        atualizarVisualizacaoFurriel();
    } else if (abaDestino === 'admin') {
        document.getElementById('conteudo-admin').classList.remove('hidden');
        document.getElementById('btn-aba-admin').classList.add('ativo');
        renderizarListaDeUsuariosParaAdmin();
    }
}

function alterarMinhaSenha() {
    const novaSenha = document.getElementById('senha-nova').value;
    if (!novaSenha || novaSenha.trim() === '') {
        return alert("Digite uma senha válida!");
    }

    const usuarioID = padronizarTexto(usuarioLogado.usuario);
    db.ref('usuarios/' + usuarioID + '/senha').set(novaSenha).then(() => {
        alert("Senha atualizada com sucesso!");
        usuarioLogado.senha = novaSenha;
        document.getElementById('senha-nova').value = '';
    }).catch(err => {
        alert("Erro ao salvar: " + err.message);
    });
}

// =========================================================================
// CARROSSEL DE DIA ÚNICO E REGRAS DE TRAVA (15:30h DO DIA ANTERIOR)
// =========================================================================
function renderizarDiasCarrossel() {
    const container = document.getElementById('container-dias-dinamicos');
    if (!container) return;
    container.innerHTML = '';

    const diasSemana = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
    
    // Define a data que será exibida com base no controle de desvio do carrossel
    const baseDate = new Date(dataSelecionadaGlobal + 'T00:00:00');
    let dataLoop = new Date(baseDate);
    dataLoop.setDate(baseDate.getDate() + indiceCarrosselInicio);

    const dataISO = dataLoop.toISOString().slice(0, 10);
    const diaSemanaNome = diasSemana[dataLoop.getDay()];
    const diaMes = dataLoop.getDate().toString().padStart(2, '0') + '/' + (dataLoop.getMonth() + 1).toString().padStart(2, '0');

    // Valida o bloqueio: 15:30 do dia anterior
    const agora = new Date();
    
    // Cria data limite (dia anterior do dia alvo às 15:30:00)
    const limitePrazo = new Date(dataLoop);
    limitePrazo.setDate(limitePrazo.getDate() - 1);
    limitePrazo.setHours(15, 30, 0, 0);

    const isBloqueado = agora > limitePrazo;

    const carrosselDias = document.createElement('div');
    carrosselDias.className = 'carrossel-dias';

    carrosselDias.innerHTML = `
        <button type="button" class="btn-seta" onclick="mudarDiaCarrossel(-1)">◀</button>
        <div class="dia-box">
            <h3>${diaSemanaNome} - ${diaMes}</h3>
            <div class="checkbox-group">
                <label>
                    <input type="checkbox" id="cafe-${dataISO}" data-refeicao="cafe" data-data="${dataISO}" ${isBloqueado ? 'disabled' : ''}>
                    ☕ Café da Manhã
                </label>
                <label>
                    <input type="checkbox" id="almoco-${dataISO}" data-refeicao="almoco" data-data="${dataISO}" ${isBloqueado ? 'disabled' : ''}>
                    🍽️ Almoço
                </label>
                <label>
                    <input type="checkbox" id="jantar-${dataISO}" data-refeicao="jantar" data-data="${dataISO}" ${isBloqueado ? 'disabled' : ''}>
                    🍲 Jantar
                </label>
            </div>
            ${isBloqueado ? `<span class="prazo-encerrado">❌ Prazo encerrado (Limite: 15:30h do dia anterior)</span>` : ''}
        </div>
        <button type="button" class="btn-seta" onclick="mudarDiaCarrossel(1)">▶</button>
    `;
    container.appendChild(carrosselDias);

    // Carrega estados do banco de dados
    const refId = `${usuarioLogado.usuario}_${dataISO}`.replace(/[.#$\[\]]/g, "_");
    db.ref('arranchamento/' + refId).once('value').then((snap) => {
        if (snap.exists()) {
            const dadosRef = snap.val();
            const chkCafe = document.getElementById(`cafe-${dataISO}`);
            const chkAlmoco = document.getElementById(`almoco-${dataISO}`);
            const chkJantar = document.getElementById(`jantar-${dataISO}`);

            if (chkCafe) chkCafe.checked = (dadosRef.cafe === true || dadosRef.cafe === "true");
            if (chkAlmoco) chkAlmoco.checked = (dadosRef.almoco === true || dadosRef.almoco === "true");
            if (chkJantar) chkJantar.checked = (dadosRef.jantar === true || dadosRef.jantar === "true");
        }
    });
}

function mudarDiaCarrossel(passo) {
    indiceCarrosselInicio += passo;
    renderizarDiasCarrossel();
}

function salvarArranchamento(e) {
    e.preventDefault();
    if (!usuarioLogado) return;

    const checkboxes = document.querySelectorAll('#container-dias-dinamicos input[type="checkbox"]');
    if (checkboxes.length === 0) return;

    const dataServico = checkboxes[0].getAttribute('data-data');
    const agora = new Date();
    
    // Valida trava das 15:30h do dia anterior
    const dataAlvo = new Date(dataServico + 'T00:00:00');
    const limitePrazo = new Date(dataAlvo);
    limitePrazo.setDate(limitePrazo.getDate() - 1);
    limitePrazo.setHours(15, 30, 0, 0);

    if (agora > limitePrazo) {
        alert("Erro: O prazo para alterar esta data encerrou às 15:30h de ontem!");
        renderizarDiasCarrossel();
        return;
    }

    const chkCafe = document.getElementById(`cafe-${dataServico}`);
    const chkAlmoco = document.getElementById(`almoco-${dataServico}`);
    const chkJantar = document.getElementById(`jantar-${dataServico}`);

    const refId = `${usuarioLogado.usuario}_${dataServico}`.replace(/[.#$\[\]]/g, "_");
    
    db.ref('arranchamento/' + refId).set({
        usuario: usuarioLogado.usuario,
        reparticao: usuarioLogado.reparticao,
        dataRegistro: dataServico,
        cafe: chkCafe ? chkCafe.checked : false,
        almoco: chkAlmoco ? chkAlmoco.checked : false,
        jantar: chkJantar ? chkJantar.checked : false
    }).then(() => {
        alert("Arranchamento salvo com sucesso!");
        renderizarDiasCarrossel();
    }).catch(err => {
        alert("Erro ao salvar: " + err.message);
    });
}

// =========================================================================
// ABA NOMINAL (RESUMO DAS SOMAS)
// =========================================================================
function atualizarVisualizacaoNominal() {
    const container = document.getElementById('tabela-preview-nominal');
    const seletorFiltro = document.getElementById('relatorio-subdivisao');
    if (!container || !seletorFiltro) return;

    const filtroSub = seletorFiltro.value;

    const filtrados = window.todosRegistros.filter(reg => {
        return reg.dataRegistro === dataSelecionadaGlobal && 
               padronizarTexto(reg.reparticao) === padronizarTexto(filtroSub);
    });

    let totalCafe = 0;
    let totalAlmoco = 0;
    let totalJantar = 0;

    filtrados.forEach(reg => {
        if (reg.cafe === true || reg.cafe === "true") totalCafe++;
        if (reg.almoco === true || reg.almoco === "true") totalAlmoco++;
        if (reg.jantar === true || reg.jantar === "true") totalJantar++;
    });

    let tabelaHTML = `
        <div style="margin-bottom: 15px; padding: 10px; background: #222; border-left: 4px solid #d4af37; border-radius: 4px;">
            <strong style="color: #d4af37;">Resumo Quantitativo (${filtroSub}):</strong> <br>
            ☕ Café: <span style="font-weight: bold; color: #fff;">${totalCafe}</span> | 
            🍽️ Almoço: <span style="font-weight: bold; color: #fff;">${totalAlmoco}</span> | 
            🍲 Jantar: <span style="font-weight: bold; color: #fff;">${totalJantar}</span>
        </div>

        <table class="tabela-preview">
            <thead>
                <tr>
                    <th>Militar</th>
                    <th>Subdivisão</th>
                    <th>Café</th>
                    <th>Almoço</th>
                    <th>Jantar</th>
                </tr>
            </thead>
            <tbody>
    `;

    if (filtrados.length === 0) {
        tabelaHTML += `<tr><td colspan="5" style="text-align:center;">Nenhum militar arranchado nesta data.</td></tr>`;
    } else {
        filtrados.forEach(reg => {
            const cafeOk = reg.cafe === true || reg.cafe === "true";
            const almocoOk = reg.almoco === true || reg.almoco === "true";
            const jantarOk = reg.jantar === true || reg.jantar === "true";

            tabelaHTML += `
                <tr>
                    <td style="font-weight: bold; color: #d4af37; text-align: left;">${reg.usuario}</td>
                    <td>${reg.reparticao}</td>
                    <td style="text-align: center;">${cafeOk ? '✅' : '❌'}</td>
                    <td style="text-align: center;">${almocoOk ? '✅' : '❌'}</td>
                    <td style="text-align: center;">${jantarOk ? '✅' : '❌'}</td>
                </tr>
            `;
        });
    }

    tabelaHTML += `</tbody></table>`;
    container.innerHTML = tabelaHTML;
}

// =========================================================================
// ABA FURRIEL (ATUALIZAÇÃO DE TABELA COM CONSOLIDADOS)
// =========================================================================
function atualizarVisualizacaoFurriel() {
    const container = document.getElementById('tabela-preview-furriel');
    const seletorFiltro = document.getElementById('furriel-subdivisao');
    const zonaImpressao = document.getElementById('zona-impressao-furriel');
    
    if (!container || !seletorFiltro) return;

    const filtroSub = seletorFiltro.value;
    if (!filtroSub) {
        if (zonaImpressao) zonaImpressao.classList.add('hidden');
        return;
    }

    if (zonaImpressao) zonaImpressao.classList.remove('hidden');

    const filtrados = window.todosRegistros.filter(reg => {
        return reg.dataRegistro === dataSelecionadaGlobal && 
               padronizarTexto(reg.reparticao) === padronizarTexto(filtroSub);
    });

    let totalCafe = 0;
    let totalAlmoco = 0;
    let totalJantar = 0;

    filtrados.forEach(reg => {
        if (reg.cafe === true || reg.cafe === "true") totalCafe++;
        if (reg.almoco === true || reg.almoco === "true") totalAlmoco++;
        if (reg.jantar === true || reg.jantar === "true") totalJantar++;
    });

    let tabelaHTML = `
        <div style="margin-bottom: 15px; padding: 10px; background: #222; border-left: 4px solid #d4af37; border-radius: 4px; text-align: left;">
            <strong style="color: #d4af37;">Valores Consolidados para Rancho (${filtroSub}):</strong> <br>
            ☕ Café: <span style="font-weight: bold; color: #fff;">${totalCafe} arranchados</span> <br>
            🍽️ Almoço: <span style="font-weight: bold; color: #fff;">${totalAlmoco} arranchados</span> <br>
            🍲 Jantar: <span style="font-weight: bold; color: #fff;">${totalJantar} arranchados</span>
        </div>

        <table class="tabela-preview" id="tabela-furriel-oficial" style="width: 100%;">
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
        tabelaHTML += `<tr><td colspan="5" style="text-align:center; padding: 12px;">Nenhum militar arranchado nesta data.</td></tr>`;
    } else {
        filtrados.forEach(reg => {
            const cafeOk = reg.cafe === true || reg.cafe === "true";
            const almocoOk = reg.almoco === true || reg.almoco === "true";
            const jantarOk = reg.jantar === true || reg.jantar === "true";

            tabelaHTML += `
                <tr>
                    <td style="font-weight: bold; text-align: left; color: #d4af37;">${reg.usuario}</td>
                    <td>${reg.reparticao}</td>
                    <td style="text-align: center;">${cafeOk ? 'Sim' : 'Não'}</td>
                    <td style="text-align: center;">${almocoOk ? 'Sim' : 'Não'}</td>
                    <td style="text-align: center;">${jantarOk ? 'Sim' : 'Não'}</td>
                </tr>
            `;
        });
    }

    tabelaHTML += `</tbody></table>`;
    container.innerHTML = tabelaHTML;
}

// =========================================================================
// GERAÇÃO DE RELATÓRIO DE ARRANCHAMENTO (PDF NOMINAL DA SUBDIVISÃO)
// =========================================================================
function gerarRelatorioSeparatedPDF(idSelectElement) {
    const seletor = document.getElementById(idSelectElement);
    if (!seletor) return alert("Erro de interface: seletor não encontrado.");
    
    const filtroSub = seletor.value;
    if (!filtroSub) return alert("Selecione um Esquadrão para exportar!");

    const filtrados = window.todosRegistros.filter(reg => {
        return reg.dataRegistro === dataSelecionadaGlobal && 
               padronizarTexto(reg.reparticao) === padronizarTexto(filtroSub);
    });

    let totalCafe = 0;
    let totalAlmoco = 0;
    let totalJantar = 0;

    filtrados.forEach(reg => {
        if (reg.cafe === true || reg.cafe === "true") totalCafe++;
        if (reg.almoco === true || reg.almoco === "true") totalAlmoco++;
        if (reg.jantar === true || reg.jantar === "true") totalJantar++;
    });

    let tabelaRows = '';
    if (filtrados.length === 0) {
        tabelaRows = `<tr><td colspan="5" style="text-align:center; padding: 12px; border: 1px solid #000;">Nenhum militar arranchado nesta data.</td></tr>`;
    } else {
        filtrados.forEach(reg => {
            const cafeOk = reg.cafe === true || reg.cafe === "true";
            const almocoOk = reg.almoco === true || reg.almoco === "true";
            const jantarOk = reg.jantar === true || reg.jantar === "true";

            tabelaRows += `
                <tr>
                    <td style="border: 1px solid #000; padding: 8px; font-weight: bold; text-align: left;">${reg.usuario}</td>
                    <td style="border: 1px solid #000; padding: 8px; text-align: center;">${reg.reparticao}</td>
                    <td style="border: 1px solid #000; padding: 8px; text-align: center;">${cafeOk ? 'Sim' : 'Não'}</td>
                    <td style="border: 1px solid #000; padding: 8px; text-align: center;">${almocoOk ? 'Sim' : 'Não'}</td>
                    <td style="border: 1px solid #000; padding: 8px; text-align: center;">${jantarOk ? 'Sim' : 'Não'}</td>
                </tr>
            `;
        });
    }

    const partesData = dataSelecionadaGlobal.split('-');
    const dataFormatada = `${partesData[2]}/${partesData[1]}/${partesData[0]}`;

    const janelaImpressao = window.open('', '_blank');
    if (!janelaImpressao) {
        return alert("Libere a exibição de pop-ups no seu navegador!");
    }

    janelaImpressao.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Arranchamento - ${filtroSub}</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 30px; background-color: #fff; color: #000; }
                .cabecalho { text-align: center; margin-bottom: 25px; border-bottom: 2px solid #000; padding-bottom: 12px; }
                .cabecalho h2 { margin: 0; font-size: 15pt; text-transform: uppercase; }
                .cabecalho h3 { margin: 5px 0 0 0; font-size: 12pt; font-weight: normal; }
                .consolidado-box { border: 1px solid #000; padding: 10px; margin-bottom: 20px; background-color: #f9f9f9; font-size: 11pt; }
                .tabela-sistema { width: 100%; border-collapse: collapse; margin-top: 15px; }
                .tabela-sistema th, .tabela-sistema td { border: 1px solid #000000; padding: 8px; }
                .tabela-sistema th { background-color: #e6e6e6; font-weight: bold; }
                .assinaturas { margin-top: 60px; display: flex; justify-content: space-between; }
                .campo-assinatura { text-align: center; width: 45%; border-top: 1px solid #000; padding-top: 5px; font-size: 10pt; }
            </style>
        </head>
        <body>
            <div class="cabecalho">
                <h2>7º Regimento de Cavalaria Mecanizado</h2>
                <h3>Relatório de Arranchamento - Subdivisão: ${filtroSub}</h3>
                <p><strong>Data de Referência:</strong> ${dataFormatada}</p>
            </div>

            <div class="consolidado-box">
                <strong>Resumo Consolidado para Controle do Rancho:</strong><br>
                ☕ Café da Manhã: <strong>${totalCafe} arranchados</strong> | 
                🍽️ Almoço: <strong>${totalAlmoco} arranchados</strong> | 
                🍲 Jantar: <strong>${totalJantar} arranchados</strong>
            </div>
            
            <table class="tabela-sistema">
                <thead>
                    <tr>
                        <th style="text-align: left;">Militar</th>
                        <th>Repartição</th>
                        <th>Café</th>
                        <th>Almoço</th>
                        <th>Jantar</th>
                    </tr>
                </thead>
                <tbody>
                    ${tabelaRows}
                </tbody>
            </table>

            <div class="assinaturas">
                <div class="campo-assinatura">Sargento Furriel / Responsável</div>
                <div class="campo-assinatura">Fiscal de Dia / Oficial de Dia</div>
            </div>

            <script>
                window.onload = function() { window.print(); setTimeout(function() { window.close(); }, 800); };
            <\/script>
        </body>
        </html>
    `);
    janelaImpressao.document.close();
}

// =========================================================================
// GERAÇÃO DE VALE DIÁRIO CONSOLIDADO (TODOS OS ESQUADRÕES REUNIDOS)
// =========================================================================
function gerarValeDiarioPDF() {
    const subdivisoes = ["1º Esq", "2º Esq", "3º Esq", "Esq C Ap", "Banda de Música", "Sec Cmd Reg", "NPOR"];
    const partesData = dataSelecionadaGlobal.split('-');
    const dataFormatada = `${partesData[2]}/${partesData[1]}/${partesData[0]}`;

    let totalGeralCafe = 0;
    let totalGeralAlmoco = 0;
    let totalGeralJantar = 0;
    let linhasTabela = '';

    subdivisoes.forEach(sub => {
        const filtrados = window.todosRegistros.filter(reg => {
            return reg.dataRegistro === dataSelecionadaGlobal && 
                   padronizarTexto(reg.reparticao) === padronizarTexto(sub);
        });

        let cafe = 0;
        let almoco = 0;
        let jantar = 0;

        filtrados.forEach(reg => {
            if (reg.cafe === true || reg.cafe === "true") cafe++;
            if (reg.almoco === true || reg.almoco === "true") almoco++;
            if (reg.jantar === true || reg.jantar === "true") jantar++;
        });

        totalGeralCafe += cafe;
        totalGeralAlmoco += almoco;
        totalGeralJantar += jantar;

        linhasTabela += `
            <tr>
                <td style="border: 1px solid #000; padding: 10px; font-weight: bold;">${sub}</td>
                <td style="border: 1px solid #000; padding: 10px; text-align: center;">${cafe}</td>
                <td style="border: 1px solid #000; padding: 10px; text-align: center;">${almoco}</td>
                <td style="border: 1px solid #000; padding: 10px; text-align: center;">${jantar}</td>
            </tr>
        `;
    });

    const janelaImpressao = window.open('', '_blank');
    if (!janelaImpressao) return alert("Habilite pop-ups para abrir o Vale Diário!");

    janelaImpressao.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Vale Diário de Arranchamento - 7º RC Mec</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 40px; background-color: #fff; color: #000; }
                .cabecalho { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 12px; }
                .cabecalho h2 { margin: 0; font-size: 16pt; text-transform: uppercase; }
                .cabecalho h3 { margin: 5px 0 0 0; font-size: 13pt; }
                .tabela-vale { width: 100%; border-collapse: collapse; margin-top: 20px; }
                .tabela-vale th, .tabela-vale td { border: 1px solid #000; padding: 10px; }
                .tabela-vale th { background-color: #f2f2f2; font-weight: bold; }
                .total-row { background-color: #e6e6e6; font-weight: bold; }
                .assinaturas { margin-top: 80px; display: flex; justify-content: space-between; }
                .campo-assinatura { text-align: center; width: 45%; border-top: 1px solid #000; padding-top: 5px; font-size: 11pt; }
            </style>
        </head>
        <body>
            <div class="cabecalho">
                <h2>Ministério da Defesa</h2>
                <h3>Exército Brasileiro - 7º Regimento de Cavalaria Mecanizado</h3>
                <p style="font-size: 12pt; margin: 10px 0 0 0;"><strong>VALE DIÁRIO DE ARRANCHAMENTO</strong></p>
                <p><strong>Data do Serviço:</strong> ${dataFormatada}</p>
            </div>

            <table class="tabela-vale">
                <thead>
                    <tr>
                        <th style="text-align: left;">Subdivisão (Fração/Esquadrão)</th>
                        <th>☕ Café da Manhã</th>
                        <th>🍽️ Almoço</th>
                        <th>🍲 Jantar</th>
                    </tr>
                </thead>
                <tbody>
                    ${linhasTabela}
                    <tr class="total-row">
                        <td>TOTAL GERAL</td>
                        <td style="text-align: center;">${totalGeralCafe}</td>
                        <td style="text-align: center;">${totalGeralAlmoco}</td>
                        <td style="text-align: center;">${totalGeralJantar}</td>
                    </tr>
                </tbody>
            </table>

            <div class="assinaturas">
                <div class="campo-assinatura">Sargento Aprovisionador / Fiscal do Rancho</div>
                <div class="campo-assinatura">Oficial de Dia / Fiscal de Dia</div>
            </div>

            <script>
                window.onload = function() { window.print(); setTimeout(function() { window.close(); }, 800); };
            <\/script>
        </body>
        </html>
    `);
    janelaImpressao.document.close();
}

// =========================================================================
// GERENCIAMENTO ADMINISTRATIVO MASTER (GERIR CONTAS E QR CODE)
// =========================================================================
function incluirUsuarioViaAdmin() {
    const nomeMilitar = document.getElementById('admin-novo-usuario').value.trim();
    const esquadrao = document.getElementById('admin-novo-esquadrao').value;
    const nivel = document.getElementById('admin-novo-nivel').value;

    if (!nomeMilitar) {
        return alert("Por favor, digite o Nome de Guerra!");
    }

    const usuarioID = padronizarTexto(nomeMilitar);
    const refUser = db.ref('usuarios/' + usuarioID);

    refUser.once('value').then(snapshot => {
        if (snapshot.exists()) {
            alert("Este Nome de Guerra já possui cadastro!");
        } else {
            refUser.set({
                usuario: nomeMilitar,
                reparticao: esquadrao,
                nivel: nivel,
                senha: "123"
            }).then(() => {
                alert(`Militar ${nomeMilitar} cadastrado! Senha padrão: 123`);
                document.getElementById('admin-novo-usuario').value = '';
                renderizarListaDeUsuariosParaAdmin();
            });
        }
    });
}

function renderizarListaDeUsuariosParaAdmin() {
    const container = document.getElementById('lista-gerenciamento-usuarios');
    const filtro = document.getElementById('admin-filtro-esquadrao').value;
    if (!container) return;

    db.ref('usuarios').once('value').then(snapshot => {
        container.innerHTML = '';
        
        snapshot.forEach(filho => {
            const user = childData = filho.val();
            
            if (filtro !== 'TODOS' && padronizarTexto(user.reparticao) !== padronizarTexto(filtro)) {
                return;
            }

            const card = document.createElement('div');
            card.className = 'admin-user-row';
            card.innerHTML = `
                <div class="admin-user-info">
                    <strong style="color: #fff;">${user.usuario}</strong> 
                    <span>(${user.reparticao})</span>
                    <span style="color: #d4af37; margin-top: 2px;">Nível: ${user.nivel} | Senha: ${user.senha}</span>
                </div>
                <div style="display: flex; gap: 5px;">
                    <button onclick="alterarNivelUsuario('${filho.key}', '${user.nivel}')" class="btn btn-primary" style="padding: 4px 8px; font-size: 8pt; width: auto; margin-top: 0;">Mudar Nivel</button>
                    <button onclick="deletarUsuario('${filho.key}')" class="btn btn-logout" style="padding: 4px 8px; font-size: 8pt; width: auto; margin-top: 0; background: #c0392b;">Excluir</button>
                </div>
            `;
            container.appendChild(card);
        });
    });
}

function alterarNivelUsuario(chave, nivelAtual) {
    let novoNivel = 'Militar';
    if (nivelAtual === 'Militar') novoNivel = 'Furriel';
    else if (nivelAtual === 'Furriel') novoNivel = 'Administrador';
    else novoNivel = 'Militar';

    db.ref('usuarios/' + chave + '/nivel').set(novoNivel).then(() => {
        alert("Nível atualizado!");
        renderizarListaDeUsuariosParaAdmin();
    });
}

function deletarUsuario(chave) {
    if (confirm("Remover permanentemente este militar?")) {
        db.ref('usuarios/' + chave).remove().then(() => {
            alert("Militar removido.");
            renderizarListaDeUsuariosParaAdmin();
        });
    }
}

// QR CODE INTEGRADO - ESTABILIZADO
function gerarQRCodeConexao() {
    const container = document.getElementById('container-qrcode');
    const imgQR = document.getElementById('img-qrcode');
    const txtURL = document.getElementById('txt-url-qrcode');
    
    if (!container || !imgQR) return;

    const urlAtual = window.location.href;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(urlAtual)}`;

    imgQR.src = qrUrl;
    if (txtURL) txtURL.innerText = urlAtual;
    container.style.display = 'block';
}