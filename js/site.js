// Monta as partes do site que dependem dos dados (data/projeto.json) e da geometria (layout.js).

import { ZONAS, EXISTENTES, EQUIPAMENTOS, CORREDOR, CAPACIDADE } from './layout.js';

const $ = (sel) => document.querySelector(sel);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const brl = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const brl2 = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });
const mi = (v) => 'R$ ' + (v / 1e6).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' mi';
const mil = (v) => 'R$ ' + Math.round(v / 1000).toLocaleString('pt-BR') + ' mil';
const num = (v, casas = 0) => v.toLocaleString('pt-BR', { maximumFractionDigits: casas });

const TETO = 2_000_000;
const TIPOS = {
  'Real': { classe: 'real', rotulo: 'Real', cor: '#2e8a57' },
  'Real (busca)': { classe: 'busca', rotulo: 'Real (busca)', cor: '#e0a526' },
  'Referência': { classe: 'ref', rotulo: 'Referência', cor: '#3c6fb0' },
  'Estimativa sobre preço real': { classe: 'int', rotulo: 'Importado', cor: '#8e4a9c' },
  'Estimativa': { classe: 'est', rotulo: 'Estimativa', cor: '#c9b9a3' },
};
const NOTA_CHAVE = {
  acessivel: 'Valor das duas duchas de coluna (acessível e higienização).',
  maquinas: 'Inclui o aquecimento de água das duchas e a casa de máquinas.',
  cascata: 'Inclui as cascatas de cada cenário.',
};

const dados = await (await fetch('data/projeto.json')).json();
const cenarios = dados.cenarios;

conferirSomas();
preencherNumeros();
montarCenarios();
montarTabelaGrupos();
montarItens('recomendado');
montarEquipamentos();
montarPlanta();
montarCapacidade();
montarGantt();
montarOperacional();
montarFontes();
ligarAntesDepois();
ligarTour();
ligarMenu();

// ------------------------------------------------------------ conferência

// Refaz as contas a partir dos itens e confere com os totais do arquivo.
function conferirSomas() {
  const relatorio = {};
  for (const c of cenarios) {
    const itens = dados.itens[c.id];
    const civis = new Set(dados.grupos.filter((g) => g.obra_civil).map((g) => g.id));
    const subtotal = itens.reduce((s, i) => s + i.qtd * i.unitario, 0);
    const civil = itens.filter((i) => civis.has(i.grupo)).reduce((s, i) => s + i.qtd * i.unitario, 0);
    const bdi = civil * dados.bdi;
    const total = (subtotal + bdi) * (1 + dados.contingencia);
    const t = dados.totais[c.id];
    const somaGrupos = Object.values(t.grupos).reduce((s, v) => s + v, 0);
    relatorio[c.id] = {
      total_calculado: Math.round(total * 100) / 100,
      total_arquivo: t.total,
      confere: Math.abs(total - t.total) < 1 && Math.abs(somaGrupos - t.subtotal) < 1 && Math.abs(t.subtotal + t.bdi + t.contingencia - t.total) < 1,
    };
  }
  window.__conferencia = relatorio;
  for (const [id, r] of Object.entries(relatorio)) if (!r.confere) console.error('Soma não confere no cenário', id, r);
}

function preencherNumeros() {
  document.querySelectorAll('[data-total]').forEach((el) => { el.textContent = mi(dados.totais[el.dataset.total].total); });
  document.querySelectorAll('[data-op]').forEach((el) => { el.textContent = brl2(dados.operacional[el.dataset.op]); });
}

// ------------------------------------------------------------ orçamento

