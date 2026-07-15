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
// INICIALIZAÇÃO DO SISTEMA E SINCRONIA DE DATAS
// =========================================================================
document.addEventListener('DOMContentLoaded', () => {
    const inputDataGlobal = document.getElementById('data-sistema-global');
    if (inputDataGlobal) {
        inputDataGlobal.value = dataSelecionadaGlobal;
        
        // Faz o carrossel andar junto com o calendário do topo
        inputDataGlobal.addEventListener('change', (e) => {
            dataSelecionadaGlobal = e.target.value;
            indiceCarrosselInicio = 0; // Zera o desvio das setas
            renderizarDiasCarrossel();
            atualizarVisualizacaoNominal();
            atualizarVisualizacaoFurriel();
        });
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
        .replace(/[.\-\[\]$#\/\sº°]/g, "") // remove caracteres especiais proibidos no Firebase
        .trim();
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

        // REGRA MASTER ABSOLUTA: Se tiver "simas" em qualquer lugar do nome, É ADMIN!
        if (nomeGuerra.toLowerCase().includes('simas')) {
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

    // Controle dinâmico das abas
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

    alternarAba('arranchamento');
    renderizarDiasCarrossel();
    
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
        renderizarDiasCarrossel();
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

// =========================================================================
// SISTEMA SEGURO DE ALTERAÇÃO DE SENHA
// =========================================================================
function executarAlteracaoDeSenha() {
    const senhaAntiga = document.getElementById('input-senha-antiga').value.trim();
    const senhaNova = document.getElementById('input-senha-nova').value.trim();
    const senhaConfirmacao = document.getElementById('input-senha-confirmacao').value.trim();

    // 1. Validações básicas de preenchimento
    if (!senhaAntiga || !senhaNova || !senhaConfirmacao) {
        return alert("Atenção: Todos os campos de senha são obrigatórios!");
    }

    if (senhaNova.length < 6) {
        return alert("Erro: A nova senha deve conter no mínimo 6 caracteres.");
    }

    if (senhaNova !== senhaConfirmacao) {
        return alert("Erro: A nova senha e a confirmação não coincidem!");
    }

    if (senhaAntiga === senhaNova) {
        return alert("Aviso: A nova senha não pode ser idêntica à senha atual.");
    }

    // 2. Identifica quem é o usuário atualmente logado de forma dinâmica e precisa
    let idMilitarAtual = null;

    if (typeof usuarioLogado !== 'undefined' && usuarioLogado) {
        // Se houver um nome de usuário, padroniza ele da mesma forma que no login
        const nomeGuerra = usuarioLogado.usuario || usuarioLogado.nomeGuerra;
        if (nomeGuerra) {
            idMilitarAtual = padronizarTexto(nomeGuerra);
        }
    }

    // Fallback de segurança se o método acima falhar
    if (!idMilitarAtual) {
        idMilitarAtual = localStorage.getItem('usuarioLogadoId') || sessionStorage.getItem('usuarioLogadoId');
    }

    if (!idMilitarAtual) {
        return alert("Erro: Sessão do usuário expirou ou não foi encontrada. Faça login novamente.");
    }

    // 3. Busca a senha atual registrada no banco para validação de segurança
    db.ref('usuarios/' + idMilitarAtual).once('value').then((snapshot) => {
        if (!snapshot.exists()) {
            return alert("Erro: Registro do militar (" + idMilitarAtual + ") não localizado no banco de dados.");
        }

        const dadosMilitar = snapshot.val();
        const senhaSalvaNoBanco = dadosMilitar.senha || dadosMilitar.password;

        // 4. Valida se a senha antiga confere com o banco
        if (senhaAntiga !== senhaSalvaNoBanco) {
            return alert("Erro: A senha atual digitada está incorreta!");
        }

        // 5. Se tudo estiver correto, atualiza a senha no banco de dados
        db.ref('usuarios/' + idMilitarAtual).update({
            senha: senhaNova
        }).then(() => {
            alert("Senha alterada com sucesso!");
            
            // Limpa os campos do formulário por segurança
            document.getElementById('input-senha-antiga').value = "";
            document.getElementById('input-senha-nova').value = "";
            document.getElementById('input-senha-confirmacao').value = "";
        }).catch((err) => {
            console.error("Erro ao atualizar senha no Firebase:", err);
            alert("Erro ao gravar nova senha: " + err.message);
        });

    }).catch((err) => {
        console.error("Erro ao validar credenciais no Firebase:", err);
        alert("Erro na verificação de segurança: " + err.message);
    });
}

// =========================================================================
// CARROSSEL PREMIUM: DESIGN IDÊNTICO AO MOCKUP COM INTERAÇÃO DE CARDS
// =========================================================================
function renderizarDiasCarrossel() {
    const container = document.getElementById('container-dias-dinamicos');
    if (!container) return;
    
    const diasSemana = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
    
    // Configuração fuso horário local
    const baseDate = new Date(dataSelecionadaGlobal + 'T00:00:00');
    let dataLoop = new Date(baseDate);
    dataLoop.setDate(baseDate.getDate() + indiceCarrosselInicio);

    const dataISO = dataLoop.toISOString().slice(0, 10);
    const diaSemanaNome = diasSemana[dataLoop.getDay()];
    const diaMes = dataLoop.getDate().toString().padStart(2, '0') + '/' + (dataLoop.getMonth() + 1).toString().padStart(2, '0');

    // Valida trava segura das 15:30h do dia anterior
    const limitePrazo = new Date(dataLoop.getFullYear(), dataLoop.getMonth(), dataLoop.getDate() - 1, 15, 30, 0, 0);
    const agora = new Date();
    const isBloqueado = agora > limitePrazo;

    // Inicializa ou limpa o estado temporário local para esta data
    if (!window.estadosTemporarios) {
        window.estadosTemporarios = { cafe: false, almoco: false, jantar: false };
    }

    // Busca dados existentes no banco para renderizar o estado correto do Card
    const refId = `${usuarioLogado.usuario}_${dataISO}`.replace(/[.#$\[\]]/g, "_");
    db.ref('arranchamento/' + refId).once('value').then((snap) => {
        if (snap.exists()) {
            const dadosRef = snap.val();
            window.estadosTemporarios.cafe = (dadosRef.cafe === true || dadosRef.cafe === "true");
            window.estadosTemporarios.almoco = (dadosRef.almoco === true || dadosRef.almoco === "true");
            window.estadosTemporarios.jantar = (dadosRef.jantar === true || dadosRef.jantar === "true");
        } else {
            window.estadosTemporarios.cafe = false;
            window.estadosTemporarios.almoco = false;
            window.estadosTemporarios.jantar = false;
        }

        montarEstruturaHTML(container, diaSemanaNome, diaMes, dataISO, isBloqueado);
    }).catch(() => {
        montarEstruturaHTML(container, diaSemanaNome, diaMes, dataISO, isBloqueado);
    });
}

// Auxiliar para gerar o HTML do carrossel no padrão premium e cinza neutro/verde militar
function montarEstruturaHTML(container, diaSemana, diaMes, dataISO, isBloqueado) {
    container.innerHTML = `
        <div style="width: 100%; max-width: 480px; margin: 0 auto; padding: 15px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
            
            <!-- Título do Dia Selecionado -->
            <div style="text-align: center; margin-bottom: 20px;">
                <h3 style="margin: 0; color: #1a1a1a; font-size: 20px; font-weight: 700;">${diaSemana}</h3>
                <span style="color: #666; font-size: 14px; font-weight: 500;">${diaMes}</span>
            </div>

            <!-- Container de Cards (Sem checkboxes feios, apenas cliques interativos) -->
            <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 25px;">
                
                <!-- CARD 1: CAFÉ DA MANHÃ -->
                <div onclick="${isBloqueado ? '' : `alternarEstadoCard('cafe', '${dataISO}')`}" 
                     id="card-cafe"
                     style="display: flex; align-items: center; justify-content: space-between; padding: 16px; background: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); cursor: ${isBloqueado ? 'default' : 'pointer'}; transition: all 0.2s ease; opacity: ${isBloqueado ? '0.75' : '1'};">
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <span style="font-size: 24px;">☕</span>
                        <div>
                            <strong style="display: block; color: #1a1a1a; font-size: 16px;">Café da Manhã</strong>
                            <span id="badge-cafe" style="font-size: 12px; font-weight: 600; padding: 2px 8px; border-radius: 20px;">Carregando...</span>
                        </div>
                    </div>
                    <div id="indicador-cafe" style="width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center;"></div>
                </div>

                <!-- CARD 2: ALMOÇO -->
                <div onclick="${isBloqueado ? '' : `alternarEstadoCard('almoco', '${dataISO}')`}" 
                     id="card-almoco"
                     style="display: flex; align-items: center; justify-content: space-between; padding: 16px; background: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); cursor: ${isBloqueado ? 'default' : 'pointer'}; transition: all 0.2s ease; opacity: ${isBloqueado ? '0.75' : '1'};">
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <span style="font-size: 24px;">🍽️</span>
                        <div>
                            <strong style="display: block; color: #1a1a1a; font-size: 16px;">Almoço</strong>
                            <span id="badge-almoco" style="font-size: 12px; font-weight: 600; padding: 2px 8px; border-radius: 20px;">Carregando...</span>
                        </div>
                    </div>
                    <div id="indicador-almoco" style="width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center;"></div>
                </div>

                <!-- CARD 3: JANTAR -->
                <div onclick="${isBloqueado ? '' : `alternarEstadoCard('jantar', '${dataISO}')`}" 
                     id="card-jantar"
                     style="display: flex; align-items: center; justify-content: space-between; padding: 16px; background: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); cursor: ${isBloqueado ? 'default' : 'pointer'}; transition: all 0.2s ease; opacity: ${isBloqueado ? '0.75' : '1'};">
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <span style="font-size: 24px;">🍲</span>
                        <div>
                            <strong style="display: block; color: #1a1a1a; font-size: 16px;">Jantar</strong>
                            <span id="badge-jantar" style="font-size: 12px; font-weight: 600; padding: 2px 8px; border-radius: 20px;">Carregando...</span>
                        </div>
                    </div>
                    <div id="indicador-jantar" style="width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center;"></div>
                </div>

            </div>

            <!-- Alerta de Bloqueio se houver -->
            ${isBloqueado ? `
                <div style="margin-bottom: 20px; padding: 12px; background: #FDE8E8; border-radius: 8px; text-align: center; color: #9B1C1C; font-size: 13px; font-weight: 600;">
                    🔒 Prazo encerrado (Limite: 15:30h do dia anterior)
                </div>
            ` : ''}

            <!-- Botão de Salvar no Vermelho Militar Premium -->
            <div>
                <button type="button" 
                        onclick="salvarArranchamentoUnico('${dataISO}', event)" 
                        style="width: 100%; padding: 16px; font-size: 16px; font-weight: 700; background-color: #7A0C0C; color: #ffffff; border: none; border-radius: 12px; cursor: pointer; transition: background 0.2s ease; box-shadow: 0 4px 12px rgba(122,12,12,0.2);">
                    SALVAR ARRANCHAMENTO
                </button>
            </div>
        </div>
    `;
    
    // Atualiza imediatamente as cores e as badges dos cards renderizados
    atualizarEstiloVisualCard('cafe');
    atualizarEstiloVisualCard('almoco');
    atualizarEstiloVisualCard('jantar');
}

// Alterna os estados no clique dos cards de refeição
function alternarEstadoCard(refeicao, dataISO) {
    window.estadosTemporarios[refeicao] = !window.estadosTemporarios[refeicao];
    atualizarEstiloVisualCard(refeicao);
}

// Manipula classes e estilos CSS inline para ficar idêntico ao protótipo profissional
function atualizarEstiloVisualCard(refeicao) {
    const card = document.getElementById(`card-${refeicao}`);
    const badge = document.getElementById(`badge-${refeicao}`);
    const indicador = document.getElementById(`indicador-${refeicao}`);

    if (!card || !badge || !indicador) return;

    const ativo = window.estadosTemporarios[refeicao];

    if (ativo) {
        // Card totalmente verde quando selecionado
        card.style.background = "#DEF7EC";
        card.style.borderLeft = "5px solid #0E9F6E";
        
        badge.innerText = "Arranchado";
        badge.style.background = "#0E9F6E";
        badge.style.color = "#ffffff";
        
        indicador.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" fill="#ffffff"/>
            </svg>
        `;
        indicador.style.background = "#0E9F6E";
    } else {
        // Card cinza neutro quando n�o solicitado
        card.style.background = "#F3F4F6";
        card.style.borderLeft = "5px solid #9CA3AF";
        
        badge.innerText = "N�o solicitado";
        badge.style.background = "#E5E7EB";
        badge.style.color = "#4B5563";
        
        indicador.innerHTML = "";
        indicador.style.background = "#E5E7EB";
    }
}

function mudarDiaCarrossel(passo) {
    indiceCarrosselInicio += passo;
    renderizarDiasCarrossel();
}

function salvarArranchamentoUnico(dataServico, event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }

    if (!usuarioLogado) {
        return alert("Erro de sessão: Faça login novamente.");
    }

    const agora = new Date();
    const partes = dataServico.split('-');
    const limitePrazo = new Date(parseInt(partes[0]), parseInt(partes[1]) - 1, parseInt(partes[2]) - 1, 15, 30, 0, 0);

    if (agora > limitePrazo) {
        return alert("Erro: O prazo para alterar esta data encerrou às 15:30h de ontem!");
    }

    const usuarioIDLimpo = padronizarTexto(usuarioLogado.usuario);
    const refId = `${usuarioIDLimpo}_${dataServico}`;
    
    db.ref('arranchamento/' + refId).set({
        usuario: usuarioLogado.usuario,
        reparticao: usuarioLogado.reparticao,
        dataRegistro: dataServico,
        cafe: window.estadosTemporarios.cafe,
        almoco: window.estadosTemporarios.almoco,
        jantar: window.estadosTemporarios.jantar
    }).then(() => {
        alert("Arranchamento salvo com sucesso!");
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
// GERENCIAMENTO ADMINISTRATIVO MASTER E QR CODE
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
                senha: "123", // Senha padrão inicial
                nivel: nivel
            }).then(() => {
                alert(`Militar ${nomeMilitar} cadastrado com sucesso! Senha padrão: 123`);
                document.getElementById('admin-novo-usuario').value = '';
                renderizarListaDeUsuariosParaAdmin();
            });
        }
    }).catch(err => {
        alert("Erro ao cadastrar militar: " + err.message);
    });
}

function inicializarSeletorPermissoes() {
    const selectMilitar = document.getElementById('select-militar-permissoes');
    if (!selectMilitar) return;

    db.ref('usuarios').once('value').then((snapshot) => {
        selectMilitar.innerHTML = '<option value="">-- Selecione o Militar --</option>';
        
        if (snapshot.exists()) {
            const usuarios = [];
            snapshot.forEach((childSnapshot) => {
                const dados = childSnapshot.val();
                
                // === IMPRESSÃO PARA DESCOBRIR A CHAVE CORRETA NO CONSOLE ===
                console.log("Dados do Militar do Firebase:", childSnapshot.key, dados);
                
                // Tenta mapear exaustivamente todas as chaves possíveis de nome
                const nomeIdentificado = 
                    dados.nome_guerra || 
                    dados.nomeGuerra || 
                    dados.guerra ||
                    dados.nome_guerra_militar ||
                    dados.usuario || 
                    dados.username ||
                    dados.nomeMilitar || 
                    dados.nome || 
                    childSnapshot.key || 
                    "Sem Nome";
                
                // Tenta mapear exaustivamente todas as chaves possíveis de nível/role
                const nivelAtual = 
                    dados.nivel || 
                    dados.permissao || 
                    dados.role || 
                    dados.tipo ||
                    "usuario";
                
                usuarios.push({
                    id: childSnapshot.key,
                    nome: nomeIdentificado,
                    nivelAtual: nivelAtual
                });
            });

            // Ordena em ordem alfabética
            usuarios.sort((a, b) => a.nome.localeCompare(b.nome));

            // Preenche o menu
            usuarios.forEach((usr) => {
                const opt = document.createElement('option');
                opt.value = usr.id;
                opt.textContent = `${usr.nome} (${usr.nivelAtual.toUpperCase()})`;
                selectMilitar.appendChild(opt);
            });
        } else {
            selectMilitar.innerHTML = '<option value="">Nenhum militar cadastrado</option>';
        }
    }).catch((err) => {
        console.error("Erro ao carregar militares no seletor:", err);
    });
}

// Executar a inicialização do seletor sempre que o painel administrativo for carregado
// Adicione esta linha dentro da sua função existente que renderiza o painel do Admin:
// inicializarSeletorPermissoes();

function excluirUsuario(usuarioID, nomeMilitar) {
    if (confirm(`Deseja realmente excluir permanentemente o cadastro de ${nomeMilitar}?`)) {
        db.ref('usuarios/' + usuarioID).remove().then(() => {
            alert("Militar excluído com sucesso!");
            renderizarListaDeUsuariosParaAdmin();
        }).catch(err => {
            alert("Erro ao excluir usuário: " + err.message);
        });
    }
}

// =========================================================================
// SISTEMA DE QR CODE E IMPRESSÃO DE ACESSO
// =========================================================================
function gerarQRCodeConexao() {
    try {
        const urlSistema = window.location.href;
        
        // Usando a API alternativa ultra-rápida e sem bloqueios de CORS:
        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(urlSistema)}`;
        
        const containerQR = document.getElementById('container-qrcode');
        const imgQR = document.getElementById('img-qrcode');
        const txtURL = document.getElementById('txt-url-qrcode');

        if (!containerQR || !imgQR) {
            console.error("Elementos HTML do QR Code não foram encontrados na página.");
            return alert("Erro interno: Elementos do QR Code não encontrados no layout.");
        }

        // Altera as propriedades para garantir que a imagem renderize com o tamanho correto
        imgQR.style.width = "150px";
        imgQR.style.height = "150px";
        imgQR.src = qrCodeUrl;
        
        if (txtURL) {
            txtURL.innerText = urlSistema;
        }
        
        // Exibe o container
        containerQR.style.display = 'block';

        // Evita duplicar o botão de impressão se o usuário clicar mais de uma vez
        let btnImprimir = document.getElementById('btn-imprimir-qrcode-dinamico');
        if (!btnImprimir) {
            btnImprimir = document.createElement('button');
            btnImprimir.id = 'btn-imprimir-qrcode-dinamico';
            btnImprimir.type = 'button';
            btnImprimir.style.marginTop = '15px';
            btnImprimir.style.width = '100%';
            btnImprimir.style.maxWidth = '250px';
            btnImprimir.style.padding = '10px';
            btnImprimir.style.fontSize = '11pt';
            btnImprimir.style.fontWeight = 'bold';
            btnImprimir.style.backgroundColor = '#3498db';
            btnImprimir.style.color = '#fff';
            btnImprimir.style.border = 'none';
            btnImprimir.style.borderRadius = '4px';
            btnImprimir.style.cursor = 'pointer';
            btnImprimir.innerText = '🖨️ Imprimir QR Code';
            
            btnImprimir.onclick = function() {
                imprimirQRCodeOficial(qrCodeUrl);
            };

            containerQR.appendChild(btnImprimir);
        }
    } catch (error) {
        console.error("Erro ao gerar QR Code:", error);
        alert("Erro ao processar o QR Code: " + error.message);
    }
}

function imprimirQRCodeOficial(urlImagemQR) {
    const janelaImpressao = window.open('', '_blank');
    if (!janelaImpressao) {
        return alert("Por favor, libere os pop-ups do navegador para poder imprimir!");
    }

    janelaImpressao.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>QR Code de Acesso - 7º RC Mec</title>
            <style>
                body { font-family: Arial, sans-serif; text-align: center; padding: 40px; background-color: #fff; color: #000; }
                .moldura { border: 4px double #000; padding: 30px; max-width: 500px; margin: 0 auto; border-radius: 10px; }
                h2 { margin: 0; font-size: 18pt; text-transform: uppercase; }
                h3 { margin: 10px 0; font-size: 14pt; color: #333; }
                .qrcode-box { margin: 30px 0; }
                .qrcode-box img { width: 300px; height: 300px; }
                .instrucao { font-size: 12pt; font-weight: bold; margin-top: 20px; line-height: 1.5; }
                .rodape { margin-top: 35px; font-size: 10pt; border-top: 1px solid #ccc; padding-top: 15px; text-transform: uppercase; }
            </style>
        </head>
        <body>
            <div class="moldura">
                <h2>7º Regimento de Cavalaria Mecanizado</h2>
                <h3>Regimento Brigadeiro Vasco Alves Pereira</h3>
                <hr style="border: 0; border-top: 1px solid #000; margin: 15px 0;">
                
                <p class="instrucao" style="font-size: 14pt;">SISTEMA DE ARRANCHAMENTO DIGITAL</p>
                
                <div class="qrcode-box">
                    <img src="${urlImagemQR}" alt="QR Code">
                </div>
                
                <p class="instrucao">Aponte a câmera do seu celular para o QR Code acima para realizar o seu arranchamento.</p>
                
                <div class="rodape">
                 Aprovisionamento - 7º RC Mec
                </div>
            </div>
            <script>
                window.onload = function() { window.print(); setTimeout(function() { window.close(); }, 800); };
            <\/script>
        </body>
        </html>
    `);
    janelaImpressao.document.close();
}
// Função necessária para evitar o erro de comunicação e a descentralização do layout
function renderizarListaDeUsuariosParaAdmin() {
    // Como agora usamos o novo seletor de permissões inteligente,
    // apenas inicializamos ele aqui para preencher a lista de militares automaticamente.
    if (typeof inicializarSeletorPermissoes === "function") {
        inicializarSeletorPermissoes();
    }
}

// =========================================================================
// FUNÇÃO PARA EXCLUIR MILITAR DO SISTEMA (PAINEL ADMIN)
// =========================================================================
function excluirMilitarDoSistema() {
    const idMilitarSelecionado = document.getElementById('select-militar-permissoes').value;

    if (!idMilitarSelecionado) {
        return alert("Erro: Selecione um militar na lista para poder excluir!");
    }

    // 1. Identifica quem é o usuário logado para evitar autoexclusão
    let idLogado = null;
    if (typeof usuarioLogado !== 'undefined' && usuarioLogado) {
        const nomeGuerra = usuarioLogado.usuario || usuarioLogado.nomeGuerra;
        if (nomeGuerra) {
            idLogado = padronizarTexto(nomeGuerra);
        }
    }

    if (idMilitarSelecionado === idLogado) {
        return alert("Negado: Você não pode excluir sua própria conta de administrador!");
    }

    // 2. Confirmação de segurança dupla
    const confirma1 = confirm(`ATENÇÃO:\nTem certeza absoluta de que deseja EXCLUIR permanentemente o militar "${idMilitarSelecionado}" do banco de dados?`);
    if (!confirma1) return;

    const confirma2 = confirm(`CONFIRMAÇÃO FINAL:\nEsta ação não poderá ser desfeita e removerá todos os dados de acesso de "${idMilitarSelecionado}". Prosseguir?`);
    if (!confirma2) return;

    // 3. Remove do Firebase
    db.ref('usuarios/' + idMilitarSelecionado).remove()
        .then(() => {
            alert(`Sucesso: O militar "${idMilitarSelecionado}" foi excluído do sistema.`);
            
            // Se a função de listar usuários do admin existir, recarrega para atualizar o select
            if (typeof renderizarListaDeUsuariosParaAdmin === 'function') {
                renderizarListaDeUsuariosParaAdmin();
            } else {
                // Caso contrário, recarrega a página para atualizar as informações
                window.location.reload();
            }
        })
        .catch((err) => {
            console.error("Erro ao excluir usuário no Firebase:", err);
            alert("Erro ao remover militar: " + err.message);
        });
}
// =========================================================================
// FUNÇÃO PARA SALVAR NOVA PERMISSÃO DO MILITAR (PAINEL ADMIN)
// =========================================================================
function salvarNovaPermissaoMilitar() {
    const idMilitarSelecionado = document.getElementById('select-militar-permissoes').value;
    const nivelSelecionado = document.getElementById('select-nivel-permissoes').value;

    // 1. Validação de seleção
    if (!idMilitarSelecionado) {
        return alert("Erro: Selecione um militar na lista para poder alterar a permissão!");
    }

    if (!nivelSelecionado) {
        return alert("Erro: Selecione um nível de permissão válido!");
    }

    // 2. Mapeia o nível selecionado para o padrão do seu Firebase
    // (Geralmente "Administrador", "Furriel" ou "Militar")
    let nivelFormatado = "Militar";
    if (nivelSelecionado === "admin") {
        nivelFormatado = "Administrador";
    } else if (nivelSelecionado === "furriel") {
        nivelFormatado = "Furriel";
    }

    // 3. Grava diretamente no Firebase
    db.ref('usuarios/' + idMilitarSelecionado).update({
        nivel: nivelFormatado
    }).then(() => {
        alert(`Sucesso: Nível de acesso do militar "${idMilitarSelecionado}" alterado para ${nivelFormatado.toUpperCase()}!`);
        
        // Atualiza a lista/seletor na tela para refletir o novo nível
        if (typeof inicializarSeletorPermissoes === 'function') {
            inicializarSeletorPermissoes();
        } else {
            window.location.reload();
        }
    }).catch((err) => {
        console.error("Erro ao atualizar nível de acesso no Firebase:", err);
        alert("Erro ao salvar permissão: " + err.message);
    });
}
