// Tour 3D do Espaço Wellness (Three.js via CDN, sem build).
// Usado em /3d/ (página própria) e dentro do site por iframe (?embed=1).

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { EXISTENTES, EQUIPAMENTOS, VISTAS_FOTO } from './layout.js';

// Planta (X ao longo, D a partir do muro) para o mundo 3D, centrado no deck.
const WX = (x) => x - 12.5;
const WZ = (d) => d - 3.5;
const NIVEL_PLAYGROUND = -2.6;
const ehToque = matchMedia('(pointer: coarse)').matches;

const fmtMil = (v) => 'R$ ' + Math.round(v / 1000).toLocaleString('pt-BR') + ' mil';

export async function criarTour(container, opcoes = {}) {
  const ui = opcoes.ui || {};
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, ehToque ? 1.5 : 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);
  const canvas = renderer.domElement;
  canvas.style.touchAction = 'none';
  const maxAniso = renderer.capabilities.getMaxAnisotropy();

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.background = texturaCeu();
  scene.fog = new THREE.Fog(0xdfe7ec, 60, 150);

  // ------------------------------------------------------------ texturas

  function telaCanvas(w, h, desenhar) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    desenhar(c.getContext('2d'), w, h);
    return c;
  }
  function tex(c, srgb = true) {
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = maxAniso;
    return t;
  }
  function ruido(g, w, h, n, cores, tam = 1.5) {
    for (let i = 0; i < n; i++) {
      g.fillStyle = cores[(Math.random() * cores.length) | 0];
      g.globalAlpha = 0.05 + Math.random() * 0.12;
      g.fillRect(Math.random() * w, Math.random() * h, tam + Math.random() * tam, tam + Math.random() * tam);
    }
    g.globalAlpha = 1;
  }
  function texturaCeu() {
    const c = telaCanvas(4, 256, (g, w, h) => {
      const grad = g.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#9fc3dd');
      grad.addColorStop(0.55, '#d5e4ee');
      grad.addColorStop(1, '#eef1ef');
      g.fillStyle = grad;
      g.fillRect(0, 0, w, h);
    });
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  // Madeira em réguas. 1 unidade de textura = 1 m.
  function texMadeira(base, variacoes, regua = 0.145, vertical = false) {
    const c = telaCanvas(512, 512, (g, w, h) => {
      const n = Math.round(1 / regua);
      const passo = h / n;
      for (let i = 0; i < n; i++) {
        g.fillStyle = variacoes[(Math.random() * variacoes.length) | 0];
        g.fillRect(0, i * passo, w, passo);
        for (let k = 0; k < 14; k++) {
          g.strokeStyle = `rgba(40,20,10,${0.05 + Math.random() * 0.08})`;
          g.lineWidth = 1 + Math.random() * 1.5;
          const y = i * passo + Math.random() * passo;
          g.beginPath();
          g.moveTo(0, y);
          g.bezierCurveTo(w * 0.3, y + (Math.random() - 0.5) * 6, w * 0.7, y + (Math.random() - 0.5) * 6, w, y);
          g.stroke();
        }
        g.fillStyle = 'rgba(20,10,5,0.55)';
        g.fillRect(0, i * passo, w, 2);
        const corte = Math.random() * w;
        g.fillRect(corte, i * passo, 2, passo);
      }
      ruido(g, w, h, 1500, [base]);
    });
    const t = tex(c);
    if (vertical) t.rotation = Math.PI / 2;
    return t;
  }
  function texPiso(base, rejunte, ladrilho = 0.9) {
    const c = telaCanvas(512, 512, (g, w, h) => {
      const n = Math.round(1.8 / ladrilho);
      const s = w / n;
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        const v = (Math.random() - 0.5) * 10;
        g.fillStyle = shade(base, v);
        g.fillRect(i * s, j * s, s, s);
      }
      ruido(g, w, h, 5000, ['#8a8478', '#ffffff', '#6f6a62'], 1.2);
      g.fillStyle = rejunte;
      for (let i = 0; i <= n; i++) {
        g.fillRect(i * s - 1, 0, 2, h);
        g.fillRect(0, i * s - 1, w, 2);
      }
    });
    return tex(c);
  }
  function texPedra(base, pontos) {
    const c = telaCanvas(512, 512, (g, w, h) => {
      g.fillStyle = base;
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < 40; i++) {
        g.fillStyle = pontos[i % pontos.length];
        g.globalAlpha = 0.06;
        g.fillRect(0, Math.random() * h, w, 2 + Math.random() * 10);
      }
      g.globalAlpha = 1;
      ruido(g, w, h, 9000, pontos, 1.4);
    });
    return tex(c);
  }
  function texPastilha(base) {
    const c = telaCanvas(256, 256, (g, w, h) => {
      const n = 20, s = w / n;
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        g.fillStyle = shade(base, (Math.random() - 0.5) * 18);
        g.fillRect(i * s + 1, j * s + 1, s - 2, s - 2);
      }
    });
    return tex(c);
  }
  function texGrama(base) {
    const c = telaCanvas(256, 256, (g, w, h) => {
      g.fillStyle = base;
      g.fillRect(0, 0, w, h);
      ruido(g, w, h, 12000, ['#2f6b2a', '#5aa04a', '#3f8a35', '#7cc062'], 1);
    });
    return tex(c);
  }
  function texRelogio() {
    const c = telaCanvas(256, 256, (g, w) => {
      g.fillStyle = '#8f8d88';
      g.fillRect(0, 0, w, w);
      g.fillStyle = '#f7f5ef';
      g.beginPath(); g.arc(128, 128, 110, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#333'; g.lineWidth = 4;
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        g.beginPath();
        g.moveTo(128 + Math.cos(a) * 92, 128 + Math.sin(a) * 92);
        g.lineTo(128 + Math.cos(a) * 104, 128 + Math.sin(a) * 104);
        g.stroke();
      }
      g.lineWidth = 7; g.lineCap = 'round';
      g.beginPath(); g.moveTo(128, 128); g.lineTo(128 + Math.cos(-2.6) * 58, 128 + Math.sin(-2.6) * 58); g.stroke();
      g.lineWidth = 4;
      g.beginPath(); g.moveTo(128, 128); g.lineTo(128 + Math.cos(-0.5) * 86, 128 + Math.sin(-0.5) * 86); g.stroke();
    });
    return tex(c);
  }
  function texTexto(texto, fundo, cor, w = 512, h = 128, tamanho = 64) {
    const c = telaCanvas(w, h, (g) => {
      g.fillStyle = fundo; g.fillRect(0, 0, w, h);
      g.fillStyle = cor;
      g.font = `600 ${tamanho}px Inter, Arial, sans-serif`;
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(texto, w / 2, h / 2 + 2);
    });
    const t = tex(c);
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    return t;
  }
  function texArmarios() {
    const c = telaCanvas(512, 384, (g, w, h) => {
      g.fillStyle = '#5b4636'; g.fillRect(0, 0, w, h);
      const cols = 6, rows = 4, mw = w / cols, mh = h / rows;
      for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
        g.fillStyle = shade('#c9b08f', (Math.random() - 0.5) * 8);
        g.fillRect(i * mw + 3, j * mh + 3, mw - 6, mh - 6);
        g.fillStyle = '#2a2a2a';
        g.fillRect(i * mw + mw - 18, j * mh + mh / 2 - 8, 6, 16);
      }
    });
    const t = tex(c);
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    return t;
  }
  function texVenezianas() {
    const c = telaCanvas(256, 256, (g, w, h) => {
      g.fillStyle = '#6b6f72'; g.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 10) {
        g.fillStyle = '#4b4f52'; g.fillRect(0, y, w, 4);
      }
    });
    return tex(c);
  }
  function texPaineisPredio() {
    const c = telaCanvas(256, 256, (g, w, h) => {
      g.fillStyle = '#c9cbc8'; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#a7aaa6'; g.lineWidth = 2;
      for (let i = 0; i <= 4; i++) {
        g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, h); g.stroke();
        g.beginPath(); g.moveTo(0, i * 64); g.lineTo(w, i * 64); g.stroke();
      }
      ruido(g, w, h, 1500, ['#ffffff', '#999999'], 1.5);
    });
    return tex(c);
  }
  function normalAgua() {
    const s = 128;
    const c = document.createElement('canvas');
    c.width = c.height = s;
    const g = c.getContext('2d');
    const img = g.createImageData(s, s);
    const altura = (x, y) =>
      Math.sin((x / s) * Math.PI * 2 * 3 + (y / s) * Math.PI * 2) * 0.5 +
      Math.sin((y / s) * Math.PI * 2 * 4 - (x / s) * Math.PI * 2 * 2) * 0.35 +
      Math.sin(((x + y) / s) * Math.PI * 2 * 5) * 0.15;
    for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
      const dx = altura(x + 1, y) - altura(x - 1, y);
      const dy = altura(x, y + 1) - altura(x, y - 1);
      const nx = -dx * 1.5, ny = -dy * 1.5, nz = 1;
      const l = Math.hypot(nx, ny, nz);
      const i = (y * s + x) * 4;
      img.data[i] = ((nx / l) * 0.5 + 0.5) * 255;
      img.data[i + 1] = ((ny / l) * 0.5 + 0.5) * 255;
      img.data[i + 2] = ((nz / l) * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    return tex(c, false);
  }
  function shade(hex, pct) {
    const n = parseInt(hex.slice(1), 16);
    const f = (v) => Math.max(0, Math.min(255, Math.round(v + (pct / 100) * 255)));
    return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
  }

  // ------------------------------------------------------------ materiais

  const M = {
    deckNovo: new THREE.MeshStandardMaterial({ map: texMadeira('#7a4f33', ['#7a4f33', '#6e462d', '#85573a', '#73492f']), roughness: 0.75 }),
    deckAntigo: new THREE.MeshStandardMaterial({ map: texMadeira('#7d3420', ['#7d3420', '#8c3d25', '#6f2d1b', '#94452a']), roughness: 0.55 }),
    piso: new THREE.MeshStandardMaterial({ map: texPiso('#cfc8bc', '#a59e92'), roughness: 0.82 }),
    termo: new THREE.MeshStandardMaterial({ map: texMadeira('#4a3122', ['#4a3122', '#3f2a1d', '#553827'], 0.12), roughness: 0.7 }),
    madeiraClara: new THREE.MeshStandardMaterial({ map: texMadeira('#c99d6b', ['#c99d6b', '#bf9262', '#d3a874'], 0.1), roughness: 0.65 }),
    pedraEscura: new THREE.MeshStandardMaterial({ map: texPedra('#3a3a3a', ['#555', '#222', '#4a4a48']), roughness: 0.6 }),
    pastilha: new THREE.MeshStandardMaterial({ map: texPastilha('#9fb4bd'), roughness: 0.35 }),
    concreto: new THREE.MeshStandardMaterial({ map: texPedra('#9b9a96', ['#888', '#aaa', '#7d7c78']), roughness: 0.95 }),
    muro: new THREE.MeshStandardMaterial({ map: texPedra('#b9b6ae', ['#a3a09a', '#cfccc4']), roughness: 0.95 }),
    branco: new THREE.MeshStandardMaterial({ color: 0xf2f2ef, roughness: 0.45 }),
    vidro: new THREE.MeshStandardMaterial({ color: 0xd8ecf2, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false }),
    vidroFosco: new THREE.MeshStandardMaterial({ color: 0xeef3f4, roughness: 0.3, transparent: true, opacity: 0.7, side: THREE.DoubleSide }),
    aluminio: new THREE.MeshStandardMaterial({ color: 0x2f3134, roughness: 0.45, metalness: 0.6 }),
    inox: new THREE.MeshStandardMaterial({ color: 0xc3c8cd, roughness: 0.32, metalness: 0.55 }),
    grafite: new THREE.MeshStandardMaterial({ color: 0x2b2e31, roughness: 0.4, metalness: 0.2 }),
    aguaFria: new THREE.MeshStandardMaterial({ color: 0x1f7fae, roughness: 0.04, metalness: 0.1, transparent: true, opacity: 0.9 }),
    aguaMorna: new THREE.MeshStandardMaterial({ color: 0x2a9aa8, roughness: 0.04, metalness: 0.1, transparent: true, opacity: 0.9 }),
    piscina: new THREE.MeshStandardMaterial({ color: 0x3aa6d0, roughness: 0.05, metalness: 0.1 }),
    cascataAgua: new THREE.MeshStandardMaterial({ color: 0xcfeaf5, roughness: 0.05, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }),
    grama: new THREE.MeshStandardMaterial({ map: texGrama('#4f9a3f'), roughness: 1 }),
    gramaSintetica: new THREE.MeshStandardMaterial({ map: texGrama('#43a33a'), roughness: 0.9 }),
    terracota: new THREE.MeshStandardMaterial({ map: texPiso('#b5603e', '#7d3f27', 0.6), roughness: 0.8 }),
    almofada: new THREE.MeshStandardMaterial({ color: 0xe6dccb, roughness: 0.95 }),
    vermelho: new THREE.MeshStandardMaterial({ color: 0xc8102e, roughness: 0.8 }),
    folha: new THREE.MeshStandardMaterial({ color: 0x3f7a35, roughness: 0.85, side: THREE.DoubleSide }),
    folhaVariegada: new THREE.MeshStandardMaterial({ color: 0xa8b04a, roughness: 0.85 }),
    folhaEscura: new THREE.MeshStandardMaterial({ color: 0x2f5f2b, roughness: 0.9 }),
    tronco: new THREE.MeshStandardMaterial({ color: 0x7b6d5d, roughness: 0.95 }),
    terra: new THREE.MeshStandardMaterial({ color: 0x5a4433, roughness: 1 }),
    brilhoQuente: new THREE.MeshBasicMaterial({ color: 0xffb36b }),
    brilhoInfra: new THREE.MeshBasicMaterial({ color: 0xff6a3a }),
    pedras: new THREE.MeshStandardMaterial({ color: 0x4b4b4b, roughness: 0.9 }),
    predio: new THREE.MeshStandardMaterial({ map: texPaineisPredio(), color: 0xb4b6b2, roughness: 0.9 }),
    venezianas: new THREE.MeshStandardMaterial({ map: texVenezianas(), roughness: 0.7, metalness: 0.3 }),
    barTijolo: new THREE.MeshStandardMaterial({ map: texPiso('#c9b79d', '#a6957c', 0.3), roughness: 0.9 }),
    roxo: new THREE.MeshStandardMaterial({ color: 0x9b4fb0, roughness: 0.6 }),
    amarelo: new THREE.MeshStandardMaterial({ color: 0xf2c230, roughness: 0.5 }),
    azul: new THREE.MeshStandardMaterial({ color: 0x2f62b5, roughness: 0.5 }),
    piso_playground: new THREE.MeshStandardMaterial({ color: 0x4e8f6a, roughness: 1 }),
  };
  const nAgua = normalAgua();
  nAgua.repeat.set(2, 2);
  for (const m of [M.aguaFria, M.aguaMorna, M.piscina]) {
    m.normalMap = nAgua;
    m.normalScale = new THREE.Vector2(0.25, 0.25);
  }

  // ------------------------------------------------------------ geometria

  // UV proporcional ao tamanho: a textura representa 1 m (ou `escala` m).
  function caixaUV(w, h, d, escala = 1) {
    const g = new THREE.BoxGeometry(w, h, d);
    const uv = g.attributes.uv;
    const faces = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
    for (let f = 0; f < 6; f++) for (let v = 0; v < 4; v++) {
      const i = f * 4 + v;
      uv.setXY(i, uv.getX(i) * faces[f][0] / escala, uv.getY(i) * faces[f][1] / escala);
    }
    return g;
  }
  function caixa(w, h, d, mat, x, y, z, pai = scene, escala = 1) {
    const m = new THREE.Mesh(caixaUV(w, h, d, escala), mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    pai.add(m);
    return m;
  }
  // Caixa a partir de um retângulo da planta (base no nível y0).
  function caixaPlanta(r, alt, mat, y0 = 0, pai = scene, escala = 1) {
    return caixa(r.w, alt, r.p, mat, WX(r.x + r.w / 2), y0 + alt / 2, WZ(r.d + r.p / 2), pai, escala);
  }
  function plano(w, d, mat, x, y, z, escala = 1) {
    const g = new THREE.PlaneGeometry(w, d);
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / escala, uv.getY(i) * d / escala);
    const m = new THREE.Mesh(g, mat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, y, z);
    m.receiveShadow = true;
    scene.add(m);
    return m;
  }
  function cilindro(rt, rb, h, mat, x, y, z, seg = 16, pai = scene) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    pai.add(m);
    return m;
  }
  function grupoEquip(id) {
    const g = new THREE.Group();
    g.userData.equipId = id;
    scene.add(g);
    return g;
  }

  // ------------------------------------------------------------ luz

  scene.add(new THREE.HemisphereLight(0xe3eef7, 0x8c7a63, 0.85));
  const sol = new THREE.DirectionalLight(0xfff0dc, 2.6);
  sol.position.set(-18, 26, 14);
  sol.target.position.set(0, 0, 0);
  sol.castShadow = true;
  sol.shadow.mapSize.set(ehToque ? 1024 : 2048, ehToque ? 1024 : 2048);
  Object.assign(sol.shadow.camera, { left: -26, right: 26, top: 18, bottom: -18, near: 1, far: 80 });
  sol.shadow.bias = -0.0004;
  sol.shadow.normalBias = 0.03;
  scene.add(sol, sol.target);

  // Ocultados no modo planta para mostrar o layout.
  const arvores = [], tetos = [];

  // ------------------------------------------------------------ entorno

  // Nível do deck e da piscina (y = 0) e nível do playground, mais baixo.
  plano(120, 70, M.concreto, -5, -0.03, -31.5, 2);
  plano(120, 50, M.grama, -5, NIVEL_PLAYGROUND, 28.6, 3);
  caixa(120, -NIVEL_PLAYGROUND, 0.3, M.concreto, -5, NIVEL_PLAYGROUND / 2, 3.75, scene, 2);
  plano(18, 9, M.piso_playground, -6, NIVEL_PLAYGROUND + 0.02, 10.5);

  // Solário da piscina (piso terracota) e piscina.
  plano(26, 22, M.terracota, -32.5, -0.01, -6);
  caixa(15, 0.12, 11.4, M.branco, -30, -0.06, -7.2);
  plano(14, 10.6, M.piscina, -30, 0.005, -7.2);
  // Gramado sintético existente (foto 4) com espreguiçadeiras atuais.
  plano(7, 7, M.gramaSintetica, WX(-3.5), 0.005, 0);
  for (let i = 0; i < 3; i++) espreguicadeira(WX(-6 + i * 1.8), WZ(3.2), 0, M.almofada, false);

  // Deck antigo nas pontas (fora da intervenção).
  plano(3.5, 4.0, M.deckAntigo, WX(26.75), 0.012, WZ(5.0));

  // Prédio do ginásio atrás do muro e prédios ao longe.
  caixa(34, 12, 12, M.predio, -2, 6, -18, scene, 4);
  caixa(22, 7, 14, M.branco, -40, 3.5, -22);
  for (const [x, z, h] of [[-60, -60, 38], [-30, -70, 52], [10, -75, 45], [40, -62, 30], [55, 40, 40], [-70, 30, 34]]) {
    caixa(14, h, 14, M.predio, x, h / 2, z, scene, 6);
  }

  // Muro ao longo do lado interno (D = 0), interrompido pelo bar.
  caixa(9, 2.4, 0.25, M.muro, WX(3.5), 1.2, WZ(-0.125));
  caixa(11, 2.4, 0.25, M.muro, WX(19.5), 1.2, WZ(-0.125));
  for (let x = 15; x < 25; x += 1.4) dracena(WX(x), WZ(-0.9), 2.2 + Math.random());

  // Bar existente (mantido).
  const bar = EXISTENTES.find((e) => e.id === 'bar');
  caixaPlanta({ ...bar, p: 2.6 }, 2.8, M.barTijolo);
  caixa(bar.w - 0.4, 1.1, 0.45, M.barTijolo, WX(bar.x + bar.w / 2), 0.55, WZ(-0.25));
  caixa(bar.w - 0.2, 0.06, 0.6, M.madeiraClara, WX(bar.x + bar.w / 2), 1.13, WZ(-0.25));
  tetos.push(caixa(bar.w + 0.6, 0.15, 3.8, M.aluminio, WX(bar.x + bar.w / 2), 2.95, WZ(-1.2)));
  const placaBar = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.5), new THREE.MeshStandardMaterial({ map: texTexto('BAR', '#2f3134', '#ffffff') }));
  placaBar.position.set(WX(bar.x + bar.w / 2), 2.6, WZ(0.71));
  scene.add(placaBar);

  // Torre do relógio (mantida) com canteiro de dracenas.
  const relogio = EXISTENTES.find((e) => e.id === 'relogio');
  const canteiro = EXISTENTES.find((e) => e.id === 'canteiro');
  caixaPlanta(canteiro, 0.45, M.concreto);
  plano(canteiro.w - 0.2, canteiro.p - 0.2, M.terra, WX(canteiro.x + canteiro.w / 2), 0.46, WZ(canteiro.d + canteiro.p / 2));
  caixaPlanta(relogio, 5.6, M.concreto);
  const faceRelogio = new THREE.MeshStandardMaterial({ map: texRelogio(), roughness: 0.6 });
  const topoRelogio = new THREE.Mesh(caixaUV(1.4, 1.4, 1.4), [faceRelogio, faceRelogio, M.concreto, M.concreto, faceRelogio, faceRelogio]);
  topoRelogio.position.set(WX(relogio.x + relogio.w / 2), 6.3, WZ(relogio.d + relogio.p / 2));
  topoRelogio.castShadow = true;
  scene.add(topoRelogio);
  for (const [dx, dd] of [[-0.9, -0.9], [0.9, -0.9], [-0.9, 0.9], [0.9, 0.9], [0, 1.0], [-1.0, 0]]) {
    dracena(WX(relogio.x + 0.6 + dx), WZ(relogio.d + 0.6 + dd), 2.4 + Math.random() * 0.8, 0.45);
  }

  // Guarda-corpo existente (branco com vidro) fora da área do painel.
  for (let x = -7; x < 5.5; x += 1.25) {
    caixa(0.05, 1.1, 0.05, M.branco, WX(x), 0.55, WZ(6.95));
    const v = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.95), M.vidro);
    v.position.set(WX(x + 0.625), 0.55, WZ(6.95));
    scene.add(v);
  }
  caixa(12.5, 0.05, 0.06, M.branco, WX(-0.75), 1.1, WZ(6.95));
  caixa(3.5, 0.05, 0.06, M.branco, WX(26.75), 1.1, WZ(6.95));
  for (let x = 25.2; x < 28.6; x += 1.15) caixa(0.05, 1.1, 0.05, M.branco, WX(x), 0.55, WZ(6.95));

  // Playground no nível de baixo (fotos 3 e 4).
  for (const [x, z] of [[-10, 9], [-6.5, 11.5], [-3, 9.5]]) {
    cilindro(0.08, 0.08, 2.6, M.azul, x, NIVEL_PLAYGROUND + 1.3, z);
    const cupula = new THREE.Mesh(new THREE.SphereGeometry(0.95, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), M.roxo);
    cupula.position.set(x, NIVEL_PLAYGROUND + 2.6, z);
    cupula.castShadow = true;
    scene.add(cupula);
    caixa(1.6, 0.1, 1.6, M.amarelo, x, NIVEL_PLAYGROUND + 1.4, z);
  }
  const curva = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-8.5, NIVEL_PLAYGROUND + 1.4, 9.5),
    new THREE.Vector3(-7.6, NIVEL_PLAYGROUND + 0.9, 7.6),
    new THREE.Vector3(-6.0, NIVEL_PLAYGROUND + 0.3, 7.0),
  ]);
  const escorregador = new THREE.Mesh(new THREE.TubeGeometry(curva, 24, 0.32, 12, false), M.amarelo);
  escorregador.castShadow = true;
  scene.add(escorregador);

  // Palmeiras e árvores.
  for (const [x, z, h] of [[-15, 5.6, 12], [-11.5, 6.4, 14], [11.5, 6.4, 14], [15, 5.6, 12],
    [-16, 13, 13], [17, 12, 15], [-4, 26, 12], [6, 28, 14]]) {
    palmeira(x, NIVEL_PLAYGROUND, z, h);
  }
  for (const [x, z] of [[-26, -15], [-21, 3.2], [-36, 3.5]]) palmeira(x, 0, z, 9);
  for (const [x, z, s] of [[22, 20, 3.2], [-24, 24, 3.6], [26, 10, 3], [-28, 12, 3.4], [2, 34, 3.6]]) arvoreCopa(x, NIVEL_PLAYGROUND, z, s);

  // Marquise da entrada (foto 1) e iúca.
  caixa(0.12, 3, 0.12, M.aluminio, WX(25.2), 1.5, WZ(3.7));
  caixa(0.12, 3, 0.12, M.aluminio, WX(25.2), 1.5, WZ(6.7));
  tetos.push(caixa(2.8, 0.25, 3.8, M.aluminio, WX(26.3), 3.05, WZ(5.2)));
  const placaEntrada = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 0.24), new THREE.MeshStandardMaterial({ map: texTexto('WELLNESS SÍRIO', '#2f3134', '#ffffff', 1024, 68, 46) }));
  placaEntrada.rotation.y = Math.PI / 2;
  placaEntrada.position.set(WX(27.71), 3.05, WZ(5.2));
  scene.add(placaEntrada);
  iuca(WX(26.6), WZ(2.2));

  // ------------------------------------------------------------ piso do projeto

  plano(5.5, 7, M.deckNovo, WX(2.75), 0.012, WZ(3.5));
  plano(19.5, 7, M.piso, WX(15.25), 0.012, WZ(3.5), 1.8);
  // Ralos lineares
  for (const [x, d, w] of [[11.2, 1.05, 2.6], [5.6, 4.0, 5.2], [11.6, 4.3, 1.6], [22.8, 4.3, 1.4]]) {
    caixa(w, 0.01, 0.08, M.inox, WX(x + w / 2), 0.018, WZ(d));
  }

  // ------------------------------------------------------------ equipamentos

  const E = Object.fromEntries(EQUIPAMENTOS.map((e) => [e.id, e]));

  // Sauna seca
  {
    const r = E.seca, g = grupoEquip('seca');
    const x0 = WX(r.x), x1 = WX(r.x + r.w), z0 = WZ(r.d), z1 = WZ(r.d + r.p), h = r.alt, cx = (x0 + x1) / 2;
    caixa(r.w, h, 0.12, M.termo, cx, h / 2, z0 + 0.06, g);
    caixa(0.12, h, r.p, M.termo, x0 + 0.06, h / 2, (z0 + z1) / 2, g);
    caixa(0.12, h, r.p, M.termo, x1 - 0.06, h / 2, (z0 + z1) / 2, g);
    tetos.push(caixa(r.w + 0.3, 0.14, r.p + 0.3, M.aluminio, cx, h + 0.07, (z0 + z1) / 2, g));
    caixa(r.w, 0.06, r.p, M.madeiraClara, cx, 0.03, (z0 + z1) / 2, g);
    // Frente de vidro com montantes e porta
    const vidro = new THREE.Mesh(new THREE.PlaneGeometry(r.w - 0.24, h), M.vidro);
    vidro.position.set(cx, h / 2, z1);
    g.add(vidro);
    for (const t of [0, 0.33, 0.66, 1]) caixa(0.06, h, 0.08, M.termo, x0 + 0.12 + t * (r.w - 0.24), h / 2, z1, g);
    caixa(r.w, 0.08, 0.1, M.termo, cx, 2.1, z1, g);
    caixa(0.04, 0.6, 0.04, M.inox, x1 - 0.55, 1.1, z1 + 0.06, g);
    // Bancos em 3 níveis e aquecedor
    for (const [k, prof] of [[0, 0.6], [1, 0.6], [2, 0.55]]) {
      const y = 0.45 + k * 0.42;
      const zb = z0 + 0.12 + prof / 2 + (2 - k) * 0.55;
      caixa(r.w - 1.0, 0.06, prof, M.madeiraClara, cx - 0.38, y, zb, g);
      caixa(r.w - 1.0, y - 0.06, 0.04, M.madeiraClara, cx - 0.38, (y - 0.06) / 2, zb + prof / 2, g);
      caixa(r.w - 1.0, 0.02, 0.02, M.brilhoQuente, cx - 0.38, y - 0.05, zb + prof / 2 - 0.03, g);
    }
    caixa(0.55, 0.75, 0.45, M.inox, x1 - 0.45, 0.4, z0 + 0.45, g);
    for (let i = 0; i < 14; i++) {
      const p = new THREE.Mesh(new THREE.DodecahedronGeometry(0.08 + Math.random() * 0.04), M.pedras);
      p.position.set(x1 - 0.45 + (Math.random() - 0.5) * 0.4, 0.82 + Math.random() * 0.12, z0 + 0.45 + (Math.random() - 0.5) * 0.3);
      g.add(p);
    }
    cilindro(0.1, 0.1, 0.5, M.aluminio, x1 - 0.5, h + 0.35, z0 + 0.4, 12, g);
    placa('SAUNA SECA  85 °C', cx, 2.32, z1 + 0.07, g);
  }

  // Sauna a vapor
  {
    const r = E.vapor, g = grupoEquip('vapor');
    const x0 = WX(r.x), x1 = WX(r.x + r.w), z0 = WZ(r.d), z1 = WZ(r.d + r.p), h = r.alt, cx = (x0 + x1) / 2;
    caixa(r.w, h, 0.15, M.pastilha, cx, h / 2, z0 + 0.075, g, 0.5);
    caixa(0.15, h, r.p, M.pastilha, x0 + 0.075, h / 2, (z0 + z1) / 2, g, 0.5);
    caixa(0.15, h, r.p, M.pastilha, x1 - 0.075, h / 2, (z0 + z1) / 2, g, 0.5);
    tetos.push(caixa(r.w + 0.3, 0.14, r.p + 0.3, M.aluminio, cx, h + 0.07, (z0 + z1) / 2, g));
    // Frente: parede de pastilha com porta de vidro fosco à esquerda
    caixa(r.w - 1.05, h, 0.15, M.pastilha, x0 + 0.9 + (r.w - 1.05) / 2, h / 2, z1 - 0.075, g, 0.5);
    caixa(0.75, 0.4, 0.15, M.pastilha, x0 + 0.525, h - 0.2, z1 - 0.075, g, 0.5);
    const porta = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 2.08), M.vidroFosco);
    porta.position.set(x0 + 0.525, 1.04, z1 - 0.02);
    g.add(porta);
    caixa(0.04, 0.5, 0.04, M.inox, x0 + 0.8, 1.05, z1 + 0.03, g);
    cilindro(0.08, 0.08, 0.45, M.inox, cx + 0.8, h + 0.3, z0 + 0.5, 12, g);
    placa('VAPOR  45 °C', x0 + 1.9, 2.0, z1 + 0.01, g);
  }

  // Sauna infravermelha (em abrigo fechado)
  {
    const r = E.ir, g = grupoEquip('ir');
    const x0 = WX(r.x), x1 = WX(r.x + r.w), z0 = WZ(r.d), z1 = WZ(r.d + r.p), h = r.alt, cx = (x0 + x1) / 2;
    caixa(r.w, h, 0.1, M.madeiraClara, cx, h / 2, z0 + 0.05, g);
    caixa(0.1, h, r.p, M.madeiraClara, x0 + 0.05, h / 2, (z0 + z1) / 2, g);
    caixa(0.1, h, r.p, M.madeiraClara, x1 - 0.05, h / 2, (z0 + z1) / 2, g);
    tetos.push(caixa(r.w + 0.2, 0.12, r.p + 0.2, M.aluminio, cx, h + 0.06, (z0 + z1) / 2, g));
    const vidro = new THREE.Mesh(new THREE.PlaneGeometry(r.w - 0.2, h - 0.1), M.vidro);
    vidro.position.set(cx, h / 2, z1);
    g.add(vidro);
    caixa(r.w - 0.3, 0.06, 0.5, M.madeiraClara, cx, 0.5, z0 + 0.4, g);
    caixa(r.w - 0.4, 0.9, 0.02, M.brilhoInfra, cx, 1.4, z0 + 0.12, g);
    caixa(0.02, 0.9, 0.6, M.brilhoInfra, x0 + 0.12, 1.2, (z0 + z1) / 2, g);
    placa('INFRAVERMELHO  55 °C', cx, 2.0, z1 + 0.01, g, 1.6);
  }

  // Banheiras de gelo sob o pergolado
  {
    const r = E.banheiras;
    r.unidades.forEach((u, i) => {
      const g = grupoEquip('banheiras');
      const cx = WX(u.x + u.w / 2), cz = WZ(u.d + u.p / 2);
      const corpo = new THREE.Mesh(new RoundedBoxGeometry(u.w, u.alt, u.p, 4, 0.07), M.grafite);
      corpo.position.set(cx, u.alt / 2, cz);
      corpo.castShadow = corpo.receiveShadow = true;
      g.add(corpo);
      const lateral = new THREE.Mesh(new THREE.PlaneGeometry(u.p - 0.3, u.alt - 0.25), M.vidro);
      lateral.rotation.y = Math.PI / 2;
      lateral.position.set(cx + u.w / 2 + 0.002, u.alt / 2, cz);
      g.add(lateral);
      caixa(u.w + 0.08, 0.05, u.p + 0.08, M.madeiraClara, cx, u.alt + 0.02, cz, g);
      const agua = new THREE.Mesh(new THREE.PlaneGeometry(u.w - 0.16, u.p - 0.16), i < 2 ? M.aguaFria : M.aguaMorna);
      agua.rotation.x = -Math.PI / 2;
      agua.position.set(cx, u.alt - 0.08, cz);
      g.add(agua);
      caixa(0.5, 0.22, 0.38, M.madeiraClara, cx, 0.11, cz + u.p / 2 + 0.25, g);
      cilindro(0.025, 0.025, 1.1, M.inox, cx + u.w / 2 - 0.05, 0.55, cz + u.p / 2 + 0.06, 10, g);
      placa(u.temp, cx, u.alt - 0.25, cz + u.p / 2 + 0.005, g, 0.42, 0.16);
    });
  }

  // Pergolado
  {
    const r = E.pergolado, g = grupoEquip('pergolado');
    const x0 = WX(r.x), x1 = WX(r.x + r.w), z0 = WZ(r.d), z1 = WZ(r.d + r.p), h = r.alt;
    for (const x of [x0 + 0.1, (x0 + x1) / 2, x1 - 0.1]) for (const z of [z0 + 0.1, z1 - 0.1]) caixa(0.12, h, 0.12, M.aluminio, x, h / 2, z, g);
    caixa(r.w, 0.2, 0.1, M.aluminio, (x0 + x1) / 2, h - 0.1, z0 + 0.1, g);
    caixa(r.w, 0.2, 0.1, M.aluminio, (x0 + x1) / 2, h - 0.1, z1 - 0.1, g);
    const n = Math.floor(r.w / 0.28);
    const ripas = new THREE.InstancedMesh(new THREE.BoxGeometry(0.06, 0.14, r.p), M.aluminio, n);
    const mat4 = new THREE.Matrix4();
    for (let i = 0; i < n; i++) {
      mat4.makeTranslation(x0 + 0.15 + i * 0.28, h + 0.07, (z0 + z1) / 2);
      ripas.setMatrixAt(i, mat4);
    }
    ripas.castShadow = true;
    g.add(ripas);
    const cobertura = new THREE.Mesh(new THREE.PlaneGeometry(r.w, r.p), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.18, roughness: 0.2, side: THREE.DoubleSide, depthWrite: false }));
    cobertura.rotation.x = -Math.PI / 2;
    cobertura.position.set((x0 + x1) / 2, h + 0.16, (z0 + z1) / 2);
    g.add(cobertura);
  }

  // Duchas: parede de pedra com balde, contraste e cascata
  {
    const parede = grupoEquip('cascata');
    caixa(2.8, 2.5, 0.28, M.pedraEscura, WX(12.5), 1.25, WZ(0.14), parede);
    const yBraco = 2.25;
    // Balde
    const gb = grupoEquip('balde');
    const xb = WX(E.balde.x + 0.3), zb = WZ(0.7);
    caixa(0.05, 0.05, 0.45, M.inox, xb, yBraco + 0.1, WZ(0.48), gb);
    const balde = cilindro(0.24, 0.18, 0.32, M.madeiraClara, xb, yBraco - 0.08, zb, 20, gb);
    balde.rotation.x = 0.15;
    cilindro(0.008, 0.008, 0.8, M.inox, xb + 0.2, 1.75, zb, 6, gb);
    // Contraste
    const gc = grupoEquip('contraste');
    const xc = WX(E.contraste.x + 0.3);
    caixa(0.04, 0.04, 0.45, M.inox, xc, yBraco, WZ(0.5), gc);
    cilindro(0.16, 0.16, 0.02, M.inox, xc, yBraco - 0.03, WZ(0.72), 24, gc);
    caixa(0.18, 0.28, 0.03, M.inox, xc, 1.2, WZ(0.29), gc);
    // Cascata linear com lâmina de água
    const xk = WX(E.cascata.x + 0.4);
    caixa(0.62, 0.05, 0.16, M.inox, xk, 2.05, WZ(0.36), parede);
    const lamina = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 2.0), M.cascataAgua);
    lamina.position.set(xk, 1.02, WZ(0.43));
    parede.add(lamina);
    // Ducha acessível com banco e barras
    const ga = grupoEquip('acessivel');
    const xa = WX(E.acessivel.x + 0.6), za = WZ(E.acessivel.d + 0.6);
    cilindro(0.05, 0.05, 2.2, M.inox, xa, 1.1, za, 12, ga);
    caixa(0.05, 0.05, 0.35, M.inox, xa, 2.15, za + 0.17, ga);
    cilindro(0.11, 0.11, 0.02, M.inox, xa, 2.12, za + 0.34, 20, ga);
    caixa(0.5, 0.05, 0.42, M.madeiraClara, xa + 0.45, 0.46, za, ga);
    caixa(0.04, 0.46, 0.04, M.inox, xa + 0.62, 0.23, za, ga);
    caixa(0.6, 0.035, 0.035, M.inox, xa + 0.4, 0.85, za - 0.2, ga);
    // Ducha de higienização na entrada
    const gh = grupoEquip('higienizacao');
    const xh = WX(E.higienizacao.x + 0.4), zh = WZ(E.higienizacao.d + 0.4);
    cilindro(0.05, 0.05, 2.2, M.inox, xh, 1.1, zh, 12, gh);
    caixa(0.05, 0.05, 0.35, M.inox, xh, 2.15, zh - 0.17, gh);
    cilindro(0.11, 0.11, 0.02, M.inox, xh, 2.12, zh - 0.34, 20, gh);
  }

  // Entrada: armários, casa de máquinas e bebedouro
  {
    const ga = grupoEquip('armarios');
    const r = E.armarios;
    const frente = new THREE.MeshStandardMaterial({ map: texArmarios(), roughness: 0.6 });
    const arm = new THREE.Mesh(new THREE.BoxGeometry(r.w, r.alt, r.p), [M.termo, M.termo, M.termo, M.termo, frente, M.termo]);
    arm.position.set(WX(r.x + r.w / 2), r.alt / 2, WZ(r.d + r.p / 2));
    arm.castShadow = arm.receiveShadow = true;
    ga.add(arm);

    const gm = grupoEquip('maquinas');
    const m = E.maquinas;
    caixaPlanta(m, m.alt, M.venezianas, 0, gm, 0.5);
    tetos.push(caixa(m.w + 0.2, 0.12, m.p + 0.2, M.aluminio, WX(m.x + m.w / 2), m.alt + 0.06, WZ(m.d + m.p / 2), gm));
    const logo = new THREE.TextureLoader().load(new URL('../img/logo-sirio.png', import.meta.url).href);
    logo.colorSpace = THREE.SRGBColorSpace;
    const placaLogo = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.92), new THREE.MeshStandardMaterial({ map: logo, transparent: true }));
    placaLogo.position.set(WX(m.x + 0.6), 1.45, WZ(m.d + m.p) + 0.012);
    gm.add(placaLogo);
    const placaW = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.32), new THREE.MeshStandardMaterial({ map: texTexto('WELLNESS', '#c8102e', '#ffffff', 512, 110, 70) }));
    placaW.position.set(WX(m.x + 1.65), 1.45, WZ(m.d + m.p) + 0.012);
    gm.add(placaW);

    const gb = grupoEquip('bebedouro');
    caixaPlanta(E.bebedouro, 1.2, M.inox, 0, gb);
  }

  // Lounge de descanso
  {
    const g = grupoEquip('lounge');
    for (let i = 0; i < 4; i++) espreguicadeira(WX(0.75 + i * 1.25), WZ(5.85), 0, M.almofada, true, g);
    sofa(WX(1.5), WZ(3.2), 0, g);
    sofa(WX(3.9), WZ(3.2), 0, g);
    for (const x of [1.5, 3.9]) cilindro(0.35, 0.3, 0.38, M.madeiraClara, WX(x), 0.19, WZ(4.15), 20, g);
    // Bancos de madeira existentes reaproveitados junto ao relógio
    caixa(0.55, 0.42, 1.8, M.deckAntigo, WX(4.6), 0.21, WZ(1.3), g);
    for (const [x, d] of [[0.5, 2.6], [5.1, 2.6]]) {
      cilindro(0.28, 0.22, 0.55, M.grafite, WX(x), 0.275, WZ(d), 16, g);
      dracena(WX(x), WZ(d), 1.4, 0.3, g);
    }
  }

  // Painel de privacidade ripado sobre o guarda-corpo
  {
    const r = E.painel, g = grupoEquip('painel');
    const n = Math.floor(r.w / 0.1);
    const ripas = new THREE.InstancedMesh(new THREE.BoxGeometry(0.045, r.alt, 0.07), M.termo, n);
    const mat4 = new THREE.Matrix4();
    for (let i = 0; i < n; i++) {
      mat4.makeTranslation(WX(r.x + 0.05 + i * 0.1), r.alt / 2, WZ(6.95));
      ripas.setMatrixAt(i, mat4);
    }
    ripas.castShadow = ripas.receiveShadow = true;
    g.add(ripas);
    caixa(r.w, 0.06, 0.12, M.aluminio, WX(r.x + r.w / 2), r.alt + 0.03, WZ(6.95), g);
  }

  // ------------------------------------------------------------ peças reutilizáveis

  function placa(texto, x, y, z, pai, w = 1.3, h = 0.2) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: texTexto(texto, '#2b2e31', '#f3efe8', 768, 118, 52), roughness: 0.6 }));
    m.position.set(x, y, z);
    pai.add(m);
    return m;
  }
  function espreguicadeira(x, z, rot, matAlmofada, toalha = false, pai = scene) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = rot;
    caixa(0.68, 0.06, 1.9, M.aluminio, 0, 0.3, 0, g);
    for (const [dx, dz] of [[-0.3, -0.85], [0.3, -0.85], [-0.3, 0.85], [0.3, 0.85]]) caixa(0.04, 0.3, 0.04, M.aluminio, dx, 0.15, dz, g);
    caixa(0.64, 0.08, 1.3, matAlmofada, 0, 0.37, 0.25, g);
    const encosto = caixa(0.64, 0.08, 0.7, matAlmofada, 0, 0.55, -0.62, g);
    encosto.rotation.x = 0.6;
    if (toalha) {
      const t = cilindro(0.08, 0.08, 0.6, M.vermelho, 0, 0.47, 0.75, 12, g);
      t.rotation.z = Math.PI / 2;
    }
    pai.add(g);
    return g;
  }
  function sofa(x, z, rot, pai) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = rot;
    caixa(2.0, 0.32, 0.85, M.aluminio, 0, 0.16, 0, g);
    caixa(1.9, 0.14, 0.75, M.almofada, 0, 0.39, 0.03, g);
    caixa(2.0, 0.45, 0.16, M.almofada, 0, 0.62, -0.36, g);
    caixa(0.42, 0.32, 0.12, M.vermelho, -0.55, 0.62, -0.22, g);
    caixa(0.42, 0.32, 0.12, M.almofada, 0.55, 0.62, -0.22, g);
    pai.add(g);
  }
  function palmeira(x, y, z, h) {
    const tronco = cilindro(0.17, 0.26, h, M.tronco, x, y + h / 2, z, 10);
    arvores.push(tronco);
    tronco.rotation.z = (Math.random() - 0.5) * 0.06;
    const geo = new THREE.SphereGeometry(1, 10, 6);
    for (let i = 0; i < 11; i++) {
      const f = new THREE.Mesh(geo, M.folha);
      const a = (i / 11) * Math.PI * 2 + Math.random() * 0.3;
      const comp = 2.2 + Math.random() * 0.8;
      f.scale.set(0.32, 0.04, comp);
      f.position.set(x + Math.sin(a) * comp * 0.75, y + h - 0.25 - comp * 0.18, z + Math.cos(a) * comp * 0.75);
      f.rotation.set(0, a, 0);
      f.rotateX(0.35 + Math.random() * 0.25);
      f.castShadow = true;
      scene.add(f);
      arvores.push(f);
    }
  }
  function arvoreCopa(x, y, z, s) {
    arvores.push(cilindro(0.25, 0.35, s * 1.6, M.tronco, x, y + s * 0.8, z, 8));
    for (let i = 0; i < 6; i++) {
      const b = new THREE.Mesh(new THREE.IcosahedronGeometry(s * (0.5 + Math.random() * 0.3), 1), M.folhaEscura);
      b.position.set(x + (Math.random() - 0.5) * s, y + s * 1.7 + Math.random() * s * 0.6, z + (Math.random() - 0.5) * s);
      b.castShadow = true;
      scene.add(b);
      arvores.push(b);
    }
  }
  function dracena(x, z, h, escala = 0.5, pai = scene) {
    for (let i = 0; i < 3; i++) cilindro(0.03, 0.04, h * 0.8, M.tronco, x + (Math.random() - 0.5) * 0.3, h * 0.4, z + (Math.random() - 0.5) * 0.3, 6, pai);
    for (let i = 0; i < 5; i++) {
      const b = new THREE.Mesh(new THREE.IcosahedronGeometry(escala * (0.7 + Math.random() * 0.5), 1), M.folhaVariegada);
      b.position.set(x + (Math.random() - 0.5) * escala * 2, h * (0.65 + Math.random() * 0.35), z + (Math.random() - 0.5) * escala * 2);
      b.castShadow = true;
      pai.add(b);
    }
  }
  function iuca(x, z) {
    const t = cilindro(0.22, 0.32, 3.2, M.tronco, x, 1.6, z, 10);
    arvores.push(t);
    t.rotation.z = 0.12;
    const geo = new THREE.ConeGeometry(0.03, 1.1, 4);
    for (let i = 0; i < 70; i++) {
      const f = new THREE.Mesh(geo, M.folha);
      const a = Math.random() * Math.PI * 2, b = Math.random() * 1.3;
      f.position.set(x + 0.35 + Math.sin(a) * Math.sin(b) * 0.5, 3.4 + Math.cos(b) * 0.5, z + Math.cos(a) * Math.sin(b) * 0.5);
      f.rotation.set(Math.cos(a) * b, 0, -Math.sin(a) * b);
      scene.add(f);
      arvores.push(f);
    }
  }

  // ------------------------------------------------------------ câmeras e modos

  const camP = new THREE.PerspectiveCamera(50, 1, 0.1, 400);
  const camO = new THREE.OrthographicCamera(-15, 15, 8, -8, 0.1, 200);
  const orbit = new OrbitControls(camP, canvas);
  orbit.enableDamping = true;
  orbit.maxPolarAngle = Math.PI * 0.49;
  orbit.minDistance = 2.5;
  orbit.maxDistance = 70;
  orbit.target.set(0, 0.6, 0);

  const estado = { modo: 'orbital', cenario: 'recomendado', camera: camP };
  const andar = { pos: new THREE.Vector3(WX(24.2), 1.6, WZ(5.6)), yaw: Math.PI / 2, pitch: -0.05, teclas: {}, joy: { x: 0, y: 0 } };

  function vistaInicial() {
    const largo = container.clientWidth / Math.max(1, container.clientHeight);
    const k = largo < 1 ? 1.9 : 1;
    camP.fov = 50;
    camP.position.set(6 * k, 14 * k, 17 * k);
    orbit.target.set(0, 0.2, -0.6);
    camP.updateProjectionMatrix();
    orbit.update();
  }

  function aplicarVista(nome) {
    const v = VISTAS_FOTO[nome];
    if (!v) return vistaInicial();
    definirModo('orbital');
    camP.fov = v.fov;
    camP.position.set(...v.pos);
    orbit.target.set(...v.alvo);
    camP.updateProjectionMatrix();
    orbit.update();
  }

  function ajustarOrto(w = container.clientWidth, h = Math.max(1, container.clientHeight)) {
    const a = w / h;
    camO.position.set(camO.position.x, 60, camO.position.z);
    if (a >= 1) {
      camO.up.set(0, 0, -1);
      const meiaL = 15, meiaA = Math.max(meiaL / a, 5.5);
      Object.assign(camO, { left: -meiaA * a, right: meiaA * a, top: meiaA, bottom: -meiaA });
    } else {
      camO.up.set(1, 0, 0);
      const meiaA = 14.5, meiaL = Math.max(meiaA * a, 4.5);
      Object.assign(camO, { left: -meiaL, right: meiaL, top: meiaL / a, bottom: -meiaL / a });
    }
    camO.lookAt(camO.position.x, 0, camO.position.z);
    camO.updateProjectionMatrix();
  }

  function definirModo(modo) {
    estado.modo = modo;
    orbit.enabled = modo === 'orbital';
    for (const o of [...arvores, ...tetos]) o.visible = modo !== 'planta';
    if (modo === 'planta') {
      camO.position.set(0, 60, 0);
      camO.zoom = 1;
      ajustarOrto();
      estado.camera = camO;
    } else {
      estado.camera = camP;
      if (modo === 'caminhada') {
        camP.fov = 70;
        camP.updateProjectionMatrix();
      } else if (camP.fov === 70) {
        vistaInicial();
      }
    }
    ui.aoMudarModo?.(modo);
  }

  // ------------------------------------------------------------ caminhada

  const ANDAVEL = [
    { x0: WX(-7), x1: WX(25), z0: WZ(0.3), z1: WZ(6.75) },
    { x0: WX(24.9), x1: WX(28.4), z0: WZ(3.4), z1: WZ(6.75) },
  ];
  const OBSTACULOS = [
    E.seca, E.vapor, E.ir, E.maquinas, E.armarios, E.bebedouro, canteiro,
    ...E.banheiras.unidades,
    { x: 11.1, d: 0, w: 2.8, p: 0.3 },
  ].map((r) => ({ x0: WX(r.x) - 0.25, x1: WX(r.x + r.w) + 0.25, z0: WZ(r.d) - 0.25, z1: WZ(r.d + r.p) + 0.25 }));

  function podePisar(x, z) {
    const dentro = (r) => x > r.x0 && x < r.x1 && z > r.z0 && z < r.z1;
    return ANDAVEL.some(dentro) && !OBSTACULOS.some(dentro);
  }

  function atualizarCaminhada(dt) {
    const t = andar.teclas;
    let f = (t.KeyW || t.ArrowUp ? 1 : 0) - (t.KeyS || t.ArrowDown ? 1 : 0) - andar.joy.y;
    let s = (t.KeyD || t.ArrowRight ? 1 : 0) - (t.KeyA || t.ArrowLeft ? 1 : 0) + andar.joy.x;
    const mag = Math.hypot(f, s);
    if (mag > 1) { f /= mag; s /= mag; }
    if (mag > 0.05) {
      const vel = 2.2 * dt;
      const fx = -Math.sin(andar.yaw), fz = -Math.cos(andar.yaw);
      const rx = Math.cos(andar.yaw), rz = -Math.sin(andar.yaw);
      const dx = (fx * f + rx * s) * vel, dz = (fz * f + rz * s) * vel;
      const p = andar.pos;
      if (podePisar(p.x + dx, p.z + dz)) { p.x += dx; p.z += dz; }
      else if (podePisar(p.x + dx, p.z)) p.x += dx;
      else if (podePisar(p.x, p.z + dz)) p.z += dz;
    }
    camP.position.copy(andar.pos);
    camP.rotation.set(andar.pitch, andar.yaw, 0, 'YXZ');
  }

  window.addEventListener('keydown', (e) => {
    if (estado.modo !== 'caminhada') return;
    andar.teclas[e.code] = true;
    if (e.code.startsWith('Arrow')) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => { andar.teclas[e.code] = false; });

  if (ui.joystick) {
    const joy = ui.joystick, botao = joy.firstElementChild;
    let ativo = null;
    const mover = (e) => {
      const r = joy.getBoundingClientRect();
      let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      const raio = r.width / 2 - 10, l = Math.hypot(dx, dy);
      if (l > raio) { dx *= raio / l; dy *= raio / l; }
      andar.joy.x = dx / raio;
      andar.joy.y = dy / raio;
      botao.style.transform = `translate(${dx}px, ${dy}px)`;
    };
    joy.addEventListener('pointerdown', (e) => { ativo = e.pointerId; joy.setPointerCapture(e.pointerId); mover(e); e.stopPropagation(); });
    joy.addEventListener('pointermove', (e) => { if (e.pointerId === ativo) mover(e); });
    const soltar = (e) => {
      if (e.pointerId !== ativo) return;
      ativo = null;
      andar.joy.x = andar.joy.y = 0;
      botao.style.transform = '';
    };
    joy.addEventListener('pointerup', soltar);
    joy.addEventListener('pointercancel', soltar);
  }

  // ------------------------------------------------------------ ponteiro: olhar, arrastar, tocar

  const ponteiros = new Map();
  let toqueInicio = null;
  const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3();

  function telaParaMundoOrto(cx, cy, alvo) {
    const r = canvas.getBoundingClientRect();
    alvo.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1, 0).unproject(camO);
    return alvo;
  }

  canvas.addEventListener('pointerdown', (e) => {
    ponteiros.set(e.pointerId, { x: e.clientX, y: e.clientY });
    toqueInicio = { x: e.clientX, y: e.clientY, t: performance.now() };
    if (estado.modo !== 'orbital') canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    const ant = ponteiros.get(e.pointerId);
    if (!ant) return;
    if (estado.modo === 'caminhada') {
      andar.yaw -= (e.clientX - ant.x) * 0.005;
      andar.pitch = Math.max(-1.2, Math.min(1.2, andar.pitch - (e.clientY - ant.y) * 0.004));
    } else if (estado.modo === 'planta') {
      if (ponteiros.size === 1) {
        telaParaMundoOrto(ant.x, ant.y, tmpA);
        telaParaMundoOrto(e.clientX, e.clientY, tmpB);
        camO.position.x += tmpA.x - tmpB.x;
        camO.position.z += tmpA.z - tmpB.z;
      } else if (ponteiros.size === 2) {
        const outros = [...ponteiros.entries()].find(([id]) => id !== e.pointerId)[1];
        const dAnt = Math.hypot(ant.x - outros.x, ant.y - outros.y);
        const dNovo = Math.hypot(e.clientX - outros.x, e.clientY - outros.y);
        if (dAnt > 0) camO.zoom = Math.max(0.6, Math.min(5, camO.zoom * (dNovo / dAnt)));
        camO.updateProjectionMatrix();
      }
    }
    ponteiros.set(e.pointerId, { x: e.clientX, y: e.clientY });
  });
  const fimPonteiro = (e) => {
    ponteiros.delete(e.pointerId);
    if (toqueInicio && Math.hypot(e.clientX - toqueInicio.x, e.clientY - toqueInicio.y) < 6 && performance.now() - toqueInicio.t < 450) {
      escolher(e.clientX, e.clientY);
    }
    toqueInicio = null;
  };
  canvas.addEventListener('pointerup', fimPonteiro);
  canvas.addEventListener('pointercancel', (e) => { ponteiros.delete(e.pointerId); toqueInicio = null; });
  canvas.addEventListener('wheel', (e) => {
    if (estado.modo !== 'planta') return;
    e.preventDefault();
    camO.zoom = Math.max(0.6, Math.min(5, camO.zoom * Math.exp(-e.deltaY * 0.0015)));
    camO.updateProjectionMatrix();
  }, { passive: false });

  const raycaster = new THREE.Raycaster();
  function escolher(cx, cy) {
    const r = canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, estado.camera);
    for (const hit of raycaster.intersectObjects(scene.children, true)) {
      let o = hit.object;
      while (o && !o.userData.equipId) o = o.parent;
      if (o) return mostrarInfo(o.userData.equipId);
      if (hit.object.material && !hit.object.material.transparent) break;
    }
    ui.aoFecharInfo?.();
  }

  // ------------------------------------------------------------ pontos clicáveis e informações

  let dados = null;
  try {
    const resp = await fetch(new URL('../data/projeto.json', import.meta.url));
    dados = await resp.json();
  } catch (err) {
    console.warn('Sem dados de preço', err);
  }

  function infoDe(id) {
    const eq = E[id];
    if (!eq) return null;
    const precos = dados ? dados.cenarios.map((c) => ({
      id: c.id, nome: c.nome, valor: dados.totais[c.id].por_chave[eq.chave] || 0,
    })) : [];
    return { ...eq, precos };
  }

  function mostrarInfo(id) {
    const info = infoDe(id);
    if (info) ui.aoMostrarInfo?.(info, estado.cenario);
  }

  const pontos = [];
  if (ui.camadaPontos) {
    EQUIPAMENTOS.forEach((eq, i) => {
      const b = document.createElement('button');
      b.className = 'ponto';
      b.type = 'button';
      b.innerHTML = `<span class="ponto-n">${i + 1}</span><span class="ponto-nome">${eq.nome}</span>`;
      b.setAttribute('aria-label', eq.nome);
      b.addEventListener('click', (e) => { e.stopPropagation(); mostrarInfo(eq.id); });
      ui.camadaPontos.appendChild(b);
      const altura = eq.id === 'painel' ? eq.alt + 0.3 : eq.id === 'lounge' ? 1.3 : eq.alt + 0.45;
      const d = eq.id === 'banheiras' ? eq.d + eq.p / 2 : eq.d + eq.p / 2;
      pontos.push({ el: b, pos: new THREE.Vector3(WX(eq.x + eq.w / 2), altura, WZ(d)) });
    });
  }
  const proj = new THREE.Vector3();
  function atualizarPontos() {
    const w = container.clientWidth, h = container.clientHeight;
    for (const p of pontos) {
      proj.copy(p.pos).project(estado.camera);
      const atras = proj.z > 1 || proj.z < -1;
      const dist = estado.camera.isPerspectiveCamera ? estado.camera.position.distanceTo(p.pos) : 0;
      const longe = estado.modo === 'caminhada' && dist > 14;
      if (atras || longe || Math.abs(proj.x) > 1.05 || Math.abs(proj.y) > 1.05) {
        p.el.style.display = 'none';
        continue;
      }
      p.el.style.display = '';
      p.el.style.transform = `translate(${((proj.x + 1) / 2) * w}px, ${((1 - proj.y) / 2) * h}px) translate(-50%, -50%)`;
    }
  }

  // ------------------------------------------------------------ laço de renderização

  function redimensionar() {
    const w = container.clientWidth, h = Math.max(1, container.clientHeight);
    renderer.setSize(w, h, false);
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    camP.aspect = w / h;
    camP.updateProjectionMatrix();
    ajustarOrto();
  }
  new ResizeObserver(redimensionar).observe(container);
  redimensionar();
  vistaInicial();

  const relogioAnim = new THREE.Clock();
  let pausado = false;
  function quadro() {
    if (pausado) return;
    const dt = Math.min(relogioAnim.getDelta(), 0.05);
    nAgua.offset.x += dt * 0.02;
    nAgua.offset.y += dt * 0.013;
    if (estado.modo === 'orbital') orbit.update();
    if (estado.modo === 'caminhada') atualizarCaminhada(dt);
    renderer.render(scene, estado.camera);
    atualizarPontos();
    requestAnimationFrame(quadro);
  }
  requestAnimationFrame(quadro);
  document.addEventListener('visibilitychange', () => {
    const estava = pausado;
    pausado = document.hidden;
    if (estava && !pausado) { relogioAnim.getDelta(); requestAnimationFrame(quadro); }
  });

  const api = {
    definirModo(modo) {
      if (modo === 'caminhada') {
        andar.pos.set(WX(24.2), 1.6, WZ(5.6));
        andar.yaw = Math.PI / 2;
        andar.pitch = -0.05;
      }
      definirModo(modo);
    },
    definirCenario(id) { estado.cenario = id; },
    aplicarVista,
    vistaInicial,
    // Renderiza num tamanho fixo e devolve a imagem (usado para gerar o antes e depois).
    capturar(w, h, qualidade = 0.86) {
      const antes = { w: container.clientWidth, h: container.clientHeight, pr: renderer.getPixelRatio() };
      renderer.setPixelRatio(1);
      renderer.setSize(w, h, false);
      camP.aspect = w / h;
      camP.updateProjectionMatrix();
      if (estado.modo === 'planta') ajustarOrto(w, h);
      if (estado.modo === 'orbital') orbit.update();
      if (estado.modo === 'caminhada') atualizarCaminhada(0);
      renderer.render(scene, estado.camera);
      const url = canvas.toDataURL('image/jpeg', qualidade);
      renderer.setPixelRatio(antes.pr);
      redimensionar();
      return url;
    },
    info: infoDe,
    dados: () => dados,
  };
  return api;
}
