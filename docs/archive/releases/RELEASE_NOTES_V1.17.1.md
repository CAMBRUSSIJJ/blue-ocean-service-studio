# BLUE OCEAN Service Studio — V1.17.1

## Jornadas & Blueprints Library

### Adicionado

- ordenação persistente nas bibliotecas de Jornadas e Blueprints;
- filtros rápidos: Todos, Ativos/Ativas, Favoritos/Favoritas e Atenção;
- seleção múltipla por checkbox;
- barra de ações em lote;
- ações em lote: favoritar, ativar e arquivar;
- previews estruturais de templates;
- novo asset `v1171-library.css`;
- novo marcador `bo-v1171`;
- gate `library:smoke` com 16 contratos.

### Melhorado

- cards de Jornada agora representam etapas e lanes de forma visual;
- cards de Blueprint representam colunas e densidade estrutural com mais clareza;
- templates deixam de usar apenas barras abstratas;
- visualização em lista ganha seleção e estado selecionado;
- filtros e ordenação permanecem entre acessos usando o metadata já existente;
- biblioteca responsiva reorganiza filtros e previews em telas menores.

### Corrigido

- Journey Home deixa de registrar versão interna histórica e passa a receber `APP_VERSION` pelo pipeline;
- smoke da Home 2.0 aceita releases posteriores à V1.17.0;
- preferências `sortBy` e `libraryPreset` são inicializadas de forma retrocompatível;
- seleção em Blueprint não dispara abertura do artefato acidentalmente.

### Removido

Nenhuma funcionalidade existente foi removida.

Não foram adicionadas ações em lote destrutivas de exclusão.

### Compatibilidade

Sem mudança de:

- Service Graph Schema V3;
- IDs `rt*`;
- storage keys;
- formato de backup;
- migrations existentes.

### QA

- V1.17.1 Library: 16/16;
- todos os gates anteriores V1.12–V1.17.0 passaram;
- Demo smoke: 79 objetos, 0 referências quebradas;
- package-lock: OK;
- source authority: OK;
- source foundation: 12/12;
- assets públicos gerados e JS runtime com sintaxe válida.

### Limitação de validação

O ambiente de execução não conseguiu concluir `npm ci` por timeout de acesso ao registry. Assim, typecheck React/Vite e build completo devem ser confirmados no Linux, CI ou Vercel com acesso ao registry.
