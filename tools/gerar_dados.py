"""Gera os dados do projeto (data/projeto.json) e a planilha de orçamento.

Fonte única dos números do site e da planilha. Os preços vêm de
research/precos.md (consultas de 29/10/2026). Rodar sempre que mudar um valor:

    python tools/gerar_dados.py
"""

import json
from pathlib import Path

from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter

RAIZ = Path(__file__).resolve().parent.parent
DATA = "29/10/2026"

BDI = 0.15           # administração e BDI da construtora, só sobre obra civil
CONTINGENCIA = 0.12  # dentro da faixa pedida de 10% a 15%
SOCIOS = 5000

CENARIOS = [
    {"id": "essencial", "nome": "Essencial",
     "resumo": "Equipamentos nacionais, sem sauna infravermelha, lounge com o deck existente."},
    {"id": "recomendado", "nome": "Recomendado",
     "resumo": "Sauna seca para 16, infravermelho, banheiras de 2 pessoas com vidro, iluminação cênica e controle de acesso."},
    {"id": "premium", "nome": "Premium",
     "resumo": "Banheiras e aquecedores importados, pérgolas bioclimáticas e acabamentos em pedra. Passa do teto."},
]

GRUPOS = [
    # id, nome, entra no BDI (obra civil)
    ("banheiras", "Banheiras de gelo", False),
    ("seca", "Sauna seca finlandesa", False),
    ("vapor", "Sauna a vapor", False),
    ("ir", "Sauna infravermelha", False),
    ("duchas", "Duchas de experiência e aquecimento de água", False),
    ("apoio", "Armários, bebedouro e lounge", False),
    ("cobertura", "Pergolado e painel de privacidade", True),
    ("piso", "Piso, impermeabilização e drenagem", True),
    ("infra", "Infraestrutura e instalação", True),
    ("estrutura", "Reforço estrutural (reserva)", True),
    ("seguranca", "Segurança, iluminação, som e acesso", True),
    ("projeto", "Projeto, laudos e aprovações", False),
]

# Links da pesquisa (research/precos.md)
L = {
    "iceflow": "https://iceflow.com.br/precos",
    "gelo": "https://gelohealth.com.br/collections/all",
    "plunge": "https://business.plunge.com/products/plunge-all-in-commercial",
    "impercap18": "https://www.globaltechbrasil.com/saunas/sauna-seca-eletrica-quadro-comando-digital-18kw-impercap-ate-55-5m",
    "impercap27": "https://www.google.com/search?q=sauna+seca+finlandesa+montada+pre%C3%A7o+por+m2+madeira+cedro&hl=pt-BR&gl=br",
    "harvia": "https://topture.com/products/harvia-virta-pro-series-sauna-heater-20kw",
    "moveisdeck": "https://www.moveisdeck.com.br/produtos/sauna-deck-completa-seca/",
    "moveisdeck_vapor": "https://www.moveisdeck.com.br/produtos/sauna-deck-versatil-vapor/",
    "sodramar24": "https://www.globaltechbrasil.com/saunas/sauna-a-vapor-compact-line-inox-24kw-sodramar-para-ate-40m",
    "impercap_vapor24": "https://www.globaltechbrasil.com/saunas/sauna-vapor-eletrica-24kw-inox-comando-digital-impercap",
    "tylo_steam": "https://www.poolandspacentre.co.uk/tylo-steam-commercial-generator.html",
    "porta_vapor": "https://www.google.com/search?q=porta+de+vidro+temperado+para+sauna+a+vapor+OR+seca+pre%C3%A7o+Sodramar&hl=pt-BR&gl=br",
    "kiva": "https://kivawellness.com.br/products/sauna-4-pessoas-infravermelho-full-spectrum",
    "clearlight": "https://healwithheat.com/sanctuary-retreat/",
    "tylohelo": "https://esaunashop.com/tylohelo-cold-shower-bucket",
    "cascata60": "https://www.cascatasecia.com.br/produto/cascata-ducha-linear-em-inox-304-para-ambientes-externos-60cm-zgmmaiv6/",
    "cascata100": "https://www.cascatasecia.com.br/produto/cascata-ducha-linear-em-inox-304-para-ambientes-externos-100cm-28v9y5ft/",
    "cascata300": "https://www.cascatasecia.com.br/produto/cascata-ducha-linear-em-inox-304-para-ambientes-externos-300cm-a79tdhm7/",
    "cascata_teto": "https://tropicalcascatas.com.br/produto/cascata-chuva-inox-de-embutir-led/",
    "coluna316": "https://www.cascatasecia.com.br/produto/ducha-piscina-coluna-tubular-em-inox-316-c-001-cascatas-cia-i0glbe9o/",
    "decaterm": "https://www.google.com/search?q=misturador+termost%C3%A1tico+chuveiro+parede+pre%C3%A7o+Deca+OR+Docol+OR+Hansgrohe&hl=pt-BR&gl=br",
    "rinnai": "https://loja.multiaquecedores.com.br/aquecedor-a-gas-rinnai-reu-e35-fea-35-litros-gn-ou-glp",
    "fh40": "https://www.globaltechbrasil.com/5067-bomba-de-calor-para-banho-fromtherm-fh40-60",
    "fh80": "https://www.globaltechbrasil.com/7009-bomba-de-calor-para-banho-fromtherm-fh80-60o",
    "fenolico": "https://www.google.com/search?q=divis%C3%B3ria+sanit%C3%A1ria+fen%C3%B3lica+TS+10mm+pre%C3%A7o+m2&hl=pt-BR&gl=br",
    "libell": "https://www.google.com/search?q=bebedouro+industrial+inox+50+litros+%C3%A1gua+gelada+pre%C3%A7o+IBBL+OR+Libell+OR+Venax&hl=pt-BR&gl=br",
    "venancio": "https://www.extra.com.br/kit-bebedouro-industrial-50-litros-refrigerado-inox-bi50l-220v-filtro-venancio/p/1579422979",
    "leblon": "https://www.lojadomecanico.com.br/produto/74017/59/513/espreguicadeira-leblon-branca-tramontina-92256010",
    "espreg": "https://www.google.com/search?q=espregui%C3%A7adeira+alum%C3%ADnio+piscina+fibra+sint%C3%A9tica+OR+corda+n%C3%A1utica+pre%C3%A7o&hl=pt-BR&gl=br",
    "sofa": "https://www.google.com/search?q=sof%C3%A1+%C3%A1rea+externa+alum%C3%ADnio+corda+n%C3%A1utica+3+lugares+estofado+imperme%C3%A1vel+pre%C3%A7o&hl=pt-BR&gl=br",
    "sinapi_pergolado": "https://orcamentor.com/composicao/103315/",
    "pergolado_guia": "https://www.google.com/search?q=pergolado+alum%C3%ADnio+pre%C3%A7o+m2+instalado+2026&hl=pt-BR&gl=br",
    "pergolux": "https://www.google.com/search?q=pergolado+alum%C3%ADnio+pre%C3%A7o+m2+instalado+2026&hl=pt-BR&gl=br",
    "ripatto": "https://www.ripatto.com.br",
    "sinapi_manta": "https://orcamentor.com/composicao/98546/",
    "sinapi_protecao": "https://orcamentor.com/composicao/98565/",
    "sinapi_porcelanato": "https://orcamentor.com/composicao/87263/",
    "sinapi_pastilha": "https://orcamentor.com/composicao/88789/",
    "oasi": "https://www.telhanorte.com.br/porcelanato-oasi-duna-90x90-ext-ret-cx-2-42-m2-portobello-2547929/p",
    "ralo_leroy": "https://www.google.com/search?q=ralo+linear+inox+100+cm+%C3%A1rea+externa+pre%C3%A7o&hl=pt-BR&gl=br",
    "ralo_royal": "https://www.ralolinear.com.br",
    "wpc": "https://deckdeck.com.br/produto/deck-ecologico-in-brasil-tipo-ype-02-pecas-32x150x3000-090-m2-a-caixa/",
    "sinapi_eletricista": "https://orcamentor.com/composicao/88264/",
    "sinapi_encanador": "https://orcamentor.com/composicao/88267/",
    "prefeitura": "https://prefeitura.sp.gov.br/documents/d/licenciamento/tabela_fev-2026_definitiva-pdf",
    "bombeiros": "https://www.legisweb.com.br/legislacao/?id=357293",
    "avcb": "https://engefogo.com.br/avcb-e-clcb/quanto-custa",
    "projeto": "https://www.cronoshare.com.br/quanto-custa/projeto-arquitetura/sao-paulo",
    "laudo": "https://trt16.jus.br/site/conteudo/licitacao/view/lic_inteiro_teor_mapa.view.php?id=9634",
    "laudo_guia": "https://larpontual.com.br/portal/o-que-faz-um-engenheiro-civil",
    "cub": "https://sindusconsp.com.br/servicos/cub/",
}

