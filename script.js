// Inicialização limpa - Sem contas fantasmas
function inicializarBancoDeDados() {
    let usuarios = JSON.parse(localStorage.getItem('usuariosArranchamento'));
    if (!usuarios || usuarios.length === 0) {
        usuarios = [
            { usuario: "1º Sgt Simas", senha: "123", reparticao: "ST/SGT", nivelAcesso: "Administrador" },
            { usuario: "3º Sgt Silva", senha: "123", reparticao: "ST/SGT", nivelAcesso: "Militar" },
            { usuario: "3º Sgt Pimentel", senha: "123", reparticao: "ST/SGT", nivelAcesso: "Militar" }
        ];
        localStorage.setItem('usuariosArranchamento', JSON.stringify(usuarios));
    }
    
    // Purga forçada de sgtsimas para evitar logins residuais
    let contaLimpa = usuarios.filter(u => padronizarTexto(u.usuario) !== "sgtsimas");
    if(contaLimpa.length !== usuarios.length) {
        localStorage.setItem('usuariosArranchamento', JSON.stringify(contaLimpa));
    }

    if (!localStorage.getItem('registrosArranchamento')) {
        localStorage.setItem('registrosArranchamento', JSON.stringify([]));
    }
}

inicializarBancoDeDados();
let militarConectado = null;
let diaCarrosselAtual = 0; 
let dadosDiasGerados = []; 

function padronizarTexto(texto) {
    if (!texto) return "";
    return texto.toLowerCase().replace(/º/g, '').replace(/ª/g, '').replace(/\./g, '').replace(/-/g, '').replace(/\s+/g, '');
}

function extrairGraduacao(nomeCompleto) {
    if (!nomeCompleto) return "Usuário";
    const limpo = nomeCompleto.toUpperCase();
    
    if (limpo.startsWith("SUBTEN") || limpo.startsWith("SUB TEN")) return "SubTen";
    if (limpo.startsWith("1 SGT") || limpo.startsWith("1º SGT")) return "1º Sgt";
    if (limpo.startsWith("2 SGT") || limpo.startsWith("2º SGT")) return "2º Sgt";
    if (limpo.startsWith("3 SGT") || limpo.startsWith("3º SGT")) return "3º Sgt";
    if (limpo.startsWith("ASP") || limpo.startsWith("ASP OF")) return "Asp Of";
    if (limpo.startsWith("CAP") || limpo.startsWith("CAPITÃO")) return "Cap";
    if (limpo.startsWith("TEN") || limpo.startsWith("1º TEN") || limpo.startsWith("2º TEN")) return "Ten";
    if (limpo.startsWith("MAJ") || limpo.startsWith("MAJOR")) return "Maj";
    if (limpo.startsWith("TC") || limpo.startsWith("TEN CEL")) return "Ten Cel";
    if (limpo.startsWith("CEL")) return "Cel";
    if (limpo.startsWith("CB") || limpo.startsWith("CABO")) return "Cb";
    if (limpo.startsWith("SD") || limpo.startsWith("SOLDADO")) return "Sd";

    const partes = nomeCompleto.split(' ');
    if (partes.length > 1 && partes[0].length <= 5) {
        return partes[0];
    }
    return "Usuário";
}

function limparNomeGuerraApenas(nomeCompleto) {
    if (!nomeCompleto) return "";
    let padraoRemover = nomeCompleto.replace(/1º\s*Sgt|2º\s*Sgt|3º\s*Sgt|1\s*Sgt|2\s*Sgt|3\s*Sgt|Sgt|SubTen|Asp\s*Of|Asp|Cap|Ten|Maj|Ten\s*Cel|Cel|Cb|Sd/i, '');
    return padraoRemover.trim();
}