function montarCenarios() {
  const escala = Math.max(TETO, ...cenarios.map((c) => dados.totais[c.id].total)) * 1.04;
  $('#cenarios').innerHTML = cenarios.map((c) => {
    const t = dados.totais[c.id];
    const folga = TETO - t.total;
    const comp = Object.entries(TIPOS).map(([tipo, info]) => {
      const v = t.por_tipo[tipo] || 0;
      return v ? `<span style="width:${(v / t.subtotal) * 100}%;background:${info.cor}" title="${info.rotulo}: ${mil(v)}"></span>` : '';
    }).join('');
    const comFonte = ['Real', 'Real (busca)', 'Referência', 'Estimativa sobre preço real']
      .reduce((s, k) => s + (t.por_tipo[k] || 0), 0) / t.subtotal;
    return `
      <article class="cenario ${c.id}">
        ${c.id === 'recomendado' ? '<span class="fita">Recomendado</span>' : ''}
        <h3>${esc(c.nome)}</h3>
        <div class="total">${mi(t.total)}</div>
        <p>${esc(c.resumo)}</p>
        <div class="teto" aria-hidden="true"><i class="${folga < 0 ? 'acima' : ''}" style="width:${(t.total / escala) * 100}%"></i><em style="left:${(TETO / escala) * 100}%"></em></div>
        <div class="folga ${folga < 0 ? 'acima' : 'ok'}">${folga < 0 ? `Acima do teto de R$ 2 mi em ${mi(-folga)}` : `Folga de ${mil(folga)} em relação ao teto de R$ 2 mi`}</div>
        <div class="composicao">${comp}</div>
        <div class="comp-legenda">${Math.round(comFonte * 100)}% do valor dos itens tem preço real, de referência oficial ou de importado com preço de origem. O restante é estimativa.</div>
      </article>`;
  }).join('');
}

function montarTabelaGrupos() {
  const cab = `<thead><tr><th>Grupo</th>${cenarios.map((c) => `<th>${esc(c.nome)}</th>`).join('')}</tr></thead>`;
  const linhas = dados.grupos.map((g) => `<tr><td>${esc(g.nome)}</td>${cenarios.map((c) => {
    const v = dados.totais[c.id].grupos[g.id];
    return `<td class="${c.id === 'recomendado' ? 'recom' : ''}">${v ? brl(v) : '-'}</td>`;
  }).join('')}</tr>`).join('');
  const linha = (rotulo, campo, classe) => `<tr class="${classe}"><td>${rotulo}</td>${cenarios.map((c) =>
    `<td class="${c.id === 'recomendado' && classe !== 'total' ? 'recom' : ''}">${brl(dados.totais[c.id][campo])}</td>`).join('')}</tr>`;
  $('#tabela-grupos').innerHTML = cab + '<tbody>' + linhas +
    linha('Subtotal', 'subtotal', 'sub') +
    linha(`BDI e administração da obra (${dados.bdi * 100}% sobre obra civil)`, 'bdi', 'sub') +
    linha(`Contingência (${dados.contingencia * 100}%)`, 'contingencia', 'sub') +
    linha('Total', 'total', 'total') + '</tbody>';
}

function montarItens(ativo) {
  $('#abas-itens').innerHTML = cenarios.map((c) =>
    `<button role="tab" type="button" aria-selected="${c.id === ativo}" data-cenario="${c.id}">${esc(c.nome)}</button>`).join('');
  $('#abas-itens').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => montarItens(b.dataset.cenario)));
  const itens = dados.itens[ativo];
  $('#itens-lista').innerHTML = dados.grupos.map((g) => {
    const doGrupo = itens.filter((i) => i.grupo === g.id);
    if (!doGrupo.length) return '';
    const soma = doGrupo.reduce((s, i) => s + i.qtd * i.unitario, 0);
    return `<details class="itens-grupo">
      <summary><span>${esc(g.nome)}</span><span>${brl(soma)}</span></summary>
      ${doGrupo.map((i) => {
        const tipo = TIPOS[i.tipo] || TIPOS.Estimativa;
        const link = i.link ? ` · <a href="${esc(i.link)}" target="_blank" rel="noopener">fonte</a>` : '';
        return `<div class="item">
          <div><div class="desc">${esc(i.descricao)}</div>
            <div class="meta">${esc(i.fornecedor)} · <span class="selo ${tipo.classe}">${tipo.rotulo}</span></div></div>
          <div class="valor">${brl(i.qtd * i.unitario)}<small>${num(i.qtd, 2)} ${esc(i.un)} x ${brl2(i.unitario)}</small></div>
          <div class="base">${esc(i.base)}${i.base ? '. ' : ''}Consulta em ${esc(i.data)}${link}</div>
        </div>`;
      }).join('')}
    </details>`;
  }).join('');
}