R, RB, REF, EST, INT = "Real", "Real (busca)", "Referência", "Estimativa", "Estimativa sobre preço real"


def item(grupo, descricao, fornecedor, qtd, un, unit, tipo, link="", base="", chave=""):
    return {"grupo": grupo, "descricao": descricao, "fornecedor": fornecedor,
            "qtd": qtd, "un": un, "unitario": round(unit, 2), "tipo": tipo,
            "link": link, "base": base, "chave": chave, "data": DATA}


ITENS = {
    "essencial": [
        item("banheiras", "Banheira de gelo Ice Flow Uno Intense, 290 L, 4 °C, ozônio e filtro, para 30+ usuários/dia", "Pretty Jet / Ice Flow", 4, "un", 29840, R, L["iceflow"], "Preço PIX", "banheira"),
        item("banheiras", "Frete, nivelamento da base e ligação elétrica dedicada das banheiras", "Instalador", 4, "un", 2500, EST, "", "Valor de mercado para instalação simples; incerteza média"),
        item("seca", "Sala de sauna seca sob medida, 12 lugares (4,5 x 3,0 m), lambril de cedrinho, bancos em 2 níveis, porta de vidro, isolamento", "Marcenaria de saunas", 1, "vb", 115000, EST, L["moveisdeck"], "Ancorada na Móveis Deck (R$ 12.559/m² de projeção); faixa de R$ 120 mil a R$ 250 mil com aquecedor; incerteza média a alta", "seca"),
        item("seca", "Aquecedor elétrico 18 kW com quadro digital (até 55,5 m³)", "Globaltech Brasil (Impercap)", 1, "un", 7465.50, R, L["impercap18"], "Preço PIX/boleto", "seca"),
        item("vapor", "Sala de vapor em alvenaria com pastilha, bancos e teto inclinado, 8 lugares (3,0 x 2,5 m)", "Construtora", 1, "vb", 75000, EST, L["sinapi_pastilha"], "45 m² de pastilha (SINAPI 88789, R$ 433/m²) + impermeabilização, bancos, teto e instalações; incerteza média", "vapor"),
        item("vapor", "Gerador de vapor Compact Line Inox 24 kW (até 40 m³)", "Globaltech Brasil (Sodramar)", 1, "un", 4108.50, R, L["sodramar24"], "Preço PIX", "vapor"),
        item("vapor", "Porta de aço inox 0,57 x 1,90 m com visor", "Sol e Água (Sodramar)", 1, "un", 2690.80, RB, L["porta_vapor"], "Visto em busca; confirmar", "vapor"),
        item("duchas", "Balde de água fria basculante em inox, sob medida", "Serralheria inox", 1, "un", 5000, EST, "", "Não há produto nacional de catálogo; faixa de R$ 3 mil a R$ 8 mil; incerteza alta", "balde"),
        item("duchas", "Misturador termostático para chuveiro de contraste (Decaterm 2430)", "Amazon (Deca)", 1, "un", 4750, RB, L["decaterm"], "Visto em busca; confirmar", "contraste"),
        item("duchas", "Ducha cascata linear inox 304, 60 cm", "Cascatas & Cia", 1, "un", 1009.17, R, L["cascata60"], "Preço PIX", "cascata"),
        item("duchas", "Ducha coluna tubular inox 316 (higienização e ducha acessível)", "Cascatas & Cia", 2, "un", 3003.49, R, L["coluna316"], "Preço PIX", "acessivel"),
        item("duchas", "Aquecedor a gás de passagem Rinnai REU E35, 35 L/min", "Multi Aquecedores", 1, "un", 5291.40, R, L["rinnai"], "Preço PIX; depende de ponto de gás no local", "maquinas"),
        item("apoio", "Armários fenólicos TS 10 mm para área úmida, instalados", "Fabricante de divisórias TS", 30, "porta", 1200, EST, L["fenolico"], "Chapa TS a cerca de R$ 600/m² + ferragens inox e montagem; faixa R$ 900 a R$ 1.800; incerteza alta", "armarios"),
        item("apoio", "Bebedouro industrial inox 50 L, água gelada (Libell LIC050)", "Dutra Máquinas", 1, "un", 1619.91, RB, L["libell"], "Visto em busca; confirmar", "bebedouro"),
        item("apoio", "Espreguiçadeira Tramontina Leblon (kit com 6)", "Loja do Mecânico", 2, "kit", 1519.92, RB, L["leblon"], "Visto em busca; confirmar", "lounge"),
        item("apoio", "Sofá externo 3 lugares, alumínio e corda náutica (Arte Mobiliário Vip)", "Arte Mobiliário", 2, "un", 2954.42, RB, L["sofa"], "Visto em busca; frete à parte", "lounge"),
        item("apoio", "Toalheiros, lixeiras, relógios de parede e comunicação visual", "Diversos", 1, "vb", 6000, EST, "", "Verba"),
        item("cobertura", "Pergolado de madeira sobre as banheiras", "SINAPI 103315", 40, "m²", 319.85, REF, L["sinapi_pergolado"], "Composição SINAPI 09/2026, média nacional", "pergolado"),
        item("cobertura", "Painel de privacidade ripado em madeira tratada, 2,2 m de altura, instalado", "Serralheria e marcenaria", 100, "m²", 800, EST, L["ripatto"], "Faixa de R$ 700 a R$ 1.500/m² instalado; incerteza média", "painel"),
        item("piso", "Demolição do deck na zona molhada e descarte", "Construtora", 110, "m²", 60, EST, "", "Mão de obra e caçamba; incerteza média"),
        item("piso", "Regularização com caimento de 1% a 2% para os ralos", "Construtora", 110, "m²", 90, EST, "", "Contrapiso armado; incerteza média"),
        item("piso", "Impermeabilização com manta asfáltica 4 mm", "SINAPI 98546", 110, "m²", 137.79, REF, L["sinapi_manta"], "Composição SINAPI 09/2026"),
        item("piso", "Proteção mecânica 3 cm", "SINAPI 98565", 110, "m²", 65.70, REF, L["sinapi_protecao"], "Composição SINAPI 09/2026"),
        item("piso", "Porcelanato externo antiderrapante 60 x 60 assentado (exigir R11)", "SINAPI 87263", 110, "m²", 113.68, REF, L["sinapi_porcelanato"], "Composição SINAPI 09/2026 com material e mão de obra"),
        item("piso", "Ralo linear inox 100 cm", "Leroy Merlin", 15, "un", 261.63, RB, L["ralo_leroy"], "Visto em busca; confirmar"),
        item("infra", "Elétrica: ramal trifásico dedicado (60 a 90 kW), quadro com DR, aterramento equipotencial e iluminação de serviço", "Instaladora elétrica", 1, "vb", 85000, EST, L["sinapi_eletricista"], "Horas SINAPI de eletricista (R$ 45,13/h) + cabos e quadros; depende da distância ao quadro geral; incerteza alta"),
        item("infra", "Hidráulica: água fria e quente, esgoto, pluvial e ligação das banheiras", "Instaladora hidráulica", 1, "vb", 55000, EST, L["sinapi_encanador"], "Horas SINAPI de encanador (R$ 40,92/h) + tubulações; incerteza alta"),
        item("infra", "Exaustão e ventilação das saunas", "Instaladora", 1, "vb", 12000, EST, "", "Dutos, grelhas e exaustor temporizado"),
        item("infra", "Casa de máquinas compacta e ventilada", "Construtora", 1, "vb", 20000, EST, "", "Abrigo para quadros, aquecedor e gerador", "maquinas"),
        item("infra", "Montagem e comissionamento dos equipamentos", "Fornecedores e instaladora", 1, "vb", 40000, EST, "", "10% a 20% do valor dos equipamentos nacionais"),
        item("estrutura", "Reserva para reforço estrutural do deck, se o laudo indicar", "Construtora", 1, "vb", 60000, EST, "", "Só é usada se o laudo pedir; incerteza alta"),
        item("seguranca", "Botões de emergência, termostatos de segurança, timers, sinalização de regras e kit de primeiros socorros", "Diversos", 1, "vb", 8000, EST, "", "Verba"),
        item("projeto", "Levantamento planialtimétrico e cadastral", "Topografia", 1, "vb", 4000, EST, "", "Valor de mercado; incerteza média"),
        item("projeto", "Laudo estrutural com ART (inspeção e verificação de cargas)", "Escritório de estruturas", 1, "vb", 18000, EST, L["laudo"], "Faixa de R$ 8 mil a R$ 30 mil; incerteza alta"),
        item("projeto", "Projeto de arquitetura, executivo e complementares", "Escritório de arquitetura", 1, "vb", 70000, EST, L["projeto"], "5% a 12% do custo da obra; incerteza alta"),
        item("projeto", "Alvará de Aprovação de Reforma (R$ 6,97/m²)", "Prefeitura de São Paulo", 175, "m²", 6.97, REF, L["prefeitura"], "Tabela oficial a partir de 02/02/2026"),
        item("projeto", "Alvará de Execução de Reforma", "Prefeitura de São Paulo", 1, "un", 1116.27, REF, L["prefeitura"], "Tabela oficial a partir de 02/02/2026"),
        item("projeto", "Projeto técnico e atualização do AVCB", "Engenharia de incêndio", 1, "vb", 10000, EST, L["avcb"], "Faixa de R$ 5 mil a R$ 25 mil; incerteza alta"),
        item("projeto", "Taxas do Corpo de Bombeiros (análise e vistoria)", "Corpo de Bombeiros SP", 2, "taxa", 147.53, REF, L["bombeiros"], "3,84 UFESP (R$ 38,42) por taxa para até 750 m²"),
    ],
    "recomendado": [
        item("banheiras", "Banheira de gelo Ice Flow Glass para 2 pessoas, 195 x 90 cm, lateral de vidro, 4 °C", "Pretty Jet / Ice Flow", 4, "un", 48009, R, L["iceflow"], "Preço PIX", "banheira"),
        item("banheiras", "Frete, nivelamento da base e ligação elétrica dedicada das banheiras", "Instalador", 4, "un", 3000, EST, "", "Valor de mercado; incerteza média"),
        item("seca", "Sala de sauna seca sob medida, 16 lugares, bancos em 3 níveis, janela panorâmica, iluminação LED quente", "Marcenaria de saunas", 1, "vb", 165000, EST, L["moveisdeck"], "Ancorada na Móveis Deck; faixa de R$ 120 mil a R$ 250 mil; incerteza média a alta", "seca"),
        item("seca", "Aquecedor elétrico 27 kW com comando Wi-Fi", "Piscinacenter (Impercap)", 1, "un", 16171.10, RB, L["impercap27"], "Visto em busca, à vista; confirmar", "seca"),
        item("vapor", "Sala de vapor com pastilha de porcelana, bancos ergonômicos e teto inclinado, 8 lugares", "Construtora", 1, "vb", 110000, EST, L["sinapi_pastilha"], "Faixa de R$ 70 mil a R$ 150 mil; incerteza média", "vapor"),
        item("vapor", "Gerador de vapor 24 kW inox com comando digital", "Globaltech Brasil (Impercap)", 1, "un", 5685.44, R, L["impercap_vapor24"], "Preço PIX", "vapor"),
        item("vapor", "Porta de aço inox 0,57 x 1,90 m com visor", "Sol e Água (Sodramar)", 1, "un", 2690.80, RB, L["porta_vapor"], "Visto em busca; confirmar", "vapor"),
        item("ir", "Sauna infravermelha Kiva Radiance full spectrum, 4 pessoas", "Kiva Wellness Brasil", 1, "un", 57499, R, L["kiva"], "Preço cheio; garantia comercial de 1 ano", "ir"),
        item("ir", "Abrigo fechado e ventilado para a cabine infravermelha", "Marcenaria", 1, "vb", 15000, EST, "", "Cabine é de uso interno e precisa de abrigo ao ar livre", "ir"),
        item("duchas", "Balde de água fria TylöHelo (importado, internado)", "esaunashop (UE)", 1, "un", 13600, INT, L["tylohelo"], "€ 1.075 + frete + impostos (fator de cerca de 2,1)", "balde"),
        item("duchas", "Misturador termostático para chuveiros de contraste (Decaterm 2430)", "Amazon (Deca)", 2, "un", 4750, RB, L["decaterm"], "Visto em busca; confirmar", "contraste"),
        item("duchas", "Ducha cascata linear inox 304, 100 cm", "Cascatas & Cia", 1, "un", 1345.58, R, L["cascata100"], "Preço PIX", "cascata"),
        item("duchas", "Cascata chuva inox 316 de embutir com LED", "Tropical Cascatas", 1, "un", 1826.20, R, L["cascata_teto"], "Preço à vista", "cascata"),
        item("duchas", "Ducha coluna tubular inox 316 (higienização e ducha acessível)", "Cascatas & Cia", 2, "un", 3003.49, R, L["coluna316"], "Preço PIX", "acessivel"),
        item("duchas", "Bomba de calor para banho Fromtherm FH40, água a 60 °C", "Globaltech Brasil", 1, "un", 23682.40, R, L["fh40"], "Preço à vista", "maquinas"),
        item("duchas", "Reservatório térmico 500 L", "Diversos", 1, "un", 10000, EST, "", "Sem preço público; faixa de R$ 6 mil a R$ 15 mil", "maquinas"),
        item("apoio", "Armários fenólicos TS 10 mm com fechadura eletrônica, instalados", "Fabricante de divisórias TS", 40, "porta", 1400, EST, L["fenolico"], "Faixa R$ 900 a R$ 1.800 por porta; incerteza alta", "armarios"),
        item("apoio", "Bebedouro industrial inox 50 L com filtro (Venâncio BI50L)", "Extra", 1, "un", 2732.41, RB, L["venancio"], "Visto em busca; confirmar", "bebedouro"),
        item("apoio", "Espreguiçadeira de alumínio e corda náutica (Kiev)", "Leroy Merlin", 8, "un", 1980, RB, L["espreg"], "Visto em busca; confirmar", "lounge"),
        item("apoio", "Sofá externo 3 lugares com espuma para área externa (Sulvimes Acapulco)", "Sulvimes", 3, "un", 9066.12, RB, L["sofa"], "Visto em busca; confirmar", "lounge"),
        item("apoio", "Toalheiros, lixeiras, chá e água, paisagismo e comunicação visual", "Diversos", 1, "vb", 10000, EST, "", "Verba"),
        item("cobertura", "Pergolado de alumínio com policarbonato alveolar sobre banheiras e duchas", "Serralheria", 70, "m²", 900, EST, L["pergolado_guia"], "Guias de mercado: R$ 680 a R$ 1.100/m²", "pergolado"),
        item("cobertura", "Painel de privacidade ripado de alumínio, 2,2 m de altura, instalado", "Ripatto e serralheria", 110, "m²", 900, EST, L["ripatto"], "Material R$ 575/m² (real, busca) + estrutura e montagem", "painel"),
        item("piso", "Demolição do deck na zona molhada e descarte", "Construtora", 130, "m²", 60, EST, "", "Incerteza média"),
        item("piso", "Regularização com caimento de 1% a 2% para os ralos", "Construtora", 130, "m²", 90, EST, "", "Incerteza média"),
        item("piso", "Impermeabilização com manta asfáltica 4 mm", "SINAPI 98546", 130, "m²", 137.79, REF, L["sinapi_manta"], "Composição SINAPI 09/2026"),
        item("piso", "Proteção mecânica 3 cm", "SINAPI 98565", 130, "m²", 65.70, REF, L["sinapi_protecao"], "Composição SINAPI 09/2026"),
        item("piso", "Porcelanato externo Portobello Oasi Duna 90 x 90 (exigir R11), com 10% de perda", "Telhanorte", 143, "m²", 174.90, R, L["oasi"], "Preço da página"),
        item("piso", "Assentamento do porcelanato (mão de obra e argamassa)", "Construtora", 130, "m²", 60, EST, "", "Incerteza média"),
        item("piso", "Ralo linear inox Royal 100 cm", "Ralo Linear", 18, "un", 740.74, RB, L["ralo_royal"], "Visto em busca; confirmar"),
        item("piso", "Deck WPC tipo ipê no lounge", "deckdeck (In Brasil)", 45, "m²", 461.34, R, L["wpc"], "Preço por m² da página"),
        item("piso", "Instalação do deck WPC", "Instalador", 45, "m²", 80, EST, "", "Incerteza média"),
        item("infra", "Elétrica: ramal trifásico dedicado (60 a 90 kW), quadro com DR, aterramento equipotencial e iluminação de serviço", "Instaladora elétrica", 1, "vb", 90000, EST, L["sinapi_eletricista"], "Incerteza alta"),
        item("infra", "Hidráulica: água fria e quente, esgoto, pluvial e ligação das banheiras", "Instaladora hidráulica", 1, "vb", 65000, EST, L["sinapi_encanador"], "Incerteza alta"),
        item("infra", "Exaustão e ventilação das saunas", "Instaladora", 1, "vb", 15000, EST, "", "Dutos, grelhas e exaustor temporizado"),
        item("infra", "Casa de máquinas compacta e ventilada", "Construtora", 1, "vb", 25000, EST, "", "Abrigo para quadros, bomba de calor e gerador", "maquinas"),
        item("infra", "Montagem e comissionamento dos equipamentos", "Fornecedores e instaladora", 1, "vb", 45000, EST, "", "10% a 20% do valor dos equipamentos"),
        item("estrutura", "Reserva para reforço estrutural do deck, se o laudo indicar", "Construtora", 1, "vb", 80000, EST, "", "Só é usada se o laudo pedir; incerteza alta"),
        item("seguranca", "Botões de emergência, termostatos de segurança, timers, sinalização e primeiros socorros", "Diversos", 1, "vb", 10000, EST, "", "Verba"),
        item("seguranca", "Iluminação cênica LED quente (cerca de 2200 K) e balizadores", "Luminotécnica", 1, "vb", 25000, EST, "", "Verba"),
        item("seguranca", "Som ambiente para sessões guiadas", "Áudio", 1, "vb", 8000, EST, "", "Verba"),
        item("seguranca", "Controle de acesso com reserva de horário (leitor da carteirinha e tablet)", "Integradora", 1, "vb", 15000, EST, "", "Pode usar o sistema do clube; verba"),
        item("projeto", "Levantamento planialtimétrico e cadastral", "Topografia", 1, "vb", 4000, EST, "", "Incerteza média"),
        item("projeto", "Laudo estrutural com ART (inspeção e verificação de cargas)", "Escritório de estruturas", 1, "vb", 22000, EST, L["laudo"], "Faixa de R$ 8 mil a R$ 30 mil; incerteza alta"),
        item("projeto", "Projeto de arquitetura, executivo, luminotécnico e complementares", "Escritório de arquitetura", 1, "vb", 110000, EST, L["projeto"], "5% a 12% do custo da obra; incerteza alta"),
        item("projeto", "Alvará de Aprovação de Reforma (R$ 6,97/m²)", "Prefeitura de São Paulo", 175, "m²", 6.97, REF, L["prefeitura"], "Tabela oficial a partir de 02/02/2026"),
        item("projeto", "Alvará de Execução de Reforma", "Prefeitura de São Paulo", 1, "un", 1116.27, REF, L["prefeitura"], "Tabela oficial a partir de 02/02/2026"),
        item("projeto", "Projeto técnico e atualização do AVCB", "Engenharia de incêndio", 1, "vb", 15000, EST, L["avcb"], "Faixa de R$ 5 mil a R$ 25 mil; incerteza alta"),
        item("projeto", "Taxas do Corpo de Bombeiros (análise e vistoria)", "Corpo de Bombeiros SP", 2, "taxa", 147.53, REF, L["bombeiros"], "3,84 UFESP por taxa"),
    ],
    "premium": [
        item("banheiras", "Banheira de gelo Plunge All-In Commercial, filtro NSF50, ozônio (importada, internada)", "Plunge (EUA)", 4, "un", 133200, INT, L["plunge"], "US$ 12.990 + frete US$ 1.500 + impostos e despesas", "banheira"),
        item("banheiras", "Frete interno, base e ligação elétrica dedicada das banheiras", "Instalador", 4, "un", 4000, EST, "", "Incerteza média"),
        item("seca", "Sala de sauna seca premium sob projeto, 16 lugares, madeira termotratada e vidro panorâmico", "Fabricante sob orçamento", 1, "vb", 220000, EST, L["moveisdeck"], "Sem preço público; incerteza alta", "seca"),
        item("seca", "Aquecedor Harvia Virta Pro 20 kW com comando Xenio e pedras (importado, internado)", "Topture (EUA)", 1, "un", 76700, INT, L["harvia"], "Kit US$ 7.207 + frete + impostos", "seca"),
        item("vapor", "Sala de vapor premium com pedra natural, bancos aquecidos e teto abobadado", "Construtora", 1, "vb", 160000, EST, L["sinapi_pastilha"], "Faixa de R$ 150 mil a R$ 250 mil no premium; incerteza alta", "vapor"),
        item("vapor", "Gerador Tylö Steam Commercial 15 kW com comando Elite (importado, internado)", "Pool and Spa Centre (UK)", 1, "un", 81200, INT, L["tylo_steam"], "£ 5.636 + frete + impostos", "vapor"),
        item("ir", "Sauna infravermelha Clearlight Sanctuary Retreat full spectrum, 3 a 4 pessoas (importada, internada)", "Clearlight (loja oficial, EUA)", 1, "un", 105300, INT, L["clearlight"], "US$ 9.499 (basswood) + frete US$ 1.500 + impostos e 6% de despesas", "ir"),
        item("ir", "Abrigo fechado e ventilado para a cabine infravermelha", "Marcenaria", 1, "vb", 20000, EST, "", "Verba", "ir"),
        item("duchas", "Balde de água fria TylöHelo (importado, internado)", "esaunashop (UE)", 2, "un", 13600, INT, L["tylohelo"], "€ 1.075 + frete + impostos", "balde"),
        item("duchas", "Misturador termostático para chuveiros de contraste (Decaterm 2430)", "Amazon (Deca)", 3, "un", 4750, RB, L["decaterm"], "Visto em busca; confirmar", "contraste"),
        item("duchas", "Ducha cascata linear inox 304, 300 cm", "Cascatas & Cia", 1, "un", 5046.22, R, L["cascata300"], "Preço PIX", "cascata"),
        item("duchas", "Cascata chuva inox 316 de embutir com LED", "Tropical Cascatas", 2, "un", 1826.20, R, L["cascata_teto"], "Preço à vista", "cascata"),
        item("duchas", "Ducha coluna tubular inox 316 (higienização e ducha acessível)", "Cascatas & Cia", 2, "un", 3003.49, R, L["coluna316"], "Preço PIX", "acessivel"),
        item("duchas", "Bomba de calor para banho Fromtherm FH80, água a 60 °C", "Globaltech Brasil", 1, "un", 35834.45, R, L["fh80"], "Preço à vista", "maquinas"),
        item("duchas", "Reservatório térmico 1.000 L", "Diversos", 1, "un", 15000, EST, "", "Sem preço público; incerteza alta", "maquinas"),
        item("apoio", "Armários em inox 304 com fechadura eletrônica, instalados", "Sob encomenda", 40, "porta", 2500, EST, "", "Faixa de R$ 2 mil a R$ 4 mil por porta; incerteza alta", "armarios"),
        item("apoio", "Bebedouro industrial inox 50 L com filtro (Venâncio BI50L)", "Extra", 1, "un", 2732.41, RB, L["venancio"], "Visto em busca; confirmar", "bebedouro"),
        item("apoio", "Espreguiçadeira premium de alumínio e corda náutica (Noronha)", "Decor'Da Móveis", 10, "un", 3370, RB, L["espreg"], "Visto em busca; confirmar", "lounge"),
        item("apoio", "Sofá externo 3 lugares alto padrão (CarmelaBlend Maldivas)", "CarmelaBlend", 3, "un", 16536, RB, L["sofa"], "Visto em busca; confirmar", "lounge"),
        item("apoio", "Toalheiros aquecidos, chá e água, paisagismo e comunicação visual", "Diversos", 1, "vb", 15000, EST, "", "Verba"),
        item("cobertura", "Pérgola bioclimática de lâminas 4 x 5 m (Pergolux)", "Pergolux Brasil", 3, "un", 42499, RB, L["pergolux"], "Visto em busca; montagem à parte", "pergolado"),
        item("cobertura", "Montagem e fixação das pérgolas", "Serralheria", 1, "vb", 15000, EST, "", "Verba", "pergolado"),
        item("cobertura", "Painel de privacidade em alumínio ripado com vidro jateado, instalado", "Serralheria", 110, "m²", 1400, EST, L["ripatto"], "Faixa de R$ 700 a R$ 1.500/m²", "painel"),
        item("piso", "Demolição do deck na zona molhada e descarte", "Construtora", 130, "m²", 60, EST, "", "Incerteza média"),
        item("piso", "Regularização com caimento de 1% a 2% para os ralos", "Construtora", 130, "m²", 90, EST, "", "Incerteza média"),
        item("piso", "Impermeabilização com manta asfáltica 4 mm", "SINAPI 98546", 130, "m²", 137.79, REF, L["sinapi_manta"], "Composição SINAPI 09/2026"),
        item("piso", "Proteção mecânica 3 cm", "SINAPI 98565", 130, "m²", 65.70, REF, L["sinapi_protecao"], "Composição SINAPI 09/2026"),
        item("piso", "Porcelanato externo Portobello Oasi Duna 90 x 90 (exigir R11), com 10% de perda", "Telhanorte", 143, "m²", 174.90, R, L["oasi"], "Preço da página"),
        item("piso", "Assentamento do porcelanato (mão de obra e argamassa)", "Construtora", 130, "m²", 60, EST, "", "Incerteza média"),
        item("piso", "Ralo linear inox Royal 100 cm", "Ralo Linear", 18, "un", 740.74, RB, L["ralo_royal"], "Visto em busca; confirmar"),
        item("piso", "Deck WPC tipo ipê no lounge", "deckdeck (In Brasil)", 45, "m²", 461.34, R, L["wpc"], "Preço por m² da página"),
        item("piso", "Instalação do deck WPC", "Instalador", 45, "m²", 80, EST, "", "Incerteza média"),
        item("infra", "Elétrica: ramal trifásico dedicado (até 100 kW), quadro com DR, aterramento equipotencial", "Instaladora elétrica", 1, "vb", 105000, EST, L["sinapi_eletricista"], "Incerteza alta"),
        item("infra", "Hidráulica: água fria e quente, esgoto, pluvial e ligação das banheiras", "Instaladora hidráulica", 1, "vb", 75000, EST, L["sinapi_encanador"], "Incerteza alta"),
        item("infra", "Exaustão e ventilação das saunas", "Instaladora", 1, "vb", 18000, EST, "", "Verba"),
        item("infra", "Casa de máquinas compacta e ventilada", "Construtora", 1, "vb", 30000, EST, "", "Verba", "maquinas"),
        item("infra", "Montagem e comissionamento dos equipamentos", "Fornecedores e instaladora", 1, "vb", 70000, EST, "", "10% a 20% do valor dos equipamentos"),
        item("estrutura", "Reserva para reforço estrutural do deck, se o laudo indicar", "Construtora", 1, "vb", 100000, EST, "", "Só é usada se o laudo pedir; incerteza alta"),
        item("seguranca", "Botões de emergência, termostatos de segurança, timers, sinalização e primeiros socorros", "Diversos", 1, "vb", 12000, EST, "", "Verba"),
        item("seguranca", "Iluminação cênica LED quente com automação de cenas", "Luminotécnica", 1, "vb", 45000, EST, "", "Verba"),
        item("seguranca", "Som ambiente multizona", "Áudio", 1, "vb", 15000, EST, "", "Verba"),
        item("seguranca", "Controle de acesso com reserva de horário e catraca", "Integradora", 1, "vb", 25000, EST, "", "Verba"),
        item("projeto", "Levantamento planialtimétrico e cadastral", "Topografia", 1, "vb", 4000, EST, "", "Incerteza média"),
        item("projeto", "Laudo estrutural com ART (inspeção e verificação de cargas)", "Escritório de estruturas", 1, "vb", 25000, EST, L["laudo"], "Faixa de R$ 8 mil a R$ 30 mil; incerteza alta"),
        item("projeto", "Projeto de arquitetura, executivo, luminotécnico e complementares", "Escritório de arquitetura", 1, "vb", 150000, EST, L["projeto"], "5% a 12% do custo da obra; incerteza alta"),
        item("projeto", "Alvará de Aprovação de Reforma (R$ 6,97/m²)", "Prefeitura de São Paulo", 175, "m²", 6.97, REF, L["prefeitura"], "Tabela oficial a partir de 02/02/2026"),
        item("projeto", "Alvará de Execução de Reforma", "Prefeitura de São Paulo", 1, "un", 1116.27, REF, L["prefeitura"], "Tabela oficial a partir de 02/02/2026"),
        item("projeto", "Projeto técnico e atualização do AVCB", "Engenharia de incêndio", 1, "vb", 20000, EST, L["avcb"], "Faixa de R$ 5 mil a R$ 25 mil; incerteza alta"),
        item("projeto", "Taxas do Corpo de Bombeiros (análise e vistoria)", "Corpo de Bombeiros SP", 2, "taxa", 147.53, REF, L["bombeiros"], "3,84 UFESP por taxa"),
    ],
}