function alternarAba(nomeAba) {
    document.querySelectorAll('.aba-conteudo').forEach(aba => aba.classList.add('hidden'));
    document.querySelectorAll('.btn-aba').forEach(btn => btn.classList.remove('ativo'));

    document.getElementById(`conteudo-${nomeAba}`).classList.remove('hidden');
    document.getElementById(`btn-aba-${nomeAba}`).classList.add('ativo');

    if (nomeAba === 'relatorio') { atualizarVisualizacaoNominal(); }
    if (nomeAba === 'admin') { renderizarListaDeUsuariosParaAdmin(); }
    if (nomeAba === 'furriel') {
        document.getElementById('furriel-subdivisao').value = "";
        document.getElementById('zona-impressao-furriel').classList.add('hidden');
    }
}

function obterChaveDataSelecionada() {
    const dataInput = document.getElementById('data-sistema-global').value;
    if (!dataInput) return "";
    let partes = dataInput.split('-');
    let objData = new Date(partes[0], partes[1] - 1, partes[2]);
    let dia = String(objData.getDate()).padStart(2, '0');
    let mes = String(objData.getMonth() + 1).padStart(2, '0');
    let diasSemana = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
    return `${diasSemana[objData.getDay()]} ${dia}/${mes}`;
}

function sincronizarDataGlobal() {
    const chaveGlobal = obterChaveDataSelecionada();
    if (chaveGlobal && dadosDiasGerados.length > 0) {
        const indexEncontrado = dadosDiasGerados.findIndex(d => d.chave === chaveGlobal);
        if (indexEncontrado !== -1) {
            diaCarrosselAtual = indexEncontrado;
            renderizarDiaCarrossel();
        }
    }
    atualizarVisualizacaoNominal();
    atualizarVisualizacaoFurriel();
}

function gerarDiasSemanaPerpetuos() {
    dadosDiasGerados = [];
    const diasSemanaTexto = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
    const agora = new Date();

    for (let i = 0; i < 7; i++) {
        let dataAlvo = new Date();
        dataAlvo.setDate(agora.getDate() + i);
        let diaTexto = diasSemanaTexto[dataAlvo.getDay()];
        let dataFormatada = dataAlvo.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        let dataLimiteArranchamento = new Date(dataAlvo.getFullYear(), dataAlvo.getMonth(), dataAlvo.getDate() - 1, 15, 30, 0);
        let estaBloqueado = agora > dataLimiteArranchamento;

        dadosDiasGerados.push({
            chave: `${diaTexto} ${dataFormatada}`,
            titulo: `${diaTexto} (${dataFormatada})`,
            bloqueado: estaBloqueado,
            dataISO: dataAlvo.toISOString().split('T')[0]
        });
    }
}

function renderizarDiaCarrossel() {
    const container = document.getElementById('container-dias-dinamicos');
    if (!container || dadosDiasGerados.length === 0) return;

    container.innerHTML = "";
    const dia = dadosDiasGerados[diaCarrosselAtual];

    let registros = JSON.parse(localStorage.getItem('registrosArranchamento')) || [];
    let meuRegistro = registros.find(r => r.nome === militarConectado.usuario);
    let escolhasAntigas = (meuRegistro && meuRegistro.escolhas && meuRegistro.escolhas[dia.chave]) ? meuRegistro.escolhas[dia.chave] : [];

    let divDia = document.createElement('div');
    divDia.className = 'dia-box';
    divDia.innerHTML = `
        <h3>${dia.titulo}</h3>
        <div class="checkbox-group">
            <label><input type="checkbox" data-dia="${dia.chave}" value="Café" ${escolhasAntigas.includes("Café") ? "checked" : ""} ${dia.bloqueado ? 'disabled' : ''}> ☕ Café</label>
            <label><input type="checkbox" data-dia="${dia.chave}" value="Almoço" ${escolhasAntigas.includes("Almoço") ? "checked" : ""} ${dia.bloqueado ? 'disabled' : ''}> 🍽️ Almoço</label>
            <label><input type="checkbox" data-dia="${dia.chave}" value="Jantar" ${escolhasAntigas.includes("Jantar") ? "checked" : ""} ${dia.bloqueado ? 'disabled' : ''}> 🥣 Jantar</label>
        </div>
        ${dia.bloqueado ? '<span class="prazo-encerrado">🔒 Encerrado (15:30 de ontem).</span>' : ''}
    `;
    container.appendChild(divDia);
}

