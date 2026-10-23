# Testes e critérios de validação

Execute os comandos na raiz do repositório com Node.js 22 e as dependências
instaladas por `npm ci`. As suítes têm escopos diferentes: um contrato estático
não comprova que uma interação funciona no navegador.

## Verificações principais

| Comando | O que verifica |
| --- | --- |
| `npm run docs:check` | Destinos dos links locais da documentação atual. |
| `npm run doctor` | Versões de ferramentas, lockfile e presença das dependências. |
| `npm run lock:verify` | Coerência de versão e dependências entre manifest e lockfile. |
| `npm run typecheck` | Tipos TypeScript. |
| `npm run qa` | Regressões estáticas, contratuais e de domínio. |
| `npm run release:verify` | Doctor, verificações de source, QA, build e integridade do `dist`. |

`source:verify` requer dependências instaladas, pois inclui TypeScript e suítes
que importam módulos da aplicação. Um diagnóstico de DNS isolado no doctor
não comprova falha de instalação quando o registro está acessível pelo proxy.

## Comportamento de Jornada e Blueprint

```bash
npm run editor:selection:test
npm run journey:a2:test
npm run journey:h1709:move:test
npm run journey:h1709:test
npm run journey:h1709:p3:test
npm run journey:layout:test
npm run blueprint:methodology:test
npm run journey:starter:test
npm run journey:growth:test
npm run journey:content:test
npm run journey:picker:test
npm run journey:context:test
npm run journey:observation:test
npm run journey:cards:test
```

Esses testes exercitam operações como seleção, criação e movimentação de cartões,
imutabilidade, referências, layout, revisão operacional e serialização.

## Testes no navegador