# Custo operacional mensal, cenário Recomendado (premissas editáveis na planilha)
OPERACIONAL = {
    "premissas": [
        {"id": "tarifa_kwh", "nome": "Tarifa de energia B3 com tributos (R$/kWh)", "valor": 1.05, "base": "Enel SP, B3 R$ 0,789 sem tributos desde 04/07/2026; com ICMS e PIS/COFINS R$ 1,02 a R$ 1,08", "link": "https://calculadoraenergia.com.br/tarifa/enel-sp"},
        {"id": "tarifa_agua", "nome": "Água e esgoto comercial (R$/m³, acima de 50 m³)", "valor": 63.68, "base": "Sabesp/ARSESP, vigência jan/2026", "link": "https://www.arsesp.sp.gov.br/Documentosgerais/NT_1__REAJUSTE_TARIFARIO_DA_SABESP__Tarifa_Aplicacao___URAE1___assinado.pdf"},
        {"id": "horas_dia", "nome": "Horas de funcionamento por dia", "valor": 14, "base": "Premissa: 8 h às 22 h"},
        {"id": "visitas_dia", "nome": "Visitas por dia (ocupação média de 40%)", "valor": 170, "base": "Cálculo da capacidade: 30 pessoas por hora x 14 h x 40%"},
        {"id": "posto_mes", "nome": "Custo de um posto terceirizado de 44 h (R$/mês)", "valor": 5500, "base": "Faixa de R$ 4.500 a R$ 6.500 com encargos", "link": "https://www.al.sp.gov.br/spl/2026/05/Acessorio/1000690012_1000859822_Acessorio.pdf"},
    ],
    "energia": [
        # equipamento, kW nominal, fração de uso, horas (None = horas_dia)
        {"nome": "Sauna seca (aquecedor)", "kw": 20, "uso": 0.45, "horas": None},
        {"nome": "Sauna a vapor (gerador)", "kw": 24, "uso": 0.30, "horas": None},
        {"nome": "Sauna infravermelha", "kw": 2.62, "uso": 0.60, "horas": 10},
        {"nome": "4 chillers das banheiras", "kw": 4.0, "uso": 0.60, "horas": 24},
        {"nome": "Bomba de calor das duchas", "kw": 2.0, "uso": 1.0, "horas": None},
        {"nome": "Iluminação, bombas, exaustão e bebedouro", "kw": 1.5, "uso": 1.0, "horas": None},
    ],
    "agua": [
        {"nome": "Duchas (2 por visita, 25 L cada)", "m3_mes": 255},
        {"nome": "Troca de água das banheiras (semanal)", "m3_mes": 7},
        {"nome": "Sauna a vapor", "m3_mes": 3},
        {"nome": "Limpeza", "m3_mes": 10},
    ],
    "fixos": [
        {"nome": "Atendentes (2,5 postos para cobrir 14 h por dia, 7 dias)", "postos": 2.5},
        {"nome": "Limpeza (1 posto)", "postos": 1},
        {"nome": "Manutenção preventiva de saunas e chillers", "valor": 1650, "base": "Faixa de R$ 800 a R$ 2.500/mês; estimativa"},
        {"nome": "Filtros, ozônio, cloro e química das banheiras", "valor": 1000, "base": "Refil de filtro R$ 80 (Ice Flow) trocado a cada 15 dias em uso comercial + química"},
        {"nome": "Reserva para reposição (pedras, resistências, peças)", "valor": 1500, "base": "Estimativa"},
    ],
}

