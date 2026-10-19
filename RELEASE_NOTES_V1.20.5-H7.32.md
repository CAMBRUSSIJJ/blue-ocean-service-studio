# BLUE OCEAN Service Studio — V1.20.5-H7.32
## Decision & Iteration Loop

A H7.32 fecha o elo entre **aprender** e **mudar o serviço**.

O Service Workspace passa a ter dez perspectivas conectadas:

```text
Pesquisa
Ecologia
Proposição
Journey
Canais
Protótipos
Aprendizados
Decisões
Blueprint
Whiteboard
```

## Decisões explícitas

Um aprendizado só entra no Decision Loop depois de ser marcado como **Revisado** na H7.31.

Ao abrir uma decisão, o Blue Ocean captura:

- aprendizado de origem;
- recomendação;
- confiança;
- síntese revisada;
- racional;
- pacote de mudanças propostas.

O fluxo é:

```text
Aprendizado revisado
      ↓
Rascunho
      ↓
Em aprovação
   ↙      ↘
Rejeitada  Aprovada
              ↓
       Aplicação explícita
              ↓
           Aplicada
```

**Aprovar não aplica.** A aplicação exige a ação separada `Aplicar mudança aprovada`.

## Pacote antes → depois

Cada mudança registra:

```text
Alvo
Campo
Valor original
Valor proposto
```

Nesta fase, os alvos controlados são:

- **Proposição** — público, problema, promessa, resultado, experiência, diferencial, valor para o negócio e status;
- **Journey** — nome, responsável, status, prioridade e objetivo;
- **Blueprint** — nome.

Campos enumerados usam valores controlados para impedir estados inválidos no schema.

## Guardrail de conflito

O valor original é capturado no momento da proposta.

Antes da aplicação, a H7.32 verifica novamente todos os alvos. Se qualquer valor atual for diferente do snapshot:

```text
Aplicação bloqueada
→ nenhuma mudança do pacote é aplicada
→ edição mais recente é preservada
→ decisão registra applicationResult = conflict
```

Isso evita sobrescrever alterações feitas entre proposta e implantação.

## Aplicação atômica

O pacote inteiro é validado antes de qualquer mutação.

Se não houver conflito, as mudanças aprovadas são aplicadas e a decisão registra:

- `status: applied`;
- `appliedAt`;
- `applicationResult`;
- `applicationNote`;
- `appliedAt` em cada mudança.

O aprendizado e suas evidências permanecem intactos como trilha de proveniência.

## QA

- H7.32 Decision & Iteration Loop: **190/190 PASS**
- H7.31 Evidence & Learning System: **141/141 PASS**
- H7.30 Service Prototype Lab: **129/129 PASS**
- H7.29 Channels + Touchpoints + Continuity: **129/129 PASS**
- H7.28 Blueprint Semantic Zoom + Custom Layers: **93/93 PASS** via preflight/regressão
- suíte acumulada: **3199 OK / 0 FAIL**
- `syntax:check`: PASS
- `lock:verify`: PASS
- `source:authority`: PASS
- `foundation:smoke`: 12/12 PASS
- `project-foundation:smoke`: 46/46 PASS
- `preflight-linux.sh`: PASS
- TypeScript strict do núcleo H7.32: PASS

### Limitação de validação

`npm ci` foi tentado novamente, mas não concluiu. O processo parcial foi encerrado e `node_modules` removido do source final.

Por isso **não são declarados como PASS**:

- React typecheck completo;
- build Vite;
- validação visual real em navegador.

## Próxima fase

**H7.33 — Current × Future Service**: consolidar estado atual e estado futuro, mostrando diferenças em Journey, Proposição, Blueprint, canais, responsabilidades e operação sem misturar baseline com desenho futuro.