function mudarDiaCarrossel(direcao) {
    diaCarrosselAtual += direcao;
    if (diaCarrosselAtual < 0) diaCarrosselAtual = dadosDiasGerados.length - 1;
    if (diaCarrosselAtual >= dadosDiasGerados.length) diaCarrosselAtual = 0;
    document.getElementById('data-sistema-global').value = dadosDiasGerados[diaCarrosselAtual].dataISO;
    renderizarDiaCarrossel();
    atualizarVisualizacaoNominal();
    atualizarVisualizacaoFurriel();
}

function efetuarAcesso() {
    const esquadraoInput = document.getElementById('login-reparticao').value;
    const usuarioInput = document.getElementById('login-usuario').value.trim();
    const senhaInput = document.getElementById('login-senha').value.trim();

    if (usuarioInput === "" || senhaInput === "") {
        alert("Preencha todos os campos.");
        return;
    }

    let usuarios = JSON.parse(localStorage.getItem('usuariosArranchamento')) || [];
    const loginDigitadoLimpo = padronizarTexto(usuarioInput);

    if (loginDigitadoLimpo === "sgtsimas") {
        alert("Esta conta duplicada foi removida pelo Administrador.");
        return;
    }
    
    let contaExistente = usuarios.find(u => padronizarTexto(u.usuario) === loginDigitadoLimpo);

    if (contaExistente) {
        if (contaExistente.senha !== senhaInput) { alert("Senha incorreta!"); return; }
        militarConectado = contaExistente;
    } else {
        let nivelInicial = (usuarios.length === 0 || loginDigitadoLimpo.includes("simas")) ? "Administrador" : "Militar";
        let novaConta = { usuario: usuarioInput, senha: senhaInput, reparticao: esquadraoInput, nivelAcesso: nivelInicial };
        usuarios.push(novaConta);
        localStorage.setItem('usuariosArranchamento', JSON.stringify(usuarios));
        militarConectado = novaConta;
        alert(`Conta criada com sucesso!`);
    }

    document.getElementById('militar-logado').innerText = militarConectado.usuario;
    
    const containerBadge = document.getElementById('nivel-badge-container');
    containerBadge.innerHTML = `<span class="user-badge">[ ${militarConectado.nivelAcesso === 'Militar' ? 'Usuário' : militarConectado.nivelAcesso} ]</span>`;

    if (militarConectado.nivelAcesso === "Administrador") {
        document.querySelectorAll('.adm-only, .furriel-only').forEach(el => el.classList.remove('hidden'));
    } else if (militarConectado.nivelAcesso === "Furriel") {
        document.querySelectorAll('.furriel-only').forEach(el => el.classList.remove('hidden'));
        document.querySelectorAll('.adm-only').forEach(el => el.classList.add('hidden'));
    } else {
        document.querySelectorAll('.adm-only, .furriel-only').forEach(el => el.classList.add('hidden'));
    }

    document.getElementById('data-sistema-global').value = new Date().toISOString().split('T')[0];
    gerarDiasSemanaPerpetuos();
    diaCarrosselAtual = 0;
    renderizarDiaCarrossel();

    document.getElementById('tela-login').classList.add('hidden');
    document.getElementById('painel-sistema').classList.remove('hidden');
    alternarAba('arranchamento');
}

function alterarMinhaSenha() {
    const novaSenha = document.getElementById('senha-nova').value.trim();
    if (novaSenha === "") {
        alert("Digite uma senha válida.");
        return;
    }
    let usuarios = JSON.parse(localStorage.getItem('usuariosArranchamento')) || [];
    let meuUsuario = usuarios.find(u => u.usuario === militarConectado.usuario);
    if (meuUsuario) {
        meuUsuario.senha = novaSenha;
        militarConectado.senha = novaSenha;
        localStorage.setItem('usuariosArranchamento', JSON.stringify(usuarios));
        alert("Senha modificada com sucesso!");
        document.getElementById('senha-nova').value = "";
    }
}