CRONOGRAMA = [
    # tarefa, semana de início, duração em semanas, fase
    ("Levantamento e laudo estrutural", 1, 3, "projeto"),
    ("Projeto executivo e complementares", 3, 8, "projeto"),
    ("Aprovações: Prefeitura, Bombeiros e Vigilância Sanitária", 9, 12, "aprovacao"),
    ("Compra e fabricação dos equipamentos nacionais", 14, 9, "compra"),
    ("Importados, só no Premium (60 a 120 dias)", 11, 18, "compra"),
    ("Demolição do deck e preparo", 20, 2, "obra"),
    ("Reforço estrutural, se o laudo pedir", 22, 3, "obra"),
    ("Infraestrutura hidráulica e elétrica", 23, 6, "obra"),
    ("Impermeabilização e teste de estanqueidade", 27, 4, "obra"),
    ("Piso, pergolado e painéis de privacidade", 30, 5, "obra"),
    ("Instalação das saunas, banheiras e duchas", 31, 5, "obra"),
    ("Acabamentos, mobiliário e paisagismo", 34, 3, "obra"),
    ("Testes, ajustes e treinamento da equipe", 36, 3, "testes"),
    ("Inauguração", 39, 1, "marco"),
]


def totais(cenario):
    linhas = ITENS[cenario]
    por_grupo = {g: 0.0 for g, _, _ in GRUPOS}
    for l in linhas:
        por_grupo[l["grupo"]] += l["qtd"] * l["unitario"]
    subtotal = sum(por_grupo.values())
    civil = sum(por_grupo[g] for g, _, c in GRUPOS if c)
    bdi = civil * BDI
    contingencia = (subtotal + bdi) * CONTINGENCIA
    total = subtotal + bdi + contingencia
    por_tipo = {}
    for l in linhas:
        por_tipo[l["tipo"]] = por_tipo.get(l["tipo"], 0) + l["qtd"] * l["unitario"]
    return {
        "grupos": {g: round(v, 2) for g, v in por_grupo.items()},
        "subtotal": round(subtotal, 2), "obra_civil": round(civil, 2),
        "bdi": round(bdi, 2), "contingencia": round(contingencia, 2),
        "total": round(total, 2), "por_tipo": {k: round(v, 2) for k, v in por_tipo.items()},
        "por_chave": {
            k: round(sum(l["qtd"] * l["unitario"] for l in linhas if l["chave"] == k), 2)
            for k in sorted({l["chave"] for l in linhas if l["chave"]})
        },
    }


