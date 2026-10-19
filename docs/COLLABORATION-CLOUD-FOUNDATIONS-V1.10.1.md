# Collaboration & Cloud Foundations — V1.10.1

## Objetivo
Preparar o RealTalent Service Studio para colaboração e cloud sem comprometer o modelo local-first e a integridade do Service Graph.

## Modelo
`service.collaboration` contém:
- `workspaceId`, `workspaceName`, `currentUserId`;
- `members` com RBAC;
- `comments` contextuais;
- `activity` auditável;
- `sync` com modo, adapter, revisão base e conflitos.

## RBAC
- Owner: editar, comentar, gerenciar membros e sync.
- Editor: editar e comentar.
- Comentador: visualizar e comentar.
- Visualizador: somente leitura.

`dataBridge.transact()` recusa mutações estruturais quando o papel atual não tem `edit`. Operações internas do módulo de colaboração usam um bypass explícito e limitado para persistir comentários e metadados de sessão.

## Comentários
O alvo é resolvido na ordem:
1. objeto selecionado;
2. quadro atual;
3. serviço.

Comentários preservam `targetType`, `targetId`, autor, status aberto/resolvido e timestamps. O Integrity Engine repara comentários cujo alvo foi removido, redirecionando-os ao serviço em vez de deixar referências órfãs.

## Presença local
`BroadcastChannel` transmite heartbeat entre abas do mesmo origin. É uma fundação para presença real, não uma implementação de colaboração multiusuário via internet.

## Cloud adapter contract
Um adapter deve implementar:
```js
{
  async pull({ workspaceId, baseRevision }) {},
  async push({ workspaceId, graph, revision, operations }) {}
}
```

Registro:
```js
RealTalentRuntime.api('collaboration').registerAdapter('provider-v1', adapter)
```

Por padrão `sync.mode = 'local-only'`.

## Conflitos
Se uma versão remota mais nova chega enquanto existem operações locais pendentes, o runtime registra um conflito e bloqueia a sincronização automática. A resolução fica explícita no Centro de Sync.
