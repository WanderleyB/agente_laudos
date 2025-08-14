// script.js com suporte a múltiplos laudos, loading animado e histórico local
// + LOG por usuário no Firestore em: /usuarios/{username}/auditoria/{logId}
//   Campos salvos: { texto: "analisou HH:MM DD/MM/YYYY", conteudo, arquivo, createdAt }

// ====== Firebase (apenas para registrar uso por usuário) ======
let __fb = null; // cache

async function ensureFirebase() {
  if (__fb) return __fb;

  // imports dinâmicos (funciona mesmo com <script> normal)
  const appMod = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js");
  const fsMod  = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");

  // mesmo config do seu projeto
  const firebaseConfig = {
    apiKey: "AIzaSyAwNAOHk_w5YuLS109ZJHbEBhUDCdTjO0A",
    authDomain: "agentlaudos.firebaseapp.com",
    projectId: "agentlaudos",
    storageBucket: "agentlaudos.appspot.com",
    messagingSenderId: "725949737314",
    appId: "1:725949737314:web:7e2e37a0be10386bf5e43b",
  };

  const app = appMod.getApps().length ? appMod.getApp() : appMod.initializeApp(firebaseConfig);
  const db  = fsMod.getFirestore(app);

  __fb = {
    db,
    addDoc: fsMod.addDoc,
    collection: fsMod.collection,
    serverTimestamp: fsMod.serverTimestamp
  };
  return __fb;
}

function timestampBR() {
  const tz = "America/Sao_Paulo";
  const d = new Date();
  const hora = d.toLocaleTimeString("pt-BR", { timeZone: tz, hour: "2-digit", minute: "2-digit" });
  const data = d.toLocaleDateString("pt-BR", { timeZone: tz });
  return `${hora} ${data}`;
}

// Cria um doc em /usuarios/{username}/auditoria com o conteúdo analisado
async function registrarUsoPorUsuario(conteudo, arquivo) {
  try {
    const fb = await ensureFirebase();
    const username = (localStorage.getItem("username") || "desconhecido").toLowerCase();
    const col = fb.collection(fb.db, "usuarios", username, "auditoria");
    await fb.addDoc(col, {
      texto: `analisou ${timestampBR()}`,
      conteudo: String(conteudo || ""),
      arquivo: arquivo || null,
      createdAt: fb.serverTimestamp()
    });
  } catch (e) {
    console.warn("Falha ao registrar uso no Firestore (/usuarios/{user}/auditoria):", e);
  }
}

// ====== Inicialização do histórico ======
const historicoKey = "historicoLaudos";
carregarHistoricoSalvo();

// ====== Submissão do formulário ======
document.getElementById('uploadForm').addEventListener('submit', async function (e) {
  e.preventDefault();

  const input = document.getElementById('laudo_pdf');
  const files = input.files;
  const chatBox = document.getElementById('chatBox');

  if (!files.length) {
    chatBox.innerHTML += `<div class="bot-message">❌ Por favor, selecione ao menos um PDF.</div>`;
    return;
  }

  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    // Mostra nome do laudo sendo enviado
    chatBox.innerHTML += `<div class="user-message">📄 Enviando: ${escapeHtml(file.name)}</div>`;
    chatBox.innerHTML += `<div class="loading-message" id="loading-${i}">⏳ Analisando o laudo</div>`;
    chatBox.scrollTop = chatBox.scrollHeight;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("https://agente-laudos.onrender.com/analisar-laudo/", {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      document.getElementById(`loading-${i}`)?.remove();

      const htmlBruto = (data.html || "").replace(/```html|```/g, "").trim();

      const resultadoContainer = document.createElement("div");
      resultadoContainer.className = "bot-message";
      resultadoContainer.innerHTML = htmlBruto.replace(/\n/g, "<br>");
      chatBox.appendChild(resultadoContainer);

      if (data.pdf_gerado) {
        const pdfLink = `https://agente-laudos.onrender.com${data.pdf_gerado}`;
        chatBox.innerHTML += `
          <div class="bot-message">
            <a href="${pdfLink}" target="_blank" class="download-link">
              📄 Visualizar PDF gerado
            </a>
          </div>
        `;
      }

      salvarHistorico(file.name, htmlBruto);

      // >>> LOG por usuário no Firestore (conteúdo + carimbo simples)
      await registrarUsoPorUsuario(htmlBruto, file.name);

    } catch (err) {
      document.getElementById(`loading-${i}`)?.remove();
      chatBox.innerHTML += `<div class="bot-message">❌ Erro ao analisar ${escapeHtml(file.name)}: ${escapeHtml(err.message)}</div>`;
    }

    chatBox.scrollTop = chatBox.scrollHeight;
  }
});

// ====== Utilitários de UI ======
function appendMessage(text, sender = "bot", allowHTML = false) {
  const chatBox = document.getElementById("chatBox");
  const message = document.createElement("div");
  message.className = sender === "user" ? "user-message" : "bot-message";

  const content = document.createElement("div");
  content.className = "message-content";
  content.innerHTML = allowHTML ? text : escapeHtml(text);

  const time = document.createElement("div");
  time.className = "timestamp";
  time.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  content.appendChild(time);
  message.appendChild(content);
  chatBox.appendChild(message);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function appendLoading() {
  const chatBox = document.getElementById("chatBox");
  const loading = document.createElement("div");
  loading.className = "loading-message";
  loading.id = "loading";
  loading.textContent = "🩺 Analisando o laudo";
  chatBox.appendChild(loading);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function removeLoading() {
  const loading = document.getElementById("loading");
  if (loading) loading.remove();
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function formatarHTML(texto) {
  return texto.replace(/\n/g, '<br>')
    .replace(/📄/g, '<br><br>📄')
    .replace(/📅/g, '<br><br>📅')
    .replace(/🧪/g, '<br><br>🧪')
    .replace(/📊/g, '<br><br>📊')
    .replace(/🧠/g, '<br><br>🧠')
    .replace(/🧾/g, '<br><br>🧾')
    .replace(/📌/g, '<br><br>📌');
}

// ====== Histórico local ======
const limparBtn = document.getElementById("limparHistorico");
limparBtn.addEventListener('click', () => {
  const chatBox = document.getElementById('chatBox');
  chatBox.innerHTML = `<div class="bot-message">👨‍⚕️ Olá! Envie um ou mais laudos médicos em PDF e eu farei a análise para você.</div>`;
  localStorage.removeItem(historicoKey);
});

function salvarHistorico(arquivo, texto) {
  const dados = JSON.parse(localStorage.getItem(historicoKey) || "[]");
  dados.push({ arquivo, texto, timestamp: new Date().toISOString() });
  localStorage.setItem(historicoKey, JSON.stringify(dados));
}

function carregarHistoricoSalvo() {
  const dados = JSON.parse(localStorage.getItem(historicoKey) || "[]");
  if (dados.length === 0) return;
  appendMessage("🔁 Histórico de laudos analisados carregado.", "bot");
  for (const item of dados) {
    appendMessage(`📄 Laudo analisado anteriormente: ${item.arquivo}`, "user");
    appendMessage(formatarHTML(item.texto), "bot", true);
  }
}

// ====== Baixar todos ======
document.getElementById("baixarTodos").addEventListener("click", () => {
  const link = document.createElement("a");
  link.href = "https://agente-laudos.onrender.com/baixar-todos/";
  link.download = "laudos_gerados.zip";
  link.click();
});
