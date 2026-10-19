# V1.4.3 — Whiteboard UX + Smart Layout

## Objetivo

Transformar o Blueprint em um ambiente visual flexível para modelar serviços, sem perder a estrutura semântica do Service Graph. A experiência combina liberdade de whiteboard com organizações reconhecíveis de Service Blueprint, Journey e fluxo operacional.

## Princípio arquitetural

**Dados do serviço != posição visual no quadro.**

Etapa, Touchpoint, Problema e Oportunidade continuam existindo uma única vez no Service Graph. Um item inteligente no Whiteboard guarda apenas a referência ao objeto e sua geometria visual. Mudar a organização não cria uma segunda entidade.

## Recursos entregues

### 1. Múltiplos quadros
Cada serviço pode manter vários whiteboards. O usuário pode criar um quadro vazio, duplicar o atual, alternar entre quadros e excluir um quadro. A aplicação impede remover o último quadro existente.

### 2. Templates não destrutivos
Aplicar um template cria um novo quadro. O quadro anterior continua disponível.

- **Service Blueprint**: faixas clássicas e cards de partida.
- **Journey visual**: projeta os objetos existentes da jornada e os organiza por etapa.
- **Fluxo de serviço**: seis blocos conectados de Início a Pós-serviço.
- **Descoberta e oportunidades**: frames para Problemas, Insights e Oportunidades.

### 3. Smart Layout
O seletor de modo reorganiza o mesmo conjunto de objetos:

- **Livre**: posição manual preservada.
- **Blueprint**: cria as cinco faixas e distribui objetos por papel semântico.
- **Fluxo**: organiza os objetos sequencialmente.
- **Journey**: organiza Etapas, Touchpoints, Problemas e Oportunidades por coluna/etapa.

### 4. Manipulação do quadro
- pan e zoom;
- fit-to-content;
- grade visual;
- snap em passos de 24 px;
- minimapa;
- seleção múltipla;
- alinhamento;
- distribuição;
- agrupamento e desagrupamento;
- copiar/colar, duplicar e excluir.

### 5. Objetos
Objetos livres: Post-it, Texto, Bloco, Frame, Evidência, Frontstage, Backstage, Processo e Sistema.

Objetos inteligentes: Etapa, Touchpoint, Problema e Oportunidade, sempre ligados ao Service Graph.

### 6. Conexões
Objetos podem ser conectados visualmente. A conexão possui legenda, estilo contínuo/tracejado e direção de seta.

## Persistência

- Service Graph: `realtalent-service-studio-v2-service-graph`
- Preferências V1.4.3: `realtalent-service-studio-v143-whiteboard-meta`

A separação mantém compatibilidade com documentos V2 anteriores e permite evoluir propriedades puramente visuais sem alterar as entidades de negócio.

## QA da build do launcher

A camada V1.4.3 foi testada em Chromium headless com as seguintes verificações funcionais:

- criação de template de Fluxo cria um segundo quadro;
- template de Fluxo cria 6 cards e 5 conexões;
- seleção múltipla de 2 objetos;
- agrupamento atribui o mesmo identificador de grupo aos dois objetos;
- alternância para Blueprint gera 5 faixas;
- criação de novo quadro gera um terceiro quadro vazio;
- nenhuma exceção JavaScript foi registrada nesse fluxo.

A recompilação completa do projeto React não foi realizada neste ambiente porque a instalação npm ficou incompleta por indisponibilidade de rede para obter pacotes de tipagem. Por isso, o ZIP inclui a versão compilada funcional em `dist/` e o código-fonte editável separadamente. Em uma máquina com acesso ao npm, `npm ci` / `npm run build` pode ser usado para reconstruir o projeto.
