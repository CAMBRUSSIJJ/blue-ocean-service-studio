# P6 — Personas, Evidências e foco na Jornada

## Antes de começar

Cadastre a Persona em **Público-alvo → Personas** e registre as fontes na
biblioteca de **Evidências** do mesmo serviço. P6 reutiliza as entidades do
Service Graph: não cria cópias de Personas, evidências nem Jornadas.

## Evidências por afirmação

Abra uma Persona e escolha **Evidências**. O vínculo de fontes ao perfil como
um todo continua disponível. Na seção **Evidências por afirmação**, expanda
uma afirmação específica e marque as fontes que comprovam ou ajudam a
investigá-la. O contador mostra quantas afirmações possuem ao menos uma
fonte disponível.

Clique em **Salvar alterações** para persistir essas referências na própria
entidade Persona (`personaEvidenceClaims`). O conteúdo da fonte permanece
na entidade Evidência original. Uma fonte vinculada **não valida**
automaticamente uma hipótese, uma emoção ou uma afirmação.

O vínculo é feito ao texto exato. Se o texto mudar, o vínculo antigo deixa
de servir e é descartado ao salvar; a fonte original continua intacta.
Registros de outros serviços não podem ser adicionados. Uma Persona
antiga, sem vínculos granulares, continua funcionando normalmente.

## Foco por Persona na Jornada

Abra a Jornada no projeto e, no cabeçalho, selecione uma **Persona da
jornada**. Além de manter as emoções contextualizadas nessa Persona, o
mapa atualiza a **visualização dos cartões** para exibir registros
associados a ela.

O filtro considera a classificação direta do cartão e as relações
canônicas dos registros vinculados (incluindo as evidências ligadas à
Persona). Cartões não associados ficam ocultos nessa visualização, sem
serem apagados. Etapas e a faixa de emoções continuam disponíveis.
Use **Filtros → Limpar filtros** para voltar a ver todos os cartões,
sem desvincular a Persona nem mudar as emoções.

A alteração do filtro é uma preferência de visualização; a seleção de
Persona na Jornada é o contexto persistido no Service Graph. O usuário
pode continuar aplicando filtros por texto, tipo e tags.

## Testes

```bash
npm ci
npm run persona:p6:test
npm run typecheck
npm run release:verify
```

O teste P6 valida normalização, exclusão de referências de outros
serviços, relações entre entidades, preservação do grafo original,
filtros por Persona, remoção de referências desatualizadas e
integração das telas.

## Limites desta entrega

P6 não gera evidências automaticamente, não afirma que uma hipótese
foi confirmada e não cria um gráfico comparativo multisséries de
emoções. Esses pontos exigem pesquisa e critérios próprios.