def operacional():
    p = {x["id"]: x["valor"] for x in OPERACIONAL["premissas"]}
    energia = []
    for e in OPERACIONAL["energia"]:
        horas = e["horas"] or p["horas_dia"]
        kwh = e["kw"] * e["uso"] * horas * 30
        energia.append({**e, "horas": horas, "kwh_mes": round(kwh, 1), "custo": round(kwh * p["tarifa_kwh"], 2)})
    agua = [{**a, "custo": round(a["m3_mes"] * p["tarifa_agua"], 2)} for a in OPERACIONAL["agua"]]
    fixos = []
    for f in OPERACIONAL["fixos"]:
        valor = f["postos"] * p["posto_mes"] if "postos" in f else f["valor"]
        fixos.append({**f, "custo": round(valor, 2)})
    total = sum(x["custo"] for x in energia + agua + fixos)
    return {
        "premissas": OPERACIONAL["premissas"], "energia": energia, "agua": agua, "fixos": fixos,
        "kwh_mes": round(sum(x["kwh_mes"] for x in energia), 1),
        "total_energia": round(sum(x["custo"] for x in energia), 2),
        "total_agua": round(sum(x["custo"] for x in agua), 2),
        "total_fixos": round(sum(x["custo"] for x in fixos), 2),
        "total_mes": round(total, 2),
        "por_socio_mes": round(total / SOCIOS, 2),
        "por_visita": round(total / (p["visitas_dia"] * 30), 2),
        "socios": SOCIOS,
    }


