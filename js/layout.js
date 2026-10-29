// Geometria do espaço, compartilhada pelo tour 3D e pela planta baixa.
//
// Unidades em metros. X corre ao longo dos 25 m (0 = ponta do relógio, 25 = entrada).
// D é a distância a partir do muro e do bar (0) até o guarda-corpo do playground (7).
// Retângulos: { x, d, w (ao longo de X), p (profundidade ao longo de D), alt }.

export const AREA = { comprimento: 25, profundidade: 7 };

export const ZONAS = [
  { id: 'descanso', nome: 'Descanso', x0: 0, x1: 5.5, cor: '#d9cbb4' },
  { id: 'frio', nome: 'Frio', x0: 5.5, x1: 11, cor: '#bcd7ea' },
  { id: 'duchas', nome: 'Duchas', x0: 11, x1: 14, cor: '#d6dde3' },
  { id: 'calor', nome: 'Calor', x0: 14, x1: 22, cor: '#f1c9bd' },
  { id: 'entrada', nome: 'Entrada e apoio', x0: 22, x1: 25, cor: '#e3e1dc' },
];

// Faixa livre de circulação acessível (NBR 9050), junto ao guarda-corpo.
export const CORREDOR = { x0: 5.5, x1: 22, d0: 5.5, d1: 7 };

// Elementos existentes que não podem ser modificados.
export const EXISTENTES = [
  { id: 'relogio', nome: 'Torre do relógio (mantida)', x: 1.9, d: 0.7, w: 1.2, p: 1.2, alt: 6.5 },
  { id: 'canteiro', nome: 'Canteiro do relógio', x: 1.2, d: 0.1, w: 2.6, p: 2.5, alt: 0.45 },
  { id: 'bar', nome: 'Bar (mantido)', x: 8, d: -3, w: 6, p: 3, alt: 2.8 },
];

const BANHEIRAS = [5.7, 7.1, 8.5, 9.9].map((x, i) => ({
  id: `banheira${i + 1}`, chave: 'banheira', x, d: 1.8, w: 0.9, p: 1.95, alt: 0.95,
  temp: i < 2 ? '5 °C' : '11 °C',
}));

