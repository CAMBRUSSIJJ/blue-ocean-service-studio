# BLUE OCEAN Service Studio — V1.18.8
## Guided Service Builder Foundation

### Objetivo
Transformar a orientação de criação do primeiro serviço em uma capacidade estrutural do produto, sem criar um tutorial rígido e sem poluir a interface profissional.

A V1.18.8 introduz uma camada determinística de guidance que acompanha o usuário no contexto em que ele está trabalhando: Serviço, Persona, Etapas, Jornada, Blueprint, Evidências, Problemas, Oportunidades e Métricas.

### Adicionado
- `src/runtime/guidance-engine.js`: Guidance Engine determinístico.
- `src/runtime/guidance-engine.css`: camada visual compartilhada de orientação.
- três níveis de assistência: **Guiada**, **Essencial** e **Desligada**.
- drawer universal de orientação com:
  - o que é;
  - por que importa;
  - passo a passo;
  - exemplo;
  - erros comuns;
  - checklist.
- ajuda contextual por objeto e por etapa de construção.
- progresso metodológico do primeiro serviço em oito blocos:
  1. Serviço
  2. Cliente
  3. Etapas
  4. Experiência
  5. Operação
  6. Problemas
  7. Melhorias
  8. Métricas
- entrada explícita **Montar serviço guiado** no Dashboard/Aprender.
- acesso global **Ajuda** no shell.
- API `guidedBuilder` V2.0 com snapshot, modo, tópico e catálogo de orientação.
- gate `guidance:smoke` com **117 contratos**.

### Integração com o Whiteboard
O Guided Service Builder reutiliza o fluxo existente do Whiteboard e do Service Graph. Não foi criado um wizard paralelo com outra base de dados.

A orientação acompanha ações reais como:
- definir o serviço;
- criar Persona;
- criar Etapa;
- mapear ação do cliente;
- estruturar Journey/Blueprint;
- identificar Problema;
- criar Oportunidade;
- adicionar Métrica.

O coach flutuante continua **opt-in**. A assistência pode estar configurada como Guiada sem ocupar permanentemente o canvas; ela aparece quando o usuário entra no fluxo guiado ou pede ajuda.

### Guidance Engine
O engine deriva o estado exclusivamente do Service Graph e do contexto do editor. Para cada tópico retorna orientação padronizada e para o serviço calcula deterministicamente:
- blocos concluídos;
- progresso de construção;
- próximo passo;
- contagens relevantes;
- estado de primeiro serviço.

O progresso representa **construção**, não qualidade. Service Health continua sendo a fonte de diagnóstico de qualidade/consistência.

### Preservado
Sem alteração em:
- Service Graph Schema V3;
- IDs canônicos;
- migrations;
- IndexedDB/storage do projeto;
- backups/import/export;
- Service Health;
- Attention Engine;
- Continue/Favorites/Pins;
- Service Architecture;
- Dashboard Parity;
- Journey, Blueprint e Whiteboard existentes.

### QA
- Guided Service Builder: **117/117**.
- Regressão completa V1.12 → V1.18.8: **727 OK / 0 FAIL**.
- Service Architecture: **51/51**.
- Dashboard Parity: **53/53**.
- Continue + Favorites + Pins: **50/50**.
- Attention Engine: **32/32**.
- Service Health: **26/26**.
- Demo: **79 objetos, 0 referências quebradas, 5 etapas, 7 evidências, 7 iniciativas**.
- `tsc --noEmit --noCheck`: aprovado com TypeScript global 5.8.3.
- `node --check`: Guidance Engine e Whiteboard Core aprovados.
- lock verify, source authority, source foundation e preflight Linux: aprovados.

### Limitação do ambiente
`npm ci` foi tentado novamente, mas o npm registry retornou `EAI_AGAIN` durante o download de dependências. O processo parcial foi interrompido e `node_modules` removido.

Por isso esta release não declara como aprovados neste ambiente:
- `npm run typecheck` dependente de `node_modules`;
- `npm run build` React/Vite completo.

Nenhum `dist` antigo é incluído nos pacotes. A entrega permanece **source-first**.