def gerar_json():
    dados = {
        "data_consulta": DATA,
        "bdi": BDI, "contingencia": CONTINGENCIA,
        "cenarios": CENARIOS,
        "grupos": [{"id": g, "nome": n, "obra_civil": c} for g, n, c in GRUPOS],
        "itens": ITENS,
        "totais": {c["id"]: totais(c["id"]) for c in CENARIOS},
        "operacional": operacional(),
        "cronograma": [{"tarefa": t, "inicio": i, "duracao": d, "fase": f} for t, i, d, f in CRONOGRAMA],
    }
    destino = RAIZ / "data" / "projeto.json"
    destino.parent.mkdir(exist_ok=True)
    destino.write_text(json.dumps(dados, ensure_ascii=False, indent=1), encoding="utf-8")
    return dados


# ---------------------------------------------------------------- planilha

FONTE = "Arial"
AZUL = Font(name=FONTE, color="0000FF")
NORMAL = Font(name=FONTE)
NEGRITO = Font(name=FONTE, bold=True)
TITULO = Font(name=FONTE, bold=True, size=14, color="B71C1C")
CAB = Font(name=FONTE, bold=True, color="FFFFFF")
CAB_FILL = PatternFill("solid", fgColor="B71C1C")
GRUPO_FILL = PatternFill("solid", fgColor="F5E6E6")
TOTAL_FILL = PatternFill("solid", fgColor="EEEEEE")
LINHA = Border(bottom=Side(style="thin", color="DDDDDD"))
MOEDA = '"R$" #,##0.00;("R$" #,##0.00);-'
MOEDA0 = '"R$" #,##0;("R$" #,##0);-'
LINK_FONT = Font(name=FONTE, color="0563C1", underline="single")


def cabecalho(ws, linha, titulos, larguras):
    for i, (t, w) in enumerate(zip(titulos, larguras), start=1):
        c = ws.cell(row=linha, column=i, value=t)
        c.font, c.fill = CAB, CAB_FILL
        c.alignment = Alignment(wrap_text=True, vertical="center")
        ws.column_dimensions[get_column_letter(i)].width = w


