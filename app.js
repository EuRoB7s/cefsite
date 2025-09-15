
// Se window.__CONFIG__.BACKEND_BASE estiver setado, chamamos direto o backend.
// Caso contrário, poderia usar proxy via _redirects (não necessário aqui).
const BACKEND = (window.__CONFIG__ && window.__CONFIG__.BACKEND_BASE) || "";

function join(base, path) {
  if (!base) return path;
  return base.replace(/\/+$/, "") + "/" + path.replace(/^\/+/, "");
}

async function enviarNota(formData) {
  const url = join(BACKEND, "/api/notas");
  const r = await fetch(url, { method: "POST", body: formData });
  if (!r.ok) throw new Error(`Falha HTTP ${r.status}`);
  return await r.json();
}

async function buscarNota(numero) {
  const url = join(BACKEND, "/api/notas/" + encodeURIComponent(numero));
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Falha HTTP ${r.status}`);
  return await r.json();
}

function el(id){ return document.getElementById(id); }

window.addEventListener("DOMContentLoaded", () => {
  const formEnvio = el("formEnvio");
  const formBusca = el("formBusca");
  const envioStatus = el("envioStatus");
  const buscaStatus = el("buscaStatus");

  formEnvio.addEventListener("submit", async (e) => {
    e.preventDefault();
    envioStatus.textContent = "Enviando…";
    envioStatus.className = "status";

    const numeroEnvio = el("numeroEnvio").value.trim();
    const data = el("dataEnvio").value;
    const arquivo = el("arquivo").files[0];

    if (!numeroEnvio || !data || !arquivo) {
      envioStatus.textContent = "Preencha todos os campos.";
      envioStatus.className = "status err";
      return;
    }

    try {
      const fd = new FormData();
      fd.append("numeroEnvio", numeroEnvio);
      fd.append("data", data);
      fd.append("arquivo", arquivo);
      const res = await enviarNota(fd);
      if (res && res.ok) {
        const link = res.arquivo_url ? (BACKEND ? join(BACKEND, res.arquivo_url) : res.arquivo_url) : null;
        envioStatus.innerHTML = "✅ Enviado com sucesso." + (link ? ` <a href="${link}" target="_blank" rel="noopener">Abrir arquivo</a>` : "");
        envioStatus.className = "status ok";
        formEnvio.reset();
      } else {
        throw new Error(res && res.erro ? res.erro : "Falha no envio");
      }
    } catch (err) {
      envioStatus.textContent = "❌ Erro ao enviar: " + err.message;
      envioStatus.className = "status err";
    }
  });

  formBusca.addEventListener("submit", async (e) => {
    e.preventDefault();
    buscaStatus.textContent = "Buscando…";
    buscaStatus.className = "status";

    const numero = el("numeroBusca").value.trim();
    if (!numero) {
      buscaStatus.textContent = "Informe o número da nota.";
      buscaStatus.className = "status err";
      return;
    }
    try {
      const res = await buscarNota(numero);
      if (res && res.ok) {
        const link = res.arquivo_url ? (BACKEND ? join(BACKEND, res.arquivo_url) : res.arquivo_url) : null;
        buscaStatus.innerHTML = `✅ Encontrada. Nº ${res.numero || numero}. ` + (link ? `<a href="${link}" target="_blank" rel="noopener">Abrir arquivo</a>` : "");
        buscaStatus.className = "status ok";
      } else {
        throw new Error(res && res.erro ? res.erro : "Não encontrada");
      }
    } catch (err) {
      buscaStatus.textContent = "❌ Erro: " + err.message;
      buscaStatus.className = "status err";
    }
  });
});