// ------------------------------------------------------------ equipamentos

function montarEquipamentos() {
  $('#lista-equip').innerHTML = EQUIPAMENTOS.map((eq, i) => {
    const precos = cenarios.map((c) => {
      const v = dados.totais[c.id].por_chave[eq.chave] || 0;
      return `<div><small>${esc(c.nome)}</small><b>${v ? mil(v) : 'Não incluso'}</b></div>`;
    }).join('');
    return `<article class="cartao">
      <h3><span class="num">${i + 1}</span>${esc(eq.nome)}</h3>
      <p>${esc(eq.funcao)}</p>
      <ul>${eq.specs.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
      ${NOTA_CHAVE[eq.chave] ? `<p class="nota" style="margin:-6px 0 10px">${NOTA_CHAVE[eq.chave]}</p>` : ''}
      <div class="precos-eq">${precos}</div>
    </article>`;
  }).join('');
}

// ------------------------------------------------------------ planta baixa (SVG)

function plantaSVG(vertical) {
  const S = 40;
  const M = vertical ? { l: 92, t: 66, r: 84, b: 56 } : { l: 30, t: 92, r: 124, b: 86 };
  const larg = vertical ? M.l + 7 * S + M.r : M.l + 25 * S + M.r;
  const alt = vertical ? M.t + 25 * S + M.b : M.t + 7 * S + M.b;
  // (x ao longo, d a partir do muro) para a tela
  const P = (x, d) => vertical ? [M.l + d * S, M.t + (25 - x) * S] : [M.l + x * S, M.t + d * S];
  const R = (x, d, w, p) => vertical ? [M.l + d * S, M.t + (25 - x - w) * S, p * S, w * S] : [M.l + x * S, M.t + d * S, w * S, p * S];
  const rect = (x, d, w, p, attrs) => { const [a, b, c, e] = R(x, d, w, p); return `<rect x="${a}" y="${b}" width="${c}" height="${e}" ${attrs}/>`; };
  const texto = (x, d, t, attrs = '') => { const [a, b] = P(x, d); return `<text x="${a}" y="${b}" ${attrs}>${esc(t)}</text>`; };
  const linha = (x1, d1, x2, d2, attrs) => { const [a, b] = P(x1, d1), [c, e] = P(x2, d2); return `<line x1="${a}" y1="${b}" x2="${c}" y2="${e}" ${attrs}/>`; };
  const E = Object.fromEntries(EQUIPAMENTOS.map((e, i) => [e.id, { ...e, n: i + 1 }]));
  const bar = EXISTENTES.find((e) => e.id === 'bar');
  const relogio = EXISTENTES.find((e) => e.id === 'relogio');
  const canteiro = EXISTENTES.find((e) => e.id === 'canteiro');
  const o = [];

  o.push(`<defs>
    <pattern id="hach${vertical ? 'v' : 'h'}" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="8" stroke="#c8102e" stroke-opacity=".18" stroke-width="3"/></pattern>
    <marker id="seta${vertical ? 'v' : 'h'}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M1 1L9 5L1 9" fill="none" stroke="#c8102e" stroke-width="1.8"/></marker>
  </defs>`);
  // Bar existente (parcial) e muro
  o.push(rect(bar.x, -1.6, bar.w, 1.6, 'fill="#e9e5de" stroke="#8a857c" stroke-dasharray="5 4"'));
  o.push(texto(bar.x + bar.w / 2, -0.8, vertical ? 'Bar' : 'Bar (mantido)', 'class="t-peq" text-anchor="middle" dominant-baseline="middle"'));
  o.push(rect(0, 0, 25, 7, 'fill="#fbfaf7" stroke="#2b2e33" stroke-width="1.5"'));
  for (const z of ZONAS) o.push(rect(z.x0, 0, z.x1 - z.x0, 7, `fill="${z.cor}" fill-opacity=".38"`));
  o.push(rect(CORREDOR.x0, CORREDOR.d0, CORREDOR.x1 - CORREDOR.x0, CORREDOR.d1 - CORREDOR.d0, `fill="url(#hach${vertical ? 'v' : 'h'})"`));
  o.push(linha(0, 0, bar.x, 0, 'stroke="#6f6a62" stroke-width="5"'));
  o.push(linha(bar.x + bar.w, 0, 25, 0, 'stroke="#6f6a62" stroke-width="5"'));
  o.push(linha(0, 7, 25, 7, 'stroke="#9aa3ab" stroke-width="3"'));
  o.push(linha(E.painel.x, 7, 25, 7, 'stroke="#5b3a26" stroke-width="5"'));

  // Existentes
  o.push(rect(canteiro.x, canteiro.d, canteiro.w, canteiro.p, 'fill="#cdd6a3" stroke="#8a9a3a"'));
  o.push(rect(relogio.x, relogio.d, relogio.w, relogio.p, 'fill="#6f6a62"'));
  o.push(texto(relogio.x + relogio.w / 2, relogio.d + relogio.p + 0.5, 'Relógio', 'class="t-peq" text-anchor="middle"'));

  // Equipamentos
  const quente = 'fill="#f4d9cf" stroke="#c4572f" stroke-width="1.3"';
  for (const id of ['seca', 'vapor', 'ir']) o.push(rect(E[id].x, E[id].d, E[id].w, E[id].p, quente));
  for (const u of E.banheiras.unidades) o.push(rect(u.x, u.d, u.w, u.p, `fill="${u.temp === '5 °C' ? '#9ccbe8' : '#bfe0ee'}" stroke="#2f7fb0" stroke-width="1.3" rx="4"`));
  o.push(rect(E.pergolado.x, E.pergolado.d, E.pergolado.w, E.pergolado.p, 'fill="none" stroke="#2f3134" stroke-dasharray="6 4"'));
  o.push(rect(11.1, 0, 2.8, 0.3, 'fill="#3a3a3a"'));
  for (const id of ['armarios', 'maquinas', 'bebedouro']) o.push(rect(E[id].x, E[id].d, E[id].w, E[id].p, 'fill="#d9d4cb" stroke="#8a857c"'));
  for (let i = 0; i < 4; i++) o.push(rect(0.41 + i * 1.25, 4.9, 0.68, 1.9, 'fill="#fff" stroke="#8a857c"'));
  o.push(rect(0.5, 2.78, 2.0, 0.85, 'fill="#fff" stroke="#8a857c"'));
  o.push(rect(2.9, 2.78, 2.0, 0.85, 'fill="#fff" stroke="#8a857c"'));
  for (const id of ['balde', 'contraste', 'cascata', 'acessivel', 'higienizacao']) {
    const e = E[id]; const [cx, cy] = P(e.x + e.w / 2, e.d + e.p / 2);
    o.push(`<circle cx="${cx}" cy="${cy}" r="9" fill="#e6eef3" stroke="#3b6a84" stroke-width="1.2"/>`);
  }
  if (!vertical) {
    o.push(texto(E.seca.x + E.seca.w / 2, 1.55, 'Sauna seca', 'class="t-eq" text-anchor="middle"'));
    o.push(texto(E.seca.x + E.seca.w / 2, 2.05, '13,5 m²', 'class="t-peq" text-anchor="middle"'));
    o.push(texto(E.vapor.x + E.vapor.w / 2, 1.35, 'Vapor', 'class="t-eq" text-anchor="middle"'));
    o.push(texto(E.vapor.x + E.vapor.w / 2, 1.85, '7,5 m²', 'class="t-peq" text-anchor="middle"'));
  } else {
    o.push(texto(E.seca.x + E.seca.w / 2, 1.55, 'Seca', 'class="t-eq" text-anchor="middle"'));
    o.push(texto(E.vapor.x + E.vapor.w / 2, 1.35, 'Vapor', 'class="t-eq" text-anchor="middle"'));
  }

  // Fluxo e entrada
  o.push(linha(24.4, 5.15, 5.9, 5.15, `stroke="#c8102e" stroke-width="2" stroke-dasharray="7 5" marker-end="url(#seta${vertical ? 'v' : 'h'})"`));
  o.push(linha(26.6, 5.15, 25.25, 5.15, `stroke="#c8102e" stroke-width="2.5" marker-end="url(#seta${vertical ? 'v' : 'h'})"`));
  o.push(texto(vertical ? 26.25 : 26.3, vertical ? 5.15 : 4.55, 'Entrada', `class="t-eq" fill="#c8102e" text-anchor="${vertical ? 'end' : 'middle'}" ${vertical ? 'dx="-16" dominant-baseline="middle"' : ''}`));

  // Nomes das zonas na faixa do corredor
  for (const z of ZONAS) {
    const nome = vertical ? z.nome.split(' ')[0] : z.nome;
    o.push(texto((z.x0 + z.x1) / 2, 6.3, nome.toUpperCase(), 'class="t-zona" text-anchor="middle" dominant-baseline="middle"'));
  }

  // Números
  const posNum = { pergolado: [5.85, 0.85], painel: [16, 7], lounge: [2.75, 4.35], banheiras: [8.25, 1.3], seca: [17.9, 0.85], vapor: [21.4, 0.8], maquinas: [24.35, 1.25] };
  for (const e of Object.values(E)) {
    const [x, d] = posNum[e.id] || [e.x + e.w / 2, e.d + e.p / 2];
    const [cx, cy] = P(x, d);
    o.push(`<g><circle cx="${cx}" cy="${cy}" r="11" fill="#c8102e"/><text x="${cx}" y="${cy}" class="t-num" text-anchor="middle" dominant-baseline="central">${e.n}</text></g>`);
  }

  // Cotas e lados
  if (!vertical) {
    const y = M.t + 7 * S + 52;
    o.push(`<line x1="${M.l}" y1="${y}" x2="${M.l + 25 * S}" y2="${y}" stroke="#2b2e33"/>`);
    o.push(`<line x1="${M.l}" y1="${y - 6}" x2="${M.l}" y2="${y + 6}" stroke="#2b2e33"/><line x1="${M.l + 25 * S}" y1="${y - 6}" x2="${M.l + 25 * S}" y2="${y + 6}" stroke="#2b2e33"/>`);
    o.push(`<text x="${M.l + 12.5 * S}" y="${y - 7}" class="t-cota" text-anchor="middle">25 m</text>`);
    const x = M.l + 25 * S + 82;
    o.push(`<line x1="${x}" y1="${M.t}" x2="${x}" y2="${M.t + 7 * S}" stroke="#2b2e33"/>`);
    o.push(`<text x="${x + 6}" y="${M.t + 3.5 * S}" class="t-cota" dominant-baseline="middle">7 m</text>`);
    o.push(`<text x="${M.l}" y="${M.t + 7 * S + 24}" class="t-peq">Guarda-corpo com painel de privacidade, vista para o playground</text>`);
    o.push(`<text x="${M.l}" y="${M.t - 10}" class="t-peq">Muro</text>`);
  } else {
    const x = M.l + 7 * S + 30;
    o.push(`<line x1="${x}" y1="${M.t}" x2="${x}" y2="${M.t + 25 * S}" stroke="#2b2e33"/>`);
    o.push(`<text x="${x + 6}" y="${M.t + 12.5 * S}" class="t-cota" dominant-baseline="middle">25 m</text>`);
    const y = M.t + 25 * S + 22;
    o.push(`<line x1="${M.l}" y1="${y}" x2="${M.l + 7 * S}" y2="${y}" stroke="#2b2e33"/>`);
    o.push(`<text x="${M.l + 3.5 * S}" y="${y + 18}" class="t-cota" text-anchor="middle">7 m</text>`);
    o.push(`<text x="${M.l - 8}" y="${M.t + 22 * S}" class="t-peq" text-anchor="end">Muro</text>`);
  }

  return `<svg class="planta-svg ${vertical ? 'vertical' : 'horizontal'}" viewBox="0 0 ${larg} ${alt}" role="img" aria-label="Planta baixa do espaço wellness com zonas, equipamentos e fluxo do circuito">
    <style>
      .t-peq{font:500 12px Inter,sans-serif;fill:#5d6168}
      .t-eq{font:700 14px Inter,sans-serif;fill:#7a2f17}
      .t-zona{font:800 12px Inter,sans-serif;fill:#2b2e33;letter-spacing:.08em;paint-order:stroke;stroke:#fbfaf7;stroke-width:4px}
      .t-num{font:700 11px Inter,sans-serif;fill:#fff}
      .t-cota{font:700 13px Inter,sans-serif;fill:#2b2e33}
    </style>
    ${o.join('\n')}
  </svg>`;
}