def aba_cenario(wb, cenario):
    ws = wb.create_sheet(cenario["nome"])
    ws["A1"] = f"Orçamento detalhado, cenário {cenario['nome']}"
    ws["A1"].font = TITULO
    ws["A2"] = cenario["resumo"] + f" Preços consultados em {DATA}. Azul = valor digitado (entrada); preto = fórmula."
    ws["A2"].font = NORMAL
    cols = ["Grupo", "Item", "Fornecedor", "Qtd", "Un", "Unitário (R$)", "Total (R$)", "Tipo", "Base / observação", "Link", "Data da consulta"]
    cabecalho(ws, 4, cols, [24, 60, 26, 7, 7, 15, 16, 22, 50, 40, 14])
    linha = 5
    linhas_grupo = {}
    for gid, gnome, civil in GRUPOS:
        itens = [i for i in ITENS[cenario["id"]] if i["grupo"] == gid]
        if not itens:
            continue
        inicio = linha
        for it in itens:
            valores = [gnome, it["descricao"], it["fornecedor"], it["qtd"], it["un"], it["unitario"],
                       f"=D{linha}*F{linha}", it["tipo"], it["base"], it["link"], it["data"]]
            for col, v in enumerate(valores, start=1):
                c = ws.cell(row=linha, column=col, value=v)
                c.font = NORMAL
                c.border = LINHA
                c.alignment = Alignment(wrap_text=col in (2, 9), vertical="top")
            ws.cell(row=linha, column=4).font = AZUL
            ws.cell(row=linha, column=6).font = AZUL
            ws.cell(row=linha, column=6).number_format = MOEDA
            ws.cell(row=linha, column=7).number_format = MOEDA
            if it["link"]:
                c = ws.cell(row=linha, column=10)
                c.hyperlink = it["link"]
                c.font = LINK_FONT
            linha += 1
        ws.cell(row=linha, column=1, value=f"Subtotal {gnome}").font = NEGRITO
        c = ws.cell(row=linha, column=7, value=f"=SUM(G{inicio}:G{linha - 1})")
        c.font, c.number_format = NEGRITO, MOEDA
        for col in range(1, 12):
            ws.cell(row=linha, column=col).fill = GRUPO_FILL
        linhas_grupo[gid] = linha
        linha += 2

    def soma(ids):
        refs = [f"G{linhas_grupo[g]}" for g in ids if g in linhas_grupo]
        return "=" + "+".join(refs) if refs else "=0"

    resumo = {}
    blocos = [
        ("subtotal", "Subtotal (todos os grupos)", soma([g for g, _, _ in GRUPOS])),
        ("civil", "Base de obra civil para BDI (cobertura, piso, infraestrutura, estrutura, segurança)", soma([g for g, _, c in GRUPOS if c])),
    ]
    for chave, rotulo, formula in blocos:
        ws.cell(row=linha, column=2, value=rotulo).font = NEGRITO
        c = ws.cell(row=linha, column=7, value=formula)
        c.font, c.number_format = NEGRITO, MOEDA
        resumo[chave] = linha
        linha += 1
    ws.cell(row=linha, column=2, value="Taxa de BDI e administração da obra").font = NORMAL
    c = ws.cell(row=linha, column=6, value=BDI)
    c.font, c.number_format = AZUL, "0.0%"
    resumo["taxa_bdi"] = linha
    linha += 1
    ws.cell(row=linha, column=2, value="BDI e administração da obra").font = NEGRITO
    c = ws.cell(row=linha, column=7, value=f"=G{resumo['civil']}*F{resumo['taxa_bdi']}")
    c.font, c.number_format = NEGRITO, MOEDA
    resumo["bdi"] = linha
    linha += 1
    ws.cell(row=linha, column=2, value="Taxa de contingência (faixa pedida de 10% a 15%)").font = NORMAL
    c = ws.cell(row=linha, column=6, value=CONTINGENCIA)
    c.font, c.number_format = AZUL, "0.0%"
    resumo["taxa_cont"] = linha
    linha += 1
    ws.cell(row=linha, column=2, value="Contingência").font = NEGRITO
    c = ws.cell(row=linha, column=7, value=f"=(G{resumo['subtotal']}+G{resumo['bdi']})*F{resumo['taxa_cont']}")
    c.font, c.number_format = NEGRITO, MOEDA
    resumo["cont"] = linha
    linha += 1
    ws.cell(row=linha, column=2, value="TOTAL DO CENÁRIO").font = NEGRITO
    c = ws.cell(row=linha, column=7, value=f"=G{resumo['subtotal']}+G{resumo['bdi']}+G{resumo['cont']}")
    c.font, c.number_format = NEGRITO, MOEDA
    for col in range(1, 12):
        ws.cell(row=linha, column=col).fill = TOTAL_FILL
    resumo["total"] = linha
    ws.freeze_panes = "C5"
    return ws, linhas_grupo, resumo


def gerar_planilha(dados):
    wb = Workbook()
    res = wb.active
    res.title = "Resumo"
    refs = {}
    for cen in CENARIOS:
        ws, grupos, resumo = aba_cenario(wb, cen)
        refs[cen["id"]] = (ws.title, grupos, resumo)

    res["A1"] = "Espaço Wellness do Esporte Clube Sírio: resumo do orçamento"
    res["A1"].font = TITULO
    res["A2"] = (f"Valores em R$. Preços consultados em {DATA}. Cada linha das abas de cenário diz se o preço é Real "
                 "(página do vendedor), Real (busca), Referência (SINAPI, tabela oficial) ou Estimativa.")
    res["A2"].font = NORMAL
    cabecalho(res, 4, ["Grupo"] + [c["nome"] for c in CENARIOS], [52, 20, 20, 20])
    linha = 5
    for gid, gnome, _ in GRUPOS:
        res.cell(row=linha, column=1, value=gnome).font = NORMAL
        for j, cen in enumerate(CENARIOS, start=2):
            aba, grupos, _ = refs[cen["id"]]
            formula = f"='{aba}'!G{grupos[gid]}" if gid in grupos else 0
            c = res.cell(row=linha, column=j, value=formula)
            c.font = Font(name=FONTE, color="008000") if gid in grupos else NORMAL
            c.number_format = MOEDA0
        linha += 1
    for rotulo, chave in [("Subtotal", "subtotal"), ("BDI e administração da obra (15% sobre obra civil)", "bdi"),
                          ("Contingência (12%)", "cont"), ("TOTAL", "total")]:
        res.cell(row=linha, column=1, value=rotulo).font = NEGRITO
        for j, cen in enumerate(CENARIOS, start=2):
            aba, _, resumo = refs[cen["id"]]
            c = res.cell(row=linha, column=j, value=f"='{aba}'!G{resumo[chave]}")
            c.font = Font(name=FONTE, bold=True, color="008000")
            c.number_format = MOEDA0
            if chave == "total":
                c.fill = TOTAL_FILL
        linha += 1
    linha_total = linha - 1
    res.cell(row=linha, column=1, value="Teto do clube").font = NORMAL
    c = res.cell(row=linha, column=2, value=2000000)
    c.font, c.number_format = AZUL, MOEDA0
    linha_teto = linha
    linha += 1
    res.cell(row=linha, column=1, value="Folga em relação ao teto (negativo = acima)").font = NORMAL
    for j in range(2, 5):
        col = get_column_letter(j)
        c = res.cell(row=linha, column=j, value=f"=$B${linha_teto}-{col}{linha_total}")
        c.font, c.number_format = NORMAL, MOEDA0
    linha += 1
    res.cell(row=linha, column=1, value=f"Custo por sócio ({SOCIOS} sócios), investimento").font = NORMAL
    for j in range(2, 5):
        col = get_column_letter(j)
        c = res.cell(row=linha, column=j, value=f"={col}{linha_total}/{SOCIOS}")
        c.font, c.number_format = NORMAL, MOEDA
    res.freeze_panes = "B5"

    aba_operacional(wb, dados["operacional"])
    aba_cronograma(wb)
    aba_fontes(wb)
    wb.calculation.fullCalcOnLoad = True
    destino = RAIZ / "orcamento-wellness-sirio.xlsx"
    wb.save(destino)
    return destino


