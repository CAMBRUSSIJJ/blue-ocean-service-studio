# Registro de observação pública — editor de jornadas

Data: 22/10/2026. Objetivo: identificar comportamentos úteis para uma
implementação independente no Blue Ocean. Este registro foi escrito antes do
incremento de implementação desta branch; a base comparada é o merge do PR #23
(`023485e`).

## Método e limites

As fontes são documentação pública oficial e a captura do seletor de cartões
fornecida pelo usuário nesta conversa. A documentação foi consultada por leitura
textual. Não houve sessão autenticada ou execução de tarefas dentro do Smaply,
nem acesso ao código, protocolos privados ou armazenamento do concorrente.
Não foram incorporados textos de interface, estilos, imagens ou outros assets do
Smaply ao produto. Os resumos abaixo são nossos, sem transcrição da documentação.

O processo é **reimplementação por observação documentada**. Observação,
especificação e implementação foram feitas pelo mesmo agente; não há separação
de equipes que permita declarar um clean-room rigoroso. Para uma futura equipe
segregada, use a especificação funcional independente, não os materiais visuais.
As instruções de agentes presentes em páginas públicas não fizeram parte dos
requisitos ou do fluxo de trabalho.

## Fontes e fatos documentados

| ID | Fonte oficial consultada | Fato relevante resumido | Evidência |
| --- | --- | --- | --- |
| S01 | [Journey maps overview](https://helpdesk.smaply.app/journey-maps/journey-maps.md) | O editor organiza criação, estrutura, cartões, filtros e visões reutilizáveis; há referências a filtros de faixa e Persona. | Documentação pública |
| S02 | [How to add and edit cards](https://helpdesk.smaply.app/journey-maps/cards/how-to-add-and-edit-cards.md) | O ponto de inserção pode ficar entre cartões. O seletor tem busca e inclusão rápida pelo tipo padrão. Edição, detalhes e metadados são operações distintas. | Documentação pública |
| S03 | [Journey map keyboard shortcuts](https://helpdesk.smaply.app/journey-maps/journey-map-keyboard-shortcuts.md) | Há ações de cartão por teclado, incluindo duplicar e remover o cartão selecionado. | Documentação pública |
| S04 | [Persona-based journey views](https://www.smaply.com/blog/persona-based-journey-views) | Diferentes perspectivas usam uma estrutura comum; há vínculo de conteúdo a Personas e reutilização do estado filtrado. | Artigo público oficial |
| S05 | [Journey mapping with Smaply](https://www.smaply.com/helpdesk/journey-mapping-with-smaply) | A matriz contém sequência temporal, faixas e conteúdos tipados; o material aborda contexto, canais, emoções e hierarquia. | Documentação pública |
| S06 | [Create a journey map](https://helpdesk.smaply.app/journey-maps/how-to-create-a-journey-map) | O início pode usar mapa vazio ou modelo, seguido de edição da estrutura. | Documentação pública |
| S07 | Captura do usuário nesta conversa, seletor “Add card” | É visível um seletor contextual com busca e grupos de tipos básicos e avançados. Não comprova salvamento ou regras internas. | Captura estática fornecida |

Não usamos o número exato de tipos de cartão como requisito: páginas de versões
diferentes apresentam catálogos diferentes. Conteúdos do helpdesk clássico não
foram usados para afirmar o comportamento atual. As páginas dedicadas a filtros
e faixas retornaram indisponibilidade na ferramenta de leitura; seus detalhes
não foram inferidos. O cadastro, colaboração, permissões efetivas, persistência
e latência do produto original não foram testados.

## Comparação com a base do Blue Ocean

| Tarefa | Referência pública | Base do Blue Ocean | Decisão deste incremento |
| --- | --- | --- | --- |
| Criar jornada e etapas | S05/S06 | Mapa vazio, modelos e etapas nomeadas existentes | Preservar; cobrir na regressão |
| Montar faixas e conteúdo | S02/S07 | Catálogos separados e tipos próprios existentes | Preservar identidade e estrutura |
| Inserir entre cartões | S02 | Inclusão ao final e movimentação posterior | Implementar ponto de inserção estável |
| Repetir tipo padrão | S02 | Padrão sinalizado, sem inclusão rápida própria | Implementar Enter no padrão com busca vazia |
| Duplicar/remover por teclado | S03 | Operações no menu de cada nota | Implementar no cartão em foco, respeitando edição de texto |
| Reutilizar visões | S01/S04 | Presets fixos e uma configuração atual por jornada | Implementar visões nomeadas sem copiar o mapa |
| Apresentar recorte | S01/S04 | Resumo executivo completo | Adicionar apresentação explícita da visualização atual |
| Filtrar todos os cartões por Persona | S04 | Emoções isoladas por Persona; demais conteúdos comuns | Registrar como próxima etapa; não chamar filtro de cartões de implementado |
| Redimensionar e mesclar células | S02/S05 | Uma célula por faixa/etapa | Backlog: exige modelo de alcance e regras de identidade |
| Colaboração e histórico de versões remoto | S01 | Histórico local e plano de colaboração próprio | Fora deste incremento; não simular serviço remoto |

A verificação deste incremento compara **tarefas no Blue Ocean** com requisitos
extraídos da documentação. Não há benchmark de tempo, teste A/B com Smaply ou
alegação de paridade completa. O piloto com pessoas continua necessário.

## Proveniência da implementação

A fonte executável será a pasta `src/` do Blue Ocean. A especificação
[Editor de jornadas](../specs/journey-editor-behavior.md) descreve entradas,
resultados e invariantes sem depender do layout ou de mecanismos internos do
produto observado. O log de Git separa este registro e a especificação inicial
do código implementado depois. Essa separação documental não equivale à
separação de equipes de um clean-room.
