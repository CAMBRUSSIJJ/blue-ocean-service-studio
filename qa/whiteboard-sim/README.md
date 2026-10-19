# BLUE OCEAN Whiteboard Sim Kit 2.4

Gate funcional para o **Whiteboard Core** e o **Service Builder Assistant**. O kit executa o código real do `whiteboard-core.js` em `jsdom`, com `fake-indexeddb`, e separa claramente:

- **ASSERTION** — contrato bloqueante; `FAIL` derruba o gate.
- **KNOWN ISSUE** — limitação conhecida, visível, mas não mascara regressões novas.
- **DIAGNOSTIC** — observação técnica não bloqueante.
- **BENCHMARK** — número para comparação entre versões; não é FPS real.

## O que mudou na 2.4

1. Mantém o gate comportamental F0–F7 da 2.2.
2. Adiciona contratos estáticos para **zoom 10–400%**, zoom ancorado no cursor e Fit to Content/Selection.
3. Valida a API de **Renomear / Duplicar / Excluir Whiteboard**.
4. Valida renomeação inline e sincronização de Smart Objects com a entidade canônica.
5. Valida a separação **Remover do quadro × Excluir do serviço**.
6. Valida o **Entity Picker V2**: Criar/Reutilizar, agrupamento por origem, prevenção de duplicatas e linguagem contextual para Etapas e Pontos de contato.
7. Continua registrando known issues sem convertê-las artificialmente em PASS.

## Instalação

```bash
cd whiteboard-sim
npm install
python3 build-sim.py /caminho/Blue-Ocean-Service-Studio-V1.19.3-Linux-Source-Launcher
./run-all.sh
```

Sem instalar dependências do simulador, ainda é possível validar os contratos estáticos principais:

```bash
node static-contracts.cjs /caminho/Blue-Ocean-Service-Studio-V1.19.3-Linux-Source-Launcher
```

Ou:

```bash
npm run preflight
npm run qa
```

## Fases

- **F0 — Ambiente e contratos**: bundle, runtime, domínio canônico e workspace vazio.
- **F1 — Partida a frio**: bloqueio sem serviço, Whiteboard vazio e separação de Blueprint.
- **F2 — Brainstorm**: atalhos, edição, foco, drag e Smart Objects.
- **F3 — Estrutura**: frame, grupos, alinhamento, conexões, clipboard, undo e export.
- **F4 — Navegação/persistência**: zoom, pan, limites, localStorage, IndexedDB e conflito.
- **F5 — Escala**: 50 → 2.000 objetos e custo de save/histórico/imagens.
- **F6 — Templates/segurança/acessibilidade**: comandos, smart layout, XSS, mobile e semântica de arestas.
- **F7 — Service Builder Assistant**: serviço confirmado → Whiteboard vazio → assistente → definição → limites → Persona → Jornada → etapas → pergunta metodológica → persistência.

## Escopo real da Fase 7

A Fase 7 usa a criação canônica do **Service Graph** (`createServiceGraph`) como pré-condição e testa o assistente no Whiteboard. Ela **não afirma testar o modal React da Home**, porque esse fluxo depende da aplicação completa. O fluxo visual Home → Criar serviço deve ser validado por um gate de navegador real (Playwright/Chromium) separado.

## Limites

- `jsdom` não calcula layout nem pinta; tempos medem JS/DOM, não FPS de navegador.
- Drag e foco são úteis para regressão, mas pixel, overflow, GPU, pointer/touch real e screenshots exigem navegador real.
- Known issues não são sucesso: aparecem no resumo e devem cair ao longo das versões.
- O gate é válido somente para o `whiteboard-core.js` cujo SHA256 está em `sim-manifest.json`.

## Saída

Cada fase grava `results/rN.json` e o agregador produz:

```text
results/summary.json
```

Exemplo:

```text
ASSERTIONS  PASS 54  FAIL 0
KNOWN ISSUES abertas 6  resolvidas 1
DIAGNOSTICS 18  BENCHMARKS 4
GATE FINAL: PASS
```


### 2.4 — Service Composition Framework
- contratos para Service Recipe por tipo de negócio
- estado livre persistente após “Continuar sozinho”
- nova visualização Serviço
- matriz etapas × experiência × operação × melhoria
- Smart Cards V2