function incluirUsuarioViaAdmin() {
    const nomeInput = document.getElementById('admin-novo-usuario').value.trim();
    const esquadraoInput = document.getElementById('admin-novo-esquadrao').value;
    const nivelInput = document.getElementById('admin-novo-nivel').value;

    if (!nomeInput) {
        alert("Digite o nome do usuário.");
        return;
    }

    let usuarios = JSON.parse(localStorage.getItem('usuariosArranchamento')) || [];
    if (usuarios.some(u => padronizarTexto(u.usuario) === padronizarTexto(nomeInput))) {
        alert("Este usuário já se encontra cadastrado.");
        return;
    }

    usuarios.push({
        usuario: nomeInput,
        senha: "123", 
        reparticao: esquadraoInput,
        nivelAcesso: nivelInput
    });

    localStorage.setItem('usuariosArranchamento', JSON.stringify(usuarios));
    alert(`Usuário "${nomeInput}" incluído com sucesso! Senha padrão: 123`);
    document.getElementById('admin-novo-usuario').value = "";
    renderizarListaDeUsuariosParaAdmin();
}

function excluirUsuarioViaAdmin(nomeUsuario) {
    if (nomeUsuario === militarConectado.usuario) {
        alert("Você não pode excluir sua própria conta administrativa.");
        return;
    }
    if (confirm(`Tem certeza que deseja remover permanentemente o usuário "${nomeUsuario}"?`)) {
        let usuarios = JSON.parse(localStorage.getItem('usuariosArranchamento')) || [];
        usuarios = usuarios.filter(u => u.usuario !== nomeUsuario);
        localStorage.setItem('usuariosArranchamento', JSON.stringify(usuarios));
        
        let registros = JSON.parse(localStorage.getItem('registrosArranchamento')) || [];
        registros = registros.filter(r => r.nome !== nomeUsuario);
        localStorage.setItem('registrosArranchamento', JSON.stringify(registros));

        renderizarListaDeUsuariosParaAdmin();
    }
}

function renderizarListaDeUsuariosParaAdmin() {
    const containerLista = document.getElementById('lista-gerenciamento-usuarios');
    const filtroEsquadrao = document.getElementById('admin-filtro-esquadrao').value;
    if (!containerLista) return;
    
    containerLista.innerHTML = "";
    let usuarios = JSON.parse(localStorage.getItem('usuariosArranchamento')) || [];
    usuarios.sort((a, b) => a.usuario.localeCompare(b.usuario));

    if (filtroEsquadrao !== "TODOS") {
        usuarios = usuarios.filter(u => u.reparticao === filtroEsquadrao);
    }

    if(usuarios.length === 0) {
        containerLista.innerHTML = `<p style="font-size:9pt;text-align:center;color:#666;padding:10px;">Nenhum usuário cadastrado.</p>`;
        return;
    }

    usuarios.forEach((u) => {
        let row = document.createElement('div');
        row.className = 'admin-user-row';
        row.style.display = "flex";
        row.style.justifyContent = "space-between";
        row.style.alignItems = "center";
        
        row.innerHTML = `
            <div class="admin-user-info">
                <strong>${limparNomeGuerraApenas(u.usuario)}</strong> 
                <span>${u.reparticao}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 10px;">
                <div>
                    <label style="font-size:8.5pt; color:#d4af37; margin-right:4px;">Usuário:</label>
                    <select class="select-role-admin" onchange="alterarNivelAcessoMilitar('${u.usuario}', this.value)">
                        <option value="Militar" ${u.nivelAcesso === "Militar" ? "selected" : ""}>Usuário</option>
                        <option value="Furriel" ${u.nivelAcesso === "Furriel" ? "selected" : ""}>Furriel</option>
                        <option value="Administrador" ${u.nivelAcesso === "Administrador" ? "selected" : ""}>Administrador</option>
                    </select>
                </div>
                <button onclick="excluirUsuarioViaAdmin('${u.usuario}')" style="background:#a60000; color:#fff; border:none; padding:4px 8px; border-radius:3px; font-size:8pt; cursor:pointer; font-weight:bold;">Deletar</button>
            </div>
        `;
        containerLista.appendChild(row);
    });
}

