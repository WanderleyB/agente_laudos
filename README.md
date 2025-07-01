# 🩺 Agente Laudos – Analisador de Laudos Médicos Ocupacionais

Este projeto é um sistema inteligente desenvolvido com **FastAPI** e **OpenAI GPT-4o**, capaz de analisar automaticamente laudos médicos ocupacionais em **formato PDF**, interpretá-los e gerar relatórios estruturados, humanizados e prontos para uso. A interface é simples e responsiva, permitindo o envio de múltiplos arquivos com retorno instantâneo no estilo de um chat médico.

---

## 🚀 Funcionalidades

- 📥 Upload de um ou vários PDFs simultaneamente
- 🤖 Análise automatizada com IA treinada em medicina ocupacional
- 📋 Resultados detalhados com:
  - Nome do paciente
  - Tipo de exame
  - Valores laboratoriais com status ✅ / ⚠️
  - Análise médica humanizada
  - Conclusão de aptidão
- 📄 Geração automática de PDF formatado com emojis coloridos (🟢 / 🔴)
- 💾 Histórico salvo localmente no navegador
- 📁 Botão para baixar todos os laudos analisados de uma só vez

---

## 🧰 Tecnologias utilizadas

- [FastAPI](https://fastapi.tiangolo.com/)
- [OpenAI GPT-4o](https://platform.openai.com/)
- [pdfplumber](https://github.com/jsvine/pdfplumber)
- [pdfkit](https://pypi.org/project/pdfkit/)
- [HTML + CSS + JavaScript Puro](https://developer.mozilla.org/)
- [Render.com](https://render.com/) (para deploy gratuito)
- `wkhtmltopdf` (para conversão HTML → PDF)

---

## 📦 Instalação local

1. Clone o repositório:
   ```bash
   git clone https://github.com/seu-usuario/agente_laudos.git
   cd agente_laudos
   ```

2. Instale as dependências:
   ```bash
   pip install -r requirements.txt
   ```

3. Certifique-se de ter o [wkhtmltopdf](https://wkhtmltopdf.org/downloads.html) instalado e atualizado.

4. Execute o servidor:
   ```bash
   uvicorn main:app --reload
   ```

5. Abra o `index.html` da pasta `frontend` com Live Server ou um servidor local.

---

## 🌐 Deploy na Render

Este projeto está pronto para deploy gratuito no [Render](https://render.com/):

- Inclui:
  - `render.yaml`
  - `requirements.txt`
  - `start.sh`
- Basta criar um repositório no GitHub e importar no Render como Web Service.

---

## 🛡️ Licença

Este projeto não possui licença definida. Consulte o autor antes de uso comercial.

---

## 👨‍⚕️ Sobre

Este sistema foi criado para facilitar a rotina de empresas de **Medicina e Segurança do Trabalho**, automatizando a análise de laudos ocupacionais e economizando tempo da equipe técnica.