// chave = mesma chave das linhas do orçamento (data/projeto.json, totais.por_chave)
export const EQUIPAMENTOS = [
  {
    id: 'seca', chave: 'seca', nome: 'Sauna seca finlandesa', x: 14.2, d: 0.3, w: 4.5, p: 3.0, alt: 2.5,
    funcao: 'Calor seco de 80 a 90 °C para a primeira etapa do circuito. Sessões de 10 a 15 minutos, com aufguss guiado nos horários marcados.',
    specs: ['4,5 x 3,0 m, cerca de 13,5 m²', '12 lugares (Essencial) ou 16 lugares (Recomendado e Premium)', 'Aquecedor de 18 a 27 kW', 'Bancos em 2 ou 3 níveis, frente de vidro, luz quente', 'Botão de emergência e termostato de segurança'],
  },
  {
    id: 'vapor', chave: 'vapor', nome: 'Sauna a vapor', x: 18.9, d: 0.3, w: 3.0, p: 2.5, alt: 2.5,
    funcao: 'Calor úmido de cerca de 45 °C com umidade perto de 100%. Alternativa mais suave ao calor seco.',
    specs: ['3,0 x 2,5 m, cerca de 7,5 m²', '8 lugares', 'Gerador de vapor de 15 a 24 kW', 'Pastilha ou pedra, teto inclinado para não pingar', 'Exaustor temporizado depois do uso'],
  },
  {
    id: 'ir', chave: 'ir', nome: 'Sauna infravermelha', x: 20.0, d: 3.2, w: 1.9, p: 1.4, alt: 2.2,
    funcao: 'Calor radiante de 50 a 60 °C, mais confortável para iniciantes e para quem não tolera a sauna seca.',
    specs: ['Cabine para 4 pessoas em abrigo fechado', 'Só nos cenários Recomendado e Premium', 'Cerca de 2,6 a 3,5 kW'],
    cenarios: ['recomendado', 'premium'],
  },
  {
    id: 'banheiras', chave: 'banheira', nome: 'Banheiras de gelo', x: 5.7, d: 1.8, w: 5.1, p: 1.95, alt: 0.95,
    funcao: 'Imersão no frio por 1 a 3 minutos depois do calor. Duas banheiras ficam a cerca de 5 °C e duas a cerca de 11 °C, para iniciantes.',
    specs: ['4 unidades com chiller, filtro e ozônio', 'Até 4 °C sem gelo', 'Corrimão, degrau e tampa', 'Sob pergolado para não aquecer no sol'],
    unidades: BANHEIRAS,
  },
  {
    id: 'balde', chave: 'balde', nome: 'Balde de água fria', x: 11.5, d: 0.35, w: 0.6, p: 0.6, alt: 2.4,
    funcao: 'Banho rápido de água fria ao puxar a corrente. Choque térmico curto, ótimo para quem ainda não entra na banheira.',
    specs: ['Inox, 10 a 30 L', 'Acionamento por corrente', 'Ralo linear embaixo'],
  },
  {
    id: 'contraste', chave: 'contraste', nome: 'Chuveiro de contraste', x: 12.2, d: 0.35, w: 0.6, p: 0.6, alt: 2.4,
    funcao: 'Alterna água quente e fria com válvula termostática. Usado para enxaguar entre o calor e o frio.',
    specs: ['Misturador termostático', 'Água quente por aquecedor a gás ou bomba de calor'],
  },
  {
    id: 'cascata', chave: 'cascata', nome: 'Ducha cascata', x: 12.9, d: 0.35, w: 0.8, p: 0.6, alt: 2.4,
    funcao: 'Lâmina de água larga sobre os ombros, para resfriar e relaxar a musculatura.',
    specs: ['Inox 304, de 60 a 300 cm conforme o cenário', 'Cascata de teto com LED no Recomendado e Premium'],
  },
  {
    id: 'acessivel', chave: 'acessivel', nome: 'Ducha acessível', x: 12.1, d: 3.0, w: 1.2, p: 1.2, alt: 2.2,
    funcao: 'Ducha com banco e barra de apoio, para pessoas com mobilidade reduzida (NBR 9050).',
    specs: ['Coluna de inox 316', 'Banco articulado e barras de apoio', 'Área de giro de 1,5 m'],
  },
  {
    id: 'higienizacao', chave: 'acessivel', nome: 'Ducha de higienização', x: 23.1, d: 3.3, w: 0.8, p: 0.8, alt: 2.2,
    funcao: 'Banho obrigatório antes de entrar nas saunas e nas banheiras. Mantém a água das banheiras limpa por mais tempo.',
    specs: ['Coluna de inox 316', 'Logo na entrada do circuito'],
  },
  {
    id: 'armarios', chave: 'armarios', nome: 'Armários', x: 22.2, d: 0.05, w: 2.6, p: 0.55, alt: 1.9,
    funcao: 'Guarda de pertences durante a sessão. O sócio já chega em traje de banho pelos vestiários da piscina.',
    specs: ['30 a 40 portas', 'Fenólico para área molhada ou inox no Premium', 'Fechadura eletrônica no Recomendado e Premium'],
  },
  {
    id: 'maquinas', chave: 'maquinas', nome: 'Casa de máquinas', x: 22.2, d: 0.85, w: 2.6, p: 1.8, alt: 2.4,
    funcao: 'Abriga quadros elétricos, aquecimento de água das duchas e o gerador de vapor, longe da água e do público.',
    specs: ['Ventilada e trancada', 'Quadro dedicado com DR', 'Aquecedor a gás ou bomba de calor'],
  },
  {
    id: 'bebedouro', chave: 'bebedouro', nome: 'Bebedouro e chá', x: 22.4, d: 4.4, w: 0.6, p: 0.6, alt: 1.3,
    funcao: 'Hidratação entre as rodadas, essencial depois do calor.',
    specs: ['Inox, 50 L, água gelada', 'Estação de chá no lounge (Recomendado e Premium)'],
  },
  {
    id: 'lounge', chave: 'lounge', nome: 'Lounge de descanso', x: 0.3, d: 2.8, w: 5.0, p: 4.0, alt: 0.9,
    funcao: 'Descanso de 3 a 7 minutos entre as rodadas, com vista para as palmeiras. É onde a convivência acontece.',
    specs: ['Espreguiçadeiras e sofás de área externa', 'Contorna o relógio sem tocá-lo', 'Perto do bar e do solário da piscina'],
  },
  {
    id: 'pergolado', chave: 'pergolado', nome: 'Pergolado', x: 5.5, d: 0.5, w: 5.5, p: 5.0, alt: 2.8,
    funcao: 'Sombra sobre as banheiras para o chiller gastar menos energia, e proteção contra folhas das palmeiras.',
    specs: ['Madeira (Essencial), alumínio com policarbonato (Recomendado) ou pérgola bioclimática (Premium)'],
  },
  {
    id: 'painel', chave: 'painel', nome: 'Painel de privacidade', x: 5.5, d: 6.85, w: 19.5, p: 0.15, alt: 2.2,
    funcao: 'Fecha a vista do playground e de quem passa embaixo, já que o uso é em traje de banho. Deixa o ar passar.',
    specs: ['2,2 m de altura sobre o guarda-corpo', 'Ripado de madeira, alumínio ou alumínio com vidro jateado'],
  },
];

// Lugares por equipamento (cenário Recomendado) para o cálculo de capacidade.
export const CAPACIDADE = [
  { item: 'Sauna seca', lugares: 16 },
  { item: 'Sauna a vapor', lugares: 8 },
  { item: 'Sauna infravermelha', lugares: 4 },
  { item: 'Banheiras de gelo (2 pessoas cada)', lugares: 8 },
  { item: 'Duchas', lugares: 4 },
  { item: 'Lounge de descanso', lugares: 14 },
];

// Câmeras que reproduzem, de forma aproximada, os ângulos das fotos enviadas.
// Coordenadas no mundo 3D: wx = X - 12,5; wz = D - 3,5; y = altura.
export const VISTAS_FOTO = {
  foto1: { pos: [16.0, 1.6, 1.6], alvo: [-5.0, 1.2, 0.6], fov: 62 },
  foto2: { pos: [0.2, 1.55, 2.4], alvo: [-10.0, 2.2, -1.6], fov: 62 },
  foto3: { pos: [11.6, 1.6, 2.5], alvo: [-12.0, 1.0, 1.0], fov: 62 },
  foto4: { pos: [-17.5, 1.5, -3.0], alvo: [-11.5, 0.4, 6.0], fov: 62 },
  capa: { pos: [5.5, 12.5, 12.0], alvo: [-1.5, 0.2, -1.2], fov: 50 },
};
