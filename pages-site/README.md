# PAPERROUTE no GitHub Pages

A versão pública é compilada com Vite a partir de `app/page.tsx` e do motor Three.js original, sem exigir um servidor Cloudflare.

**Publicação automática:** o workflow `.github/workflows/pages.yml` usa Python + Blender para reconstruir os 42 modelos GLB que não constam do repositório, gera a textura do céu e publica o resultado.

Endereço esperado: https://jogoiarexx-blip.github.io/PaperBoy-port/

Para a primeira publicação, no GitHub vá a **Settings → Pages → Build and deployment → Source → GitHub Actions**. Depois abra **Actions → Publicar PAPERROUTE no GitHub Pages**.

**Execução local:** gere os assets com os scripts descritos no README principal, depois execute `npm --prefix pages-site install`, crie um link `node_modules` na raiz apontando para `pages-site/node_modules` e rode `npm --prefix pages-site run dev`.

O diretório `public/` não é versionado neste repositório; o pipeline o reconstrói a partir do código-fonte. É necessário WebGL 2.
