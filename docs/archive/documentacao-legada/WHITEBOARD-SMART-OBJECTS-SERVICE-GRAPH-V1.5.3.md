# V1.5.3 — Smart Objects / Service Graph

## Objetivo

Consolidar o Whiteboard como uma visualização de um modelo estrutural de serviço, e não como um banco de dados baseado em cards.

## Contrato de dados

### Entity
Registro canônico do Service Graph. Mantém conteúdo e identidade.

### Instance
Ocorrência visual de uma Entity em um Whiteboard. Mantém identidade própria (`instanceId`) e referência (`entityRef`).

### View Layout
Posição e apresentação daquela instância em Livre, Fluxo, Journey ou Blueprint.

## Tipos canônicos suportados nesta versão

- Etapa
- Touchpoint
- Problema
- Oportunidade
- Tarefa
- Evidência
- Processo
- Sistema
- Pessoa
- Insight

Etapa, Touchpoint, Problema, Oportunidade e Tarefa preservam os modelos existentes. Evidência, Processo, Sistema, Pessoa e Insight usam a nova coleção genérica `graph.entities`.

## Operações

- criar entidade e primeira instância;
- reutilizar entidade existente;
- criar nova instância da mesma entidade;
- editar conteúdo canônico no Inspector;
- localizar instâncias em outros quadros;
- duplicar a entidade para separar o conteúdo da instância selecionada;
- desvincular a instância sem apagar a entidade;
- converter objetos livres semanticamente elegíveis;
- detectar referência ausente;
- reconectar referência quebrada.

## Regras de duplicação

`Ctrl/Cmd + D` duplica a **instância**, mantendo o mesmo `entityRef`.

`Duplicar como nova entidade` cria nova Entity e aponta apenas a instância atual para ela.

## Compatibilidade

Smart Objects antigos são migrados para `instanceSchemaVersion: 2` e recebem `entityRef` automaticamente.