function montarPlanta() {
  $('#planta-h').innerHTML = plantaSVG(false);
  $('#planta-v').innerHTML = plantaSVG(true);
  $('#legenda-planta').innerHTML = EQUIPAMENTOS.map((e, i) => `<li><b>${i + 1}</b><span>${esc(e.nome)}</span></li>`).join('');
}

function montarCapacidade() {
  const total = CAPACIDADE.reduce((s, c) => s + c.lugares, 0);
  $('#capacidade').innerHTML = `<thead><tr><th>Equipamento</th><th>Lugares</th></tr></thead><tbody>${
    CAPACIDADE.map((c) => `<tr><td>${esc(c.item)}</td><td>${c.lugares}</td></tr>`).join('')}</tbody>
    <tfoot><tr><td>Total de lugares (Recomendado)</td><td>${total}</td></tr>
    <tr><td>Lotação confortável simultânea</td><td>cerca de 30</td></tr></tfoot>`;
}

// ------------------------------------------------------------ cronograma

function montarGantt() {
  const semanas = 40;
  const meses = Array.from({ length: 10 }, (_, i) => `<span>Mês ${i + 1}</span>`).join('');
  const linhas = dados.cronograma.map((t) => `
    <div class="gantt-rotulo">${esc(t.tarefa)}</div>
    <div class="gantt-faixa"><div class="gantt-barra fase-${t.fase}" style="left:${((t.inicio - 1) / semanas) * 100}%;width:${(t.duracao / semanas) * 100}%"
      title="Semanas ${t.inicio} a ${t.inicio + t.duracao - 1}">${t.duracao > 1 ? `${t.duracao} sem` : ''}</div></div>`).join('');
  $('#gantt').innerHTML = `<div class="gantt-grade">
    <div class="gantt-rotulo gantt-cab">Fase</div><div class="gantt-cab gantt-meses">${meses}</div>
    ${linhas}
  </div>`;
}