function alterarNivelAcessoMilitar(nomeGuerra, novoNivel) {
    let usuarios = JSON.parse(localStorage.getItem('usuariosArranchamento'));
    let militarAlvo = usuarios.find(u => u.usuario === nomeGuerra);
    if (militarAlvo) {
        militarAlvo.nivelAcesso = novoNivel;
        localStorage.setItem('usuariosArranchamento', JSON.stringify(usuarios));
    }
}

function construirEstruturaTabelaFuncional(filtrados, chaveData) {
    if (filtrados.length === 0) {
        return `<p style="font-size:9pt;color:#a60000;text-align:center;padding:10px;font-weight:bold;">Nenhum arranchamento para este dia.</p>`;
    }

    let totalC = 0, totalA = 0, totalJ = 0;
    filtrados.sort((a, b) => a.nome.localeCompare(b.nome));

    let html = `
        <table class="tabela-preview">
            <thead>
                <tr>
                    <th style="width:10%;">Nº Ord.</th>
                    <th style="width:18%;">Grad.</th>
                    <th style="width:42%; text-align:left;">Nome</th>
                    <th style="width:10%;">C</th>
                    <th style="width:10%;">A</th>
                    <th style="width:10%;">J</th>
                </tr>
            </thead>
            <tbody>
    `;

    filtrados.forEach((m, index) => {
        let escolhas = m.escolhas[chaveData] || [];
        let temC = escolhas.includes("Café");
        let temA = escolhas.includes("Almoço");
        let temJ = escolhas.includes("Jantar");

        if (temC) totalC++;
        if (temA) totalA++;
        if (temJ) totalJ++;

        html += `
            <tr>
                <td>${index + 1}</td>
                <td><strong>${extrairGraduacao(m.nome)}</strong></td>
                <td style="text-align:left;">${limparNomeGuerraApenas(m.nome)}</td>
                <td>${temC ? "X" : ""}</td>
                <td>${temA ? "X" : ""}</td>
                <td>${temJ ? "X" : ""}</td>
            </tr>
        `;
    });

    html += `
            </tbody>
            <tfoot>
                <tr>
                    <td colspan="3" style="text-align:center; font-weight:bold; color:#d4af37;">TOTAL</td>
                    <td>${totalC}</td>
                    <td>${totalA}</td>
                    <td>${totalJ}</td>
                </tr>
            </tfoot>
        </table>
    `;
    return html;
}

function atualizarVisualizacaoNominal() {
    const subdivisao = document.getElementById('relatorio-subdivisao').value;
    const container = document.getElementById('tabela-preview-nominal');
    const chaveData = obterChaveDataSelecionada();
    if (!chaveData) { container.innerHTML = "Selecione uma data."; return; }
    let registros = JSON.parse(localStorage.getItem('registrosArranchamento')) || [];
    let filtrados = registros.filter(r => r.reparticao === subdivisao && r.escolhas[chaveData] && r.escolhas[chaveData].length > 0);
    container.innerHTML = construirEstruturaTabelaFuncional(filtrados, chaveData);
}

function atualizarVisualizacaoFurriel() {
    const subdivisao = document.getElementById('furriel-subdivisao').value;
    const zonaImpressao = document.getElementById('zona-impressao-furriel');
    const containerTabela = document.getElementById('tabela-preview-furriel');
    const chaveData = obterChaveDataSelecionada();

    if (!subdivisao) {
        zonaImpressao.classList.add('hidden');
        return;
    }
    let registros = JSON.parse(localStorage.getItem('registrosArranchamento')) || [];
    let filtrados = registros.filter(r => r.reparticao === subdivisao && r.escolhas[chaveData] && r.escolhas[chaveData].length > 0);
    containerTabela.innerHTML = construirEstruturaTabelaFuncional(filtrados, chaveData);
    zonaImpressao.classList.remove('hidden');
}

