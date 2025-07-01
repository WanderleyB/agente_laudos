from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
import pdfplumber
from openai import OpenAI
import pdfkit
import os
import json
import zipfile
from datetime import datetime

import os
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

LOGS_DIR = "logs"
PDFS_DIR = "laudos_analisados"
MAX_FILE_SIZE = 5 * 1024 * 1024

os.makedirs(LOGS_DIR, exist_ok=True)
os.makedirs(PDFS_DIR, exist_ok=True)

app.mount("/laudos", StaticFiles(directory=PDFS_DIR), name="laudos")


def validar_tamanho_arquivo(file: UploadFile):
    file.file.seek(0, os.SEEK_END)
    tamanho = file.file.tell()
    file.file.seek(0)
    if tamanho > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="Arquivo muito grande. Máximo permitido: 5MB.")


def ler_pdf(file_path):
    try:
        texto = ""
        with pdfplumber.open(file_path) as pdf:
            for pagina in pdf.pages:
                texto += pagina.extract_text() + "\n"
        if not texto.strip():
            raise ValueError("PDF sem texto detectável.")
        return texto
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao ler o PDF: {str(e)}")


def salvar_log(dados):
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    log_filename = os.path.join(LOGS_DIR, f"laudo_{timestamp}.json")
    with open(log_filename, "w", encoding="utf-8") as f:
        json.dump(dados, f, ensure_ascii=False, indent=4)


def gerar_pdf(texto, output_path):
    config = pdfkit.configuration(wkhtmltopdf=r'C:\Program Files\wkhtmltopdf\bin\wkhtmltopdf.exe')

    texto_colorido = (
        texto.replace("✅", '<span style="color:green;">✅</span>')
             .replace("🟢", '<span style="color:green;">🟢</span>')
             .replace("🔴", '<span style="color:red;">🔴</span>')
    )

    html = f"""
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            @font-face {{
                font-family: "Segoe UI Emoji";
                src: local("Segoe UI Emoji");
            }}
            body {{
                font-family: "Segoe UI Emoji", "Arial", sans-serif;
                font-size: 14px;
                line-height: 1.6;
                color: #000;
                padding: 40px;
            }}
            h1 {{
                text-align: center;
                font-size: 18px;
                text-transform: uppercase;
                margin-bottom: 30px;
            }}
        </style>
    </head>
    <body>
        <h1>LAUDO MÉDICO OCUPACIONAL</h1>
        <div>{texto_colorido.replace('\n', '<br>')}</div>
    </body>
    </html>
    """
    pdfkit.from_string(html, output_path, configuration=config)


@app.post("/analisar-laudo/")
async def analisar_laudo(file: UploadFile = File(...)):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Arquivo enviado não é um PDF.")

    validar_tamanho_arquivo(file)

    temp_filename = f"temp_{file.filename}"
    try:
        with open(temp_filename, "wb") as buffer:
            buffer.write(await file.read())

        texto_pdf = ler_pdf(temp_filename)

        prompt = f"""
Você é um médico especialista em medicina ocupacional. Analise o conteúdo do laudo abaixo e gere uma resposta com o seguinte formato, usando exatamente esta estrutura:

📄 Paciente: [NOME DO PACIENTE]

📅 Data do Exame: [DATA]

🧪 Exame: [TIPO DE EXAME]

📊 Resultados:
[Parâmetro 1]: [Valor] → ✅ Normal  
[Parâmetro 2]: [Valor] → ✅ Normal  
...

🧠 Análise como médico especialista:
[Texto explicativo claro sobre os resultados laboratoriais e o estado de saúde do paciente]

🧾 Conclusão Médica:

Paciente [Apto/Inapto] para atividades laborais.  
[Comentário médico, se necessário.]

📌 **Status geral:** [Apto/Inapto para o trabalho] [🟢 ou 🔴]

⚠️ Instruções importantes:
- Utilize apenas texto puro (sem HTML, sem Markdown)
- Mantenha espaçamento claro entre blocos
- Emojis devem ser simples: ✅, 🔴, 🟢, 📄, 📅, 🧪, 📊, 🧠, 🧾, 📌
- Coloque o **status geral apenas no final** do texto

Laudo:
\"\"\"{texto_pdf}\"\"\"
"""

        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2
        )

        resposta_texto = response.choices[0].message.content

        pdf_filename = f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_{file.filename.replace('.pdf','')}_analise.pdf"
        pdf_path = os.path.join(PDFS_DIR, pdf_filename)
        gerar_pdf(resposta_texto, pdf_path)

        salvar_log({
            "arquivo": file.filename,
            "conteudo_extraido": texto_pdf,
            "resposta_formatada": resposta_texto,
            "pdf_gerado": pdf_filename
        })

        return JSONResponse(content={
            "html": resposta_texto,
            "pdf_gerado": f"/laudos/{pdf_filename}"
        })

    finally:
        if os.path.exists(temp_filename):
            os.remove(temp_filename)


@app.get("/baixar-todos/")
async def baixar_todos_os_laudos():
    zip_path = os.path.join(PDFS_DIR, "laudos_gerados.zip")
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zipf:
        for nome in os.listdir(PDFS_DIR):
            caminho = os.path.join(PDFS_DIR, nome)
            if nome.endswith(".pdf") and os.path.isfile(caminho):
                zipf.write(caminho, arcname=nome)
    return FileResponse(zip_path, filename="laudos_gerados.zip", media_type="application/zip")
@app.get("/")
def root():
    return {"status": "online", "mensagem": "API Agente Laudos está ativa!"}
