# Runtime Architecture V1.9.1

## Objetivo

Reduzir acoplamento entre React e os runtimes históricos sem alterar o modelo de dados nem a experiência visual consolidada na V1.9.0.

## Estrutura

```text
React Shell
   │
   ├── runtime/client.ts
   │       │
   │       ▼
   │  RealTalentRuntime
   │       │
   ├───────┼───────────────┐
   │       │               │
   ▼       ▼               ▼
Data   Journey/Blueprint  Diagnostics
Bridge      APIs             APIs
   │
   ▼
Whiteboard Runtime
   ├── persistence-kernel.js
   ├── view-config.js
   └── journey-templates.js
```

## Runtime Registry

`window.RealTalentRuntime` é o único ponto global de integração intencional. Ele registra APIs nomeadas e elimina a coleção de globals `window.__rt...` usada nas versões anteriores.

APIs registradas atualmente:

- `dataBridge`
- `journeyHome`
- `journeyHomeShell`
- `guidedBuilder`
- `journeyStudio`
- `journeyExperience`
- `blueprintStudio`
- `blueprintHome`
- `blueprintGrid`
- `blueprintLearning`
- `blueprintHealth`
- `blueprintEditor`
- `designSystem`
- `whiteboardCore`
- `whiteboardDiagnostics`
- `globalShell`

## Persistência

O acesso de baixo nível a IndexedDB e o heartbeat de sessão saíram do Whiteboard principal e foram encapsulados em `persistence-kernel.js`.

A lógica de produto continua preservando:

- localStorage como estado local rápido;
- IndexedDB como cópia durável;
- latest-good;
- checkpoints;
- detecção de encerramento inesperado;
- revisionamento para conflito entre abas.

## Patches de DOM

Os `MutationObserver` usados anteriormente para corrigir continuamente a interface foram removidos dos runtimes do produto.

O `shell.js` mantém apenas um bootstrap idempotente com `requestAnimationFrame` para compatibilidade com o bundle React pré-compilado. No código React atual, as classes e labels do shell já são declaradas nativamente.

## Próxima consolidação técnica

Ainda existe lógica significativa dentro de `whiteboard-v1815.js`. A continuação recomendada é mover, progressivamente e com testes de contrato:

1. comandos e atalhos;
2. Service Graph adapters;
3. view engines de Journey/Blueprint/Flow;
4. canvas interaction engine;
5. dialogs e overlays;
6. import/export e diagnóstico.

A V1.9.1 cria a fronteira necessária para essas extrações sem depender novamente de globals ou DOM patching contínuo.