function salvarArranchamento(event) {
    if (event) event.preventDefault();
    if (!militarConectado) return;
    let registros = JSON.parse(localStorage.getItem('registrosArranchamento')) || [];
    let registroExistente = registros.find(r => r.nome === militarConectado.usuario);
    let escolhasPorDia = registroExistente ? registroExistente.escolhas : {};

    const diaAtualChave = dadosDiasGerados[diaCarrosselAtual].chave;
    escolhasPorDia[diaAtualChave] = [];

    const checkboxes = document.querySelectorAll('#container-dias-dinamicos input[type="checkbox"]:checked');
    checkboxes.forEach(cb => {
        let diaCb = cb.getAttribute('data-dia');
        if (diaCb === diaAtualChave) {
            escolhasPorDia[diaAtualChave].push(cb.value);
        }
    });

    registros = registros.filter(r => r.nome !== militarConectado.usuario);
    registros.push({ nome: militarConectado.usuario, reparticao: militarConectado.reparticao, escolhas: escolhasPorDia });

    localStorage.setItem('registrosArranchamento', JSON.stringify(registros));
    alert("Escolhas salvas com sucesso!");
    atualizarVisualizacaoNominal();
    atualizarVisualizacaoFurriel();
}

function fazerLogout() {
    militarConectado = null;
    document.getElementById('login-usuario').value = "";
    document.getElementById('login-senha').value = "";
    document.getElementById('painel-sistema').classList.add('hidden');
    document.getElementById('tela-login').classList.remove('hidden');
}

function gerarQRCodeConexao() {
    const urlAtual = window.location.href;
    const container = document.getElementById('container-qrcode');
    const imgElement = document.getElementById('img-qrcode');
    const txtElement = document.getElementById('txt-url-qrcode');

    if (urlAtual.includes("127.0.0.1") || urlAtual.includes("localhost")) {
        alert("Atenção: Você está acessando via Localhost.\n\nPara funcionar no celular fora do PC, conclua o passo de hospedagem web gratuita.");
    }

    const googleChartUrl = `https://chart.googleapis.com/chart?cht=qr&chs=200x200&chl=${encodeURIComponent(urlAtual)}`;
    imgElement.src = googleChartUrl;
    txtElement.innerText = urlAtual;
    container.style.display = "block";
}

