# BLUE OCEAN Service Studio — V1.20.5-H7.20
## Dashboard Composition & Density

Release sobre H7.19-H1 focada somente em composição do Dashboard. Não adiciona módulos e não altera o Journey Cover System, a navegação nem o branding oceânico recuperado no hotfix anterior.

## Problemas observados na Home

### 1. Recentes ocupava uma bandeja larga demais
Com três artefatos, o container continuava usando quase toda a largura do workspace. O resultado era uma área vazia muito maior que o conteúdo e sensação de produto incompleto.

**Correção:** a largura de `Recentes` agora se adapta a `data-recent-count`. Com 1–4 artefatos, a bandeja termina próxima do último card; com 5 itens pode usar a largura desktop completa.

### 2. Capas e cards de artefato tinham pouca presença
A Journey Cover funcionava, mas ficava comprimida em cards estreitos.

**Correção:** cards recentes passam a 210 px de largura, preview 118 px e proporção mais forte. Nenhuma lógica de capa foi alterada.

### 3. Contexto do workspace era redundante em Recentes
O nome do serviço já aparece no seletor global da sidebar.

**Correção:** o chip visual do workspace é ocultado na Home H7.20; os contratos anteriores permanecem no DOM para compatibilidade.

### 4. Favoritos vazio consumia espaço sem entregar conteúdo
A seção vazia repetia texto em uma área desproporcional.

**Correção:** estado vazio vira uma linha utilitária compacta. Quando existem favoritos, o comportamento anterior é preservado.

### 5. Aprender tinha seis cards com peso idêntico
A recomendação contextual competia com os demais itens e todos ficavam estreitos.

**Correção:** a Home mostra 5 itens: 1 recomendação contextual com mais peso + 4 cards secundários.

### 6. Ações e Service Depth pareciam widgets desconectados
Os três atalhos e o indicador de profundidade tinham altura/peso acima do necessário.

**Correção:** ações rápidas ficam mais densas e o chip de profundidade passa a ser um indicador compacto, preservando a mesma lógica e clique.

## Preservado
- H7.19-H1 Visual Recovery;
- animação do Login H7.19;
- sidebar glyph-first;
- Journey Cover H7.18-H1;
- upload e restauração da capa da Journey;
- Ocean Surface H7.17;
- rotas, estados e ações existentes;
- `prefers-reduced-motion`.

## Gates executados
- H7.20 Dashboard Composition: 27/27 PASS
- H7.19-H1 Visual Recovery: 28/28 PASS
- H7.19 Motion Identity: 40/40 PASS
- H7.18-H1 Journey Cover: 35/35 PASS
- H7.18 Animated Ocean Branding: 38/38 PASS
- `npm run qa`: 2096 OK / 0 FAIL
- `npm run syntax:check`: PASS
- `npm run lock:verify`: PASS
- `npm run source:authority`: PASS
- `npm run foundation:smoke`: 12/12 PASS
- `preflight-linux.sh`: PASS

## Limitação de validação
`npm ci` não concluiu dentro do limite do ambiente e foi encerrado. A instalação parcial foi removida. Portanto `typecheck` e `build` completos não são declarados como PASS nesta entrega.
