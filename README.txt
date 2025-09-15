NF Keeper — pacote pronto para Netlify (backend direto)

- BACKEND_BASE: https://cefnf-backend.onrender.com
- O app chama o backend diretamente (sem proxy do Netlify).
- _redirects inclui apenas fallback SPA.

Como usar:
1) Faça o upload deste .zip no Netlify (drag-and-drop).
2) Testes:
   - https://cefnf-backend.onrender.com/health → {"ok":true}
   - https://cefnf.netlify.app/api/notas/28475 → (não usado aqui; app chama direto o backend)
   - Envie uma nota e clique no link retornado.