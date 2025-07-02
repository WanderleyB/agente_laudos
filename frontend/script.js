// script.js com suporte a múltiplos laudos, loading animado e histórico local

// Inicialização do histórico
const historicoKey = "historicoLaudos";
carregarHistoricoSalvo();

// Submissão do formulário
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
    chatBox.innerHTML += `<div class="user-message">📄 Enviando: ${file.name}</div>`;
    chatBox.innerHTML += `<div class="loading-message" id="loading-${i}">⏳ Analisando o laudo</div>`;
    chatBox.scrollTop = chatBox.scrollHeight;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("https://agente-laudos.onrender.com", {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      document.getElementById(`loading-${i}`).remove();

      const htmlBruto = data.html.replace(/```html|```/g, "").trim();

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

    } catch (err) {
      document.getElementById(`loading-${i}`)?.remove();
      chatBox.innerHTML += `<div class="bot-message">❌ Erro ao analisar ${file.name}: ${err.message}</div>`;
    }

    chatBox.scrollTop = chatBox.scrollHeight;
  }
});

// Adiciona mensagens ao chat
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

// Adiciona loading com animação
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

// Botão limpar histórico visual
const limparBtn = document.getElementById("limparHistorico");
limparBtn.addEventListener('click', () => {
  const chatBox = document.getElementById('chatBox');
  chatBox.innerHTML = `<div class="bot-message">👨‍⚕️ Olá! Envie um ou mais laudos médicos em PDF e eu farei a análise para você.</div>`;
  localStorage.removeItem(historicoKey);
});

// Salva no localStorage
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

// Botão de baixar todos os PDFs
document.getElementById("baixarTodos").addEventListener("click", () => {
  const link = document.createElement("a");
  link.href = "https://agente-laudos.onrender.com/baixar-todos/";
  link.download = "laudos_gerados.zip";
  link.click();
});