Para instalar as ferramentas de teste em um ambiente Python isolado:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install playwright pillow
python -m playwright install --with-deps chromium
```

A instalação das bibliotecas de sistema do Chromium pode exigir permissões
administrativas no seu sistema. No ambiente de nuvem preparado, Python,
Playwright, Pillow e Chromium já estão disponíveis.

Depois de gerar o build:

```bash
npm run build
npm run entry:browser
npm run journey:browser
npm run editor:browser
npm run blueprint:methodology:browser
npm run product:browser
npm run maps:browser
python3 scripts/h1710-journey-template-whiteboard-browser.py
python3 scripts/journey-progressive-browser.py
npm run journey:growth:browser
npm run journey:content:browser
npm run journey:picker:browser
npm run journey:observation:browser
npm run journey:cards:browser
npm run maps:matrix:browser
```

Esses runners podem servir o `dist/` em um servidor temporário. Para os que
suportam `BLUE_OCEAN_URL`, defina essa variável quando quiser validar uma
instância já iniciada. `CHROMIUM_PATH` permite selecionar o executável do
Chromium instalado no sistema. Consulte o início do runner para suas opções.

As evidências ficam em `artifacts/`, que não deve ser versionado. A integração
contínua publica as evidências dos testes como artefatos da execução no GitHub Actions.

`product:browser` verifica a navegação Colaboração → Configurações → Jornada,
o alinhamento com sidebar expandida/recolhida, a entrada local, os estados
indisponíveis de nuvem e o conteúdo real do backup baixado durante a edição.
Também executa axe-core nas páginas inteiras dos cenários auditados em desktop
e celular. O pacote axe-core é instalado por `npm ci`; essa suíte não depende de AXE_PATH.

`journey-progressive-browser.py` cobre a matriz integrada: visão essencial,
faixas ocultas sem perda de conteúdo, ordem e preferências por Jornada, desfazer
e refazer, emoções e observações, painel de Insights, reabertura e edição por
toque. Executa axe-core em 1440, 834 e 390 px e salva as evidências em
`artifacts/journey-progressive/`.

`journey:growth:browser` percorre rascunho de etapa, registros emocionais com
fonte, aquisição na mesma Jornada, dor → plano canônico → indicador → medição,
desfazer/refazer, persistência, backup e resumo HTML. Executa axe-core no mapa,
planejamento, acompanhamento e apresentação em desktop e larguras menores; as
evidências ficam em `artifacts/journey-growth/`. Os dados são simulados para QA.
Esses testes não representam pesquisa com clientes ou validação comercial.

`journey:content:browser` verifica composição de texto, cartões, emojis, imagens
e links, modelos e configuração de faixas, movimentação, histórico, projeções
canônicas, persistência, backup e HTML independente. Audita os novos menus,
formulários e apresentação com axe-core nas três larguras. Evidências em
`artifacts/journey-content/`.

`journey:picker:browser` verifica catálogo contextual, busca, teclado, criação
direta de faixa, escala não preenchida/zero, embeds com carregamento explícito,
vínculos canônicos de planejamento e métrica, medição, histórico e reabertura.
Audita catálogo e mapa em 1440, 834 e 390 px e valida criação por toque. O player
externo usa uma resposta de teste; a disponibilidade real dos provedores não é
verificada pelo runner. Evidências em `artifacts/journey-picker/`.

`maps:browser` verifica os botões de Jornada e Blueprint em 1440, 834 e 390 px.
Confere rodapés com nomes longos, busca, Cards/Tabela, confirmação de exclusão,
criação de etapas, foco de teclado e a continuidade entre os dois editores.
Executa axe-core na Jornada e nas bibliotecas e salva capturas em `artifacts/map-actions/`.

`entry:browser` também valida o início guiado em três larguras: prévia sem dados
automáticos, retorno ao mapa vazio, foco e criação por Enter, faixa vinculada
e Ajustar à tela sem alteração do conteúdo. Para incluir as auditorias desse
runner, use `AXE_PATH=node_modules/axe-core/axe.min.js npm run entry:browser`.

## Visual e acessibilidade

`npm run e2e:visual` produz capturas e executa os checks definidos pelo runner.
Uma comparação visual só ocorre quando existe uma imagem de referência aplicável;
produzir capturas não significa ter passado em uma comparação com baseline.
Atualize referências com `e2e:visual:baseline` apenas após revisão das imagens.

Alguns runners aceitam `AXE_PATH` apontando para uma cópia confiável de
`axe.min.js`. Sem essa variável, não afirme que a auditoria automática de
acessibilidade foi executada. A auditoria automática não substitui a verificação manual.

## Como relatar resultados

Informe o commit, o comando, o resultado e os cenários executados. Separe falhas,
checks não executados e pré-requisitos ausentes. Relatórios históricos em
`docs/archive/validacoes/` descrevem suas próprias versões; não validam uma
alteração atual. Não sobrescreva esses registros com resultados de uma execução nova.


O comando `npm run journey:elements:browser` verifica a inserção de Canal,
Persona, Dor, Necessidade, Evidência e Oportunidade já existentes, a independência
da legenda local, a atualização da fonte, biblioteca vazia ou fonte removida,
reordenação, recarga, histórico e resumo HTML. Também exercita a restauração da
curva de emoções pelo catálogo, com etapas ausentes e dados não informados,
hipóteses e acesso pela célula selecionada. Usa registros fictícios no Service
Graph e a interação real dos seletores, com axe em 1440, 834 e 390 px e em
um dispositivo com toque. As capturas
ficam em `artifacts/journey-elements/` e são publicadas na CI.


`npm run journey:context:test` verifica o isolamento de emoções por Persona,
compatibilidade dos registros sem Persona, rejeição de fontes inválidas e o
vínculo dor–evidência–ocorrência–backlog. `npm run journey:context:browser` executa
os controles reais para separar faixas e conteúdo, selecionar Personas, trocar
contextos emocionais, ligar evidências, planejar e exportar o resumo. Inclui
histórico, recarga e axe em 1440, 834 e 390 px. Os registros de biblioteca são
fictícios; isso não equivale a validar o produto com participantes. Capturas e
resultados ficam em `artifacts/journey-context/`, publicados na CI.

## Especificação por observação pública

`journey:observation:test` exercita os contratos de inserção estável, cópia
profunda, configuração sem dados duplicados, nomes/limites, isolamento por
jornada, Persona removida, novas faixas e serialização.
`journey:observation:browser` executa as tarefas B03–B08 da
[especificação](specs/journey-editor-behavior.md): posição de inserção, padrão e
busca, atalhos com proteção de edição, referências, visualizações, histórico,
exportação, reordenação/recarga, teclado e toque. Gera capturas e relatórios axe
em `artifacts/journey-observation/` para 1440, 834 e 390 px.

A referência externa foi lida em documentação pública. Estes testes validam o
Blue Ocean; não comprovam uma comparação interativa com o produto observado.
