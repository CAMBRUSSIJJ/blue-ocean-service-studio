# V1.20.5-H7.2.3 — Persona Timestamp Typecheck Hotfix

## Corrigido
- Corrige `TS2339: Property 'updatedAt' does not exist` em `PersonasView.tsx` durante a criação de Persona.
- A criação passa a gerar um timestamp explícito e único (`now`).
- O mesmo timestamp é entregue a `createDiscoveryEntity()` e usado em `service.updatedAt`.
- Remove a dependência de `entity.updatedAt` no retorno genérico `GraphEntity`.

## Preservado
- Configurador Persona Simples / Avançada da H7.2.2.
- Personas 2.0 e Necessidades 2.0.
- Relações canônicas do Service Graph.
- Routing Recovery, Sidebar/Wave e preflight de branding.

## QA
- Gate H7.2.3: 5/5 PASS.
- H7.2.2: 23/23 PASS.
- H7.2: 15/15 PASS.
- H7.1: 14/14 PASS.
- `npm run qa`: PASS.
- `preflight-linux.sh`: PASS.

## Limitação
O `npm run typecheck` completo precisa ser confirmado no Linux do usuário após `npm ci`, pois este ambiente não possui as dependências instaladas.