def aba_operacional(wb, op):
    ws = wb.create_sheet("Custo operacional")
    ws["A1"] = "Custo operacional mensal estimado (cenário Recomendado)"
    ws["A1"].font = TITULO
    ws["A2"] = "Azul = premissa editável. Todos os valores são estimativas com a base indicada."
    ws["A2"].font = NORMAL
    cabecalho(ws, 4, ["Premissa", "Valor", "Base", "Link"], [52, 16, 70, 40])
    linha = 5
    ref = {}
    for p in OPERACIONAL["premissas"]:
        ws.cell(row=linha, column=1, value=p["nome"]).font = NORMAL
        c = ws.cell(row=linha, column=2, value=p["valor"])
        c.font = AZUL
        ws.cell(row=linha, column=3, value=p["base"]).font = NORMAL
        if p.get("link"):
            c = ws.cell(row=linha, column=4, value=p["link"])
            c.hyperlink, c.font = p["link"], LINK_FONT
        ref[p["id"]] = f"$B${linha}"
        linha += 1
    linha += 1
    cabecalho(ws, linha, ["Energia", "kW", "Fração de uso", "Horas/dia", "kWh/mês", "Custo (R$/mês)"], [52, 16, 16, 12, 14, 16])
    linha += 1
    inicio = linha
    for e in OPERACIONAL["energia"]:
        ws.cell(row=linha, column=1, value=e["nome"]).font = NORMAL
        for col, v in [(2, e["kw"]), (3, e["uso"])]:
            ws.cell(row=linha, column=col, value=v).font = AZUL
        ws.cell(row=linha, column=3).number_format = "0%"
        c = ws.cell(row=linha, column=4, value=e["horas"] if e["horas"] else f"={ref['horas_dia']}")
        c.font = AZUL if e["horas"] else NORMAL
        ws.cell(row=linha, column=5, value=f"=B{linha}*C{linha}*D{linha}*30").number_format = "#,##0"
        c = ws.cell(row=linha, column=6, value=f"=E{linha}*{ref['tarifa_kwh']}")
        c.number_format = MOEDA
        linha += 1
    ws.cell(row=linha, column=1, value="Total energia").font = NEGRITO
    ws.cell(row=linha, column=5, value=f"=SUM(E{inicio}:E{linha - 1})").number_format = "#,##0"
    c = ws.cell(row=linha, column=6, value=f"=SUM(F{inicio}:F{linha - 1})")
    c.font, c.number_format = NEGRITO, MOEDA
    total_energia = linha
    linha += 2
    cabecalho(ws, linha, ["Água e esgoto", "m³/mês", "", "", "", "Custo (R$/mês)"], [52, 16, 16, 12, 14, 16])
    linha += 1
    inicio = linha
    for a in OPERACIONAL["agua"]:
        ws.cell(row=linha, column=1, value=a["nome"]).font = NORMAL
        ws.cell(row=linha, column=2, value=a["m3_mes"]).font = AZUL
        c = ws.cell(row=linha, column=6, value=f"=B{linha}*{ref['tarifa_agua']}")
        c.number_format = MOEDA
        linha += 1
    ws.cell(row=linha, column=1, value="Total água e esgoto").font = NEGRITO
    c = ws.cell(row=linha, column=6, value=f"=SUM(F{inicio}:F{linha - 1})")
    c.font, c.number_format = NEGRITO, MOEDA
    total_agua = linha
    linha += 2
    cabecalho(ws, linha, ["Pessoal e manutenção", "Postos", "", "", "", "Custo (R$/mês)"], [52, 16, 16, 12, 14, 16])
    linha += 1
    inicio = linha
    for f in OPERACIONAL["fixos"]:
        ws.cell(row=linha, column=1, value=f["nome"]).font = NORMAL
        if "postos" in f:
            ws.cell(row=linha, column=2, value=f["postos"]).font = AZUL
            c = ws.cell(row=linha, column=6, value=f"=B{linha}*{ref['posto_mes']}")
            c.font = NORMAL
        else:
            c = ws.cell(row=linha, column=6, value=f["valor"])
            c.font = AZUL
            ws.cell(row=linha, column=3, value=f["base"]).font = NORMAL
        c.number_format = MOEDA
        linha += 1
    ws.cell(row=linha, column=1, value="Total pessoal e manutenção").font = NEGRITO
    c = ws.cell(row=linha, column=6, value=f"=SUM(F{inicio}:F{linha - 1})")
    c.font, c.number_format = NEGRITO, MOEDA
    total_fixos = linha
    linha += 2
    ws.cell(row=linha, column=1, value="CUSTO OPERACIONAL MENSAL").font = NEGRITO
    c = ws.cell(row=linha, column=6, value=f"=F{total_energia}+F{total_agua}+F{total_fixos}")
    c.font, c.number_format, c.fill = NEGRITO, MOEDA, TOTAL_FILL
    total = linha
    linha += 1
    ws.cell(row=linha, column=1, value=f"Por sócio por mês ({SOCIOS} sócios)").font = NEGRITO
    c = ws.cell(row=linha, column=6, value=f"=F{total}/{SOCIOS}")
    c.font, c.number_format = NEGRITO, MOEDA
    linha += 1
    ws.cell(row=linha, column=1, value="Por visita").font = NEGRITO
    c = ws.cell(row=linha, column=6, value=f"=F{total}/({ref['visitas_dia']}*30)")
    c.font, c.number_format = NEGRITO, MOEDA
    linha += 2
    ws.cell(row=linha, column=1, value=("Fora do total: lavanderia de toalhas, se o clube fornecer (cerca de R$ 2,50 por "
                                        "visita). Parte da água das duchas já é consumida hoje pelos sócios na piscina.")).font = NORMAL


def aba_cronograma(wb):
    ws = wb.create_sheet("Cronograma")
    ws["A1"] = "Cronograma por fases (semanas a partir da aprovação no comitê)"
    ws["A1"].font = TITULO
    ws["A2"] = "Semana 1 = 04/01/2027 se o comitê aprovar até dezembro de 2026. Inauguração prevista na semana 39 (fim de setembro de 2027)."
    ws["A2"].font = NORMAL
    cabecalho(ws, 4, ["Fase", "Início (semana)", "Duração (semanas)", "Fim (semana)"], [58, 16, 18, 14])
    preenchido = PatternFill("solid", fgColor="D32F2F")
    for s in range(1, 41):
        col = 4 + s
        ws.cell(row=4, column=col, value=s).font = CAB
        ws.cell(row=4, column=col).fill = CAB_FILL
        ws.column_dimensions[get_column_letter(col)].width = 3.2
    for i, (t, ini, dur, _) in enumerate(CRONOGRAMA, start=5):
        ws.cell(row=i, column=1, value=t).font = NORMAL
        ws.cell(row=i, column=2, value=ini).font = AZUL
        ws.cell(row=i, column=3, value=dur).font = AZUL
        ws.cell(row=i, column=4, value=f"=B{i}+C{i}-1").font = NORMAL
        for s in range(ini, ini + dur):
            ws.cell(row=i, column=4 + s).fill = preenchido
    ws.freeze_panes = "B5"


def aba_fontes(wb):
    ws = wb.create_sheet("Fontes")
    ws["A1"] = "Fontes e tipos de preço"
    ws["A1"].font = TITULO
    linhas = [
        ("Real", "Preço público lido na página do vendedor em 29/10/2026."),
        ("Real (busca)", "Preço visto no Google Shopping ou em resultado de busca; a página do vendedor bloqueia leitura automática. Confirmar antes de comprar."),
        ("Referência", "Tabela oficial ou índice: SINAPI 09/2026, CUB SindusCon-SP set/2026, tarifas, taxas, PTAX."),
        ("Estimativa", "Sem preço público. Base e incerteza descritas na linha."),
        ("Estimativa sobre preço real", "Importado: preço real de origem + frete + II, IPI, PIS/COFINS e ICMS-SP + 6% de despesas. PTAX 29/10/2026: US$ 1 = R$ 5,3744; € 1 = R$ 6,00; £ 1 = R$ 7,1899."),
        ("CUB R8-N set/2026", "R$ 2.238,58/m² sem desoneração (SindusCon-SP), usado como referência de custo de obra."),
    ]
    cabecalho(ws, 3, ["Tipo", "Significado"], [30, 120])
    for i, (a, b) in enumerate(linhas, start=4):
        ws.cell(row=i, column=1, value=a).font = NEGRITO
        ws.cell(row=i, column=2, value=b).font = NORMAL
    ws.cell(row=11, column=1, value="Links usados").font = NEGRITO
    for i, url in enumerate(sorted(set(L.values())), start=12):
        c = ws.cell(row=i, column=1, value=url)
        c.hyperlink, c.font = url, LINK_FONT


if __name__ == "__main__":
    dados = gerar_json()
    xlsx = gerar_planilha(dados)
    for c in CENARIOS:
        t = dados["totais"][c["id"]]
        print(f"{c['nome']:12} subtotal {t['subtotal']:>14,.2f}  bdi {t['bdi']:>12,.2f}  "
              f"contingencia {t['contingencia']:>12,.2f}  total {t['total']:>14,.2f}")
    op = dados["operacional"]
    print(f"Operacional: {op['total_mes']:,.2f}/mes; por socio {op['por_socio_mes']:.2f}; por visita {op['por_visita']:.2f}; kWh {op['kwh_mes']}")
    print("Gerado:", xlsx)
