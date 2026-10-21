# BLUE OCEAN Service Studio — V1.20.5-H7.31

## Evidence & Learning System

A H7.31 fecha o elo entre teste e aprendizado. O Prototype Lab continua responsável por executar e concluir experimentos; a nova perspectiva **Aprendizados** transforma cada rodada concluída em evidência rastreável e em uma síntese explícita para decisão humana.

### Service Workspace

A sequência passa a ser:

`Pesquisa → Ecologia → Proposição → Journey → Canais → Protótipos → Aprendizados → Blueprint → Whiteboard`

O overview agora trabalha com nove perspectivas conectadas e inclui o card **APRENDER**.

### Evidência canônica

Ao acionar **Gerar evidência + aprendizado**, a plataforma cria registros em `entities.evidence` com:

- `sourceType: experiment`;
- origem no Service Prototype Lab;
- método/fidelidade do experimento;
- data da rodada concluída;
- tamanho da amostra;
- `experimentId` e, quando aplicável, `prototypeCriterionId` ou índice da observação;
- proveniência `H7.31 Evidence & Learning System`.

A mesma rodada não cria duplicatas se for processada novamente.

### Aprendizado

Cada aprendizado captura:

- hipótese da rodada;
- resultado original do experimento;
- verdict determinístico: `validated`, `refuted` ou `inconclusive`;
- confiança inicial: `low`, `medium` ou `high`;
- recomendação inicial: `keep`, `iterate` ou `retest`;
- síntese editável;
- racional/implicação;
- IDs das evidências associadas;
- status `draft`, `reviewed` ou `archived`.

Confiança e recomendação podem ser revisadas pelo usuário. A plataforma registra conhecimento, mas não toma a decisão de aplicar mudanças.

### Proteções

A H7.31 não modifica automaticamente:

- Journey;
- etapas;
- Touchpoints;
- Canais;
- Proposição;
- cenários “E se?”;
- Blueprint/Whiteboard.

A aplicação de mudanças pertence à próxima fase, **H7.32 — Decision & Iteration Loop**.

## QA

- H7.31 Evidence & Learning System: **141/141 PASS**
- H7.30 Service Prototype Lab: **129/129 PASS**
- H7.29 Channels + Touchpoints + Continuity: **129/129 PASS**
- H7.28 Blueprint Semantic Zoom + Custom Layers: **93/93 PASS**
- suíte acumulada: **3009 OK / 0 FAIL**
- `syntax:check`: PASS
- `lock:verify`: PASS
- `source:authority`: PASS
- `foundation:smoke`: 12/12 PASS
- `project-foundation:smoke`: 46/46 PASS
- `preflight-linux.sh`: PASS
- TypeScript strict do núcleo H7.31: PASS

### Limitação de validação

O pacote final permanece sem `node_modules`. A tentativa de `npm ci` não concluiu dentro da janela de execução e foi encerrada/limpa. Por isso o **typecheck React completo, build Vite e validação visual real em navegador não são declarados como PASS**.