// ------------------------------------------------------------ custo operacional

function montarOperacional() {
  const op = dados.operacional;
  const tabela = (titulo, cabs, linhas, total) => `
    <div class="tabela-rolagem" style="margin-bottom:16px"><table class="tabela">
      <thead><tr><th>${titulo}</th>${cabs.map((c) => `<th>${c}</th>`).join('')}</tr></thead>
      <tbody>${linhas}<tr class="sub"><td>Total</td>${cabs.slice(1).map(() => '<td></td>').join('')}<td>${brl(total)}</td></tr></tbody>
    </table></div>`;
  const energia = op.energia.map((e) => `<tr><td>${esc(e.nome)}</td><td>${num(e.kw, 2)} kW</td><td>${Math.round(e.uso * 100)}%</td><td>${e.horas} h</td><td>${num(e.kwh_mes)} kWh</td><td>${brl(e.custo)}</td></tr>`).join('');
  const agua = op.agua.map((a) => `<tr><td>${esc(a.nome)}</td><td>${num(a.m3_mes)} m³</td><td>${brl(a.custo)}</td></tr>`).join('');
  const fixos = op.fixos.map((f) => `<tr><td>${esc(f.nome)}</td><td>${f.postos ? num(f.postos, 1) + ' posto(s)' : 'verba'}</td><td>${brl(f.custo)}</td></tr>`).join('');
  $('#operacional-conteudo').innerHTML = `
    <div class="grade g4" style="margin:28px 0 22px">
      <div class="cartao"><span class="destaque">${brl(op.total_mes)}</span><span class="nota">por mês, no total</span></div>
      <div class="cartao"><span class="destaque">${brl2(op.por_socio_mes)}</span><span class="nota">por sócio por mês (${num(op.socios)} sócios)</span></div>
      <div class="cartao"><span class="destaque">${brl2(op.por_visita)}</span><span class="nota">por visita, com cerca de 170 visitas por dia</span></div>
      <div class="cartao"><span class="destaque">${num(op.kwh_mes)} kWh</span><span class="nota">de energia por mês</span></div>
    </div>
    ${tabela('Energia', ['Potência', 'Uso', 'Horas/dia', 'Consumo', 'R$/mês'], energia, op.total_energia)}
    ${tabela('Água e esgoto', ['Volume', 'R$/mês'], agua, op.total_agua)}
    ${tabela('Pessoal e manutenção', ['Base', 'R$/mês'], fixos, op.total_fixos)}
    <div class="cartao"><h3>Premissas</h3><ul class="lista">${op.premissas.map((p) =>
      `<li><b>${esc(p.nome)}:</b> ${num(p.valor, 2)}. ${esc(p.base)}${p.link ? ` (<a href="${esc(p.link)}" target="_blank" rel="noopener">fonte</a>)` : ''}</li>`).join('')}
      <li>Fora do total: lavanderia de toalhas, se o clube fornecer (cerca de R$ 2,50 por visita). Parte da água das duchas já é consumida hoje pelos sócios na piscina.</li>
    </ul></div>`;
}

