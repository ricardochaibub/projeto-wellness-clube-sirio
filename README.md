# Espaço Wellness Sírio

Proposta ao comitê do Esporte Clube Sírio para um espaço wellness (sauna seca, vapor,
infravermelho, banheiras de gelo, duchas e lounge) no deck da piscina. Site estático em
HTML, CSS e JS, sem build: publica direto em Vercel, Netlify ou GitHub Pages.

## Abrir localmente

Dê dois cliques em `abrir-site.bat`. Ele sobe um servidor local e abre
http://localhost:8770 no navegador. Para parar, feche a janela "Servidor".

- Proposta completa: http://localhost:8770/
- Tour 3D em página própria: http://localhost:8770/3d/

## Estrutura

| Caminho | O que é |
|---|---|
| `index.html`, `css/site.css`, `js/site.js` | Site da proposta |
| `3d/index.html`, `js/tour3d.js` | Tour 3D (Three.js via CDN) |
| `js/layout.js` | Geometria do espaço, usada pelo 3D e pela planta baixa |
| `data/projeto.json` | Orçamento, custo operacional e cronograma (gerado) |
| `orcamento-wellness-sirio.xlsx` | Planilha do orçamento com fórmulas (gerada) |
| `img/atual/` | Fotos atuais do local |
| `img/render/` | Vistas 3D usadas no antes e depois e na capa |
| `research/` | Análise do local, benchmark, pesquisa de preços e layout |
| `tools/gerar_dados.py` | Fonte única dos números: gera o JSON e a planilha |
| `tools/servidor_dev.py` | Servidor de desenvolvimento que também salva as vistas 3D |

## Mudar um preço ou uma premissa

1. Edite `tools/gerar_dados.py`.
2. Rode `python tools/gerar_dados.py` (precisa do `openpyxl`).
3. O site lê o JSON novo na hora; a planilha é recriada.

## Regenerar as vistas 3D do antes e depois

Rode `python tools/servidor_dev.py 8771`, abra http://localhost:8771/3d/?limpo=1 e, no
console do navegador, use `__tour.aplicarVista('foto1')` e `__tour.capturar(720, 960)`;
envie o resultado com `fetch('/__capturar?nome=foto1', { method: 'POST', body: url })`.

## Publicar

O repositório é privado. Vercel e Netlify publicam repositórios privados no plano grátis;
o GitHub Pages grátis exige repositório público.