function gerarRelatorioSeparatedPDF(idSelectOrigem) {
    let registros = JSON.parse(localStorage.getItem('registrosArranchamento')) || [];
    const subdivisao = document.getElementById(idSelectOrigem).value;
    const chaveData = obterChaveDataSelecionada();

    if (!chaveData || !subdivisao) {
        alert("Selecione um esquadrão válido.");
        return;
    }

    let filtrados = registros.filter(r => r.reparticao === subdivisao && r.escolhas[chaveData] && r.escolhas[chaveData].length > 0);
    filtrados.sort((a, b) => a.nome.localeCompare(b.nome));

    let totalC = 0, totalA = 0, totalJ = 0;

    let htmlPDF = `
        <div id="pdf-render-area" style="padding: 20px; font-family: 'Arial', sans-serif; color: #000; background-color: #fff; width: 100%; box-sizing: border-box;">
            <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 15px;">
                <h2 style="margin: 0; font-size: 14pt; font-weight: bold; text-transform: uppercase;">7º Regimento de Cavalaria Mecanizado</h2>
                <h3 style="margin: 4px 0 0 0; font-size: 16pt; font-weight: bold; text-transform: uppercase; color: #a60000;">${subdivisao}</h3>
                <p style="margin: 6px 0 0 0; font-size: 11pt; font-weight: bold;">Relatório Nominal de Arranchamento - Data: ${chaveData}</p>
            </div>
            
            <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                <thead>
                    <tr style="background-color: #e3e3e3;">
                        <th style="padding: 8px 6px; text-align: center; border: 1px solid #000; font-size: 10pt; font-weight: bold; width: 10%;">Nº Ord.</th>
                        <th style="padding: 8px 6px; text-align: center; border: 1px solid #000; font-size: 10pt; font-weight: bold; width: 18%;">Grad.</th>
                        <th style="padding: 8px 6px; text-align: left; border: 1px solid #000; font-size: 10pt; font-weight: bold; width: 42%;">Nome</th>
                        <th style="padding: 8px 6px; text-align: center; border: 1px solid #000; font-size: 10pt; font-weight: bold; width: 10%;">Café</th>
                        <th style="padding: 8px 6px; text-align: center; border: 1px solid #000; font-size: 10pt; font-weight: bold; width: 10%;">Almoço</th>
                        <th style="padding: 8px 6px; text-align: center; border: 1px solid #000; font-size: 10pt; font-weight: bold; width: 10%;">Jantar</th>
                    </tr>
                </thead>
                <tbody>
    `;

    if (filtrados.length === 0) {
        htmlPDF += `<tr><td colspan="6" style="padding: 20px; text-align: center; font-size: 11pt; font-style: italic; border: 1px solid #000;">Nenhum militar arranchado para esta data.</td></tr>`;
    } else {
        filtrados.forEach((m, idx) => {
            let escolhas = m.escolhas[chaveData] || [];
            let temC = escolhas.includes("Café");
            let temA = escolhas.includes("Almoço");
            let temJ = escolhas.includes("Jantar");

            if (temC) totalC++;
            if (temA) totalA++;
            if (temJ) totalJ++;

            htmlPDF += `
                <tr>
                    <td style="padding: 8px 6px; text-align: center; border: 1px solid #000; font-size: 10pt;">${idx + 1}</td>
                    <td style="padding: 8px 6px; text-align: center; border: 1px solid #000; font-size: 10pt; font-weight: bold;">${extrairGraduacao(m.nome)}</td>
                    <td style="padding: 8px 6px; border: 1px solid #000; font-size: 10pt;">${limparNomeGuerraApenas(m.nome)}</td>
                    <td style="padding: 8px 6px; text-align: center; border: 1px solid #000; font-size: 10pt; font-weight: bold;">${temC ? "X" : ""}</td>
                    <td style="padding: 8px 6px; text-align: center; border: 1px solid #000; font-size: 10pt; font-weight: bold;">${temA ? "X" : ""}</td>
                    <td style="padding: 8px 6px; text-align: center; border: 1px solid #000; font-size: 10pt; font-weight: bold;">${temJ ? "X" : ""}</td>
                </tr>
            `;
        });
    }

    htmlPDF += `
                </tbody>
                <tfoot>
                    <tr style="background-color: #f5f5f5; font-weight: bold;">
                        <td colspan="3" style="padding: 10px 6px; border: 1px solid #000; text-align: center; font-size: 10pt; font-weight: bold;">TOTAL</td>
                        <td style="padding: 10px 6px; border: 1px solid #000; text-align: center; font-size: 10pt; font-weight: bold;">${totalC}</td>
                        <td style="padding: 10px 6px; border: 1px solid #000; text-align: center; font-size: 10pt; font-weight: bold;">${totalA}</td>
                        <td style="padding: 10px 6px; border: 1px solid #000; text-align: center; font-size: 10pt; font-weight: bold;">${totalJ}</td>
                    </tr>
                </tfoot>
            </table>
            
            <div style="margin-top: 60px; text-align: center; font-size: 11pt;">
                <p style="margin-bottom: 50px;">Sant'Ana do Livramento - RS, ${new Date().toLocaleDateString('pt-BR')}.</p>
                <div style="display: inline-block; width: 260px; border-top: 1px solid #000; padding-top: 5px; font-weight: bold;">
                    Fiscal de Dia / Furriel Responsável
                </div>
            </div>
        </div>
    `;

    const janelaImpressao = window.open('', '_blank', 'width=900,height=700');
    janelaImpressao.document.write(`
        <html>
        <head>
            <title>Arranchamento_${subdivisao.replace(/ /g, '_')}</title>
            <style>
                @media print {
                    body { margin: 0; padding: 0; }
                    @page { size: A4 portrait; margin: 10mm; }
                }
            </style>
        </head>
        <body style="margin:0; padding:0;">
            ${htmlPDF}
            <script>
                window.onload = function() {
                    window.print();
                    setTimeout(function() { window.close(); }, 500);
                };
            </script>
        </body>
        </html>
    `);
    janelaImpressao.document.close();
}