// ------------------------------------------------------------ fontes

function montarFontes() {
  const vistos = new Map();
  for (const c of cenarios) for (const i of dados.itens[c.id]) {
    if (i.link && !vistos.has(i.link)) vistos.set(i.link, `${i.fornecedor}: ${i.descricao}`);
  }
  const lista = (itens) => `<ul>${itens.map(([url, rotulo]) => `<li><a href="${esc(url)}" target="_blank" rel="noopener">${esc(rotulo)}</a></li>`).join('')}</ul>`;
  const oficiais = [
    ['https://sindusconsp.com.br/servicos/cub/', 'SindusCon-SP: CUB R8-N de setembro de 2026 (R$ 2.238,58/m²)'],
    ['https://orcamentor.com/composicao/98546/', 'SINAPI 09/2026: composições de impermeabilização, revestimento e mão de obra'],
    ['https://prefeitura.sp.gov.br/documents/d/licenciamento/tabela_fev-2026_definitiva-pdf', 'Prefeitura de São Paulo: tabela de taxas de licenciamento de 2026'],
    ['https://www.legisweb.com.br/legislacao/?id=357293', 'Taxas do Corpo de Bombeiros de São Paulo (Lei 15.266/2013)'],
    ['https://www.enel.com.br/pt-saopaulo/midia/press/d202607-aneel-aprova-reajuste-tarifario-da-enel-sp-novo-valor-passa-a-valer-a-partir-de-julho.html', 'Enel SP: reajuste tarifário de julho de 2026'],
    ['https://calculadoraenergia.com.br/tarifa/enel-sp', 'Tarifa B3 da Enel SP (TUSD e TE)'],
    ['https://www.arsesp.sp.gov.br/Documentosgerais/NT_1__REAJUSTE_TARIFARIO_DA_SABESP__Tarifa_Aplicacao___URAE1___assinado.pdf', 'ARSESP: tarifas da Sabesp a partir de janeiro de 2026'],
    ['https://www.bcb.gov.br/estabilidadefinanceira/historicocotacoes', 'Banco Central: cotações PTAX'],
    ['https://prefeitura.sp.gov.br/web/saude/w/vigilancia_em_saude/198548', 'COVISA: segurança e manutenção de piscinas e saunas de uso coletivo'],
  ];
  const benchmark = [
    ['https://www.othership.us', 'Othership (Toronto e Nova York)'],
    ['https://bathhouse.com', 'Bathhouse (Nova York e Filadélfia)'],
    ['https://www.remedyplace.com', 'Remedy Place'],
    ['https://beaire.com', 'AIRE Ancient Baths'],
    ['https://therme.ro', 'Therme București'],
    ['https://www.loylyhelsinki.fi', 'Löyly Helsinki'],
    ['https://thesmartlocal.com/read/the-ice-bath-club-singapore/', 'The Ice Bath Club (Singapura)'],
    ['https://www.spaopportunities.com/spa-news/Arc-unveils-flagship-communal-contrast-therapy-club-in-Canary-Wharf-second-London-site-set-for-2025/354979', 'Arc (Londres)'],
    ['https://community-sauna.co.uk', 'Community Sauna Baths (Londres)'],
    ['https://kontrast.com.br', 'Kontrast (São Paulo)'],
    ['https://recoverybody.com.br', 'Recovery Body (studio de contraste no Brasil)'],
    ['https://forbes.com.br/forbes-life/2026/10/as-20-melhores-saunas-do-mundo-segundo-a-forbes-brasil/', 'Forbes Brasil: as 20 melhores saunas do mundo (2026)'],
  ];
  $('#fontes-lista').innerHTML =
    `<h3>Benchmark</h3>${lista(benchmark)}` +
    `<h3>Tabelas oficiais, índices e normas</h3>${lista(oficiais)}` +
    `<h3>Preços de equipamentos, materiais e serviços</h3>${lista([...vistos.entries()])}`;
}

// ------------------------------------------------------------ interações

function ligarAntesDepois() {
  const fotos = { 1: '01-entrada', 2: '02-deck-relogio', 3: '03-deck-mirante', 4: '04-gramado' };
  const abas = document.querySelectorAll('#abas-ad button');
  abas.forEach((b) => b.addEventListener('click', () => {
    abas.forEach((x) => x.setAttribute('aria-selected', String(x === b)));
    $('#ad-antes').src = `img/atual/${fotos[b.dataset.foto]}.jpg`;
    $('#ad-depois').src = `img/render/foto${b.dataset.foto}.jpg`;
  }));
}

function ligarTour() {
  $('#tour-carregar').addEventListener('click', () => {
    const f = document.createElement('iframe');
    f.src = '3d/?embed=1';
    f.title = 'Tour 3D do Espaço Wellness';
    f.allow = 'fullscreen';
    $('#tour-moldura').appendChild(f);
    $('#tour-capa').remove();
  });
}

function ligarMenu() {
  const links = new Map([...document.querySelectorAll('.menu a')].map((a) => [a.getAttribute('href').slice(1), a]));
  const obs = new IntersectionObserver((entradas) => {
    for (const e of entradas) {
      if (!e.isIntersecting) continue;
      links.forEach((a) => a.classList.remove('ativo'));
      const a = links.get(e.target.id);
      if (a) {
        a.classList.add('ativo');
        const menu = a.parentElement;
        menu.scrollTo({ left: a.offsetLeft - menu.clientWidth / 2 + a.clientWidth / 2, behavior: 'smooth' });
      }
    }
  }, { rootMargin: '-45% 0px -50% 0px' });
  document.querySelectorAll('main section[id]').forEach((s) => obs.observe(s));
}
