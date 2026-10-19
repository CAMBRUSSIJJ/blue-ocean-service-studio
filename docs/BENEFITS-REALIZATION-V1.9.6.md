# V1.9.6 — Benefits Realization & Transformation Portfolio

## Objetivo
Fechar o elo entre execução e valor realizado sem transformar o Service Studio em um dashboard desconectado.

## Cadeia de valor

```text
Pesquisa / Evidência
       ↓
Problema
       ↓
Oportunidade
       ↓
Iniciativa
       ↓
Métrica
       ↓
Benefício esperado
       ↓
Evidência do resultado
       ↓
Benefício realizado
```

## Benefit record
Cada benefício pode registrar:
- título e descrição;
- responsável;
- status;
- baseline;
- valor atual;
- meta;
- unidade;
- direção desejada (aumentar/diminuir);
- confiança;
- data prevista de realização;
- próxima revisão;
- iniciativas relacionadas;
- métricas de resultado;
- oportunidades de origem;
- evidências do resultado;
- notas de realização.

## Progresso
O progresso só é calculado quando baseline, atual e meta são numéricos e válidos.

Para aumento:
`(atual - baseline) / (meta - baseline)`

Para redução:
`(baseline - atual) / (baseline - meta)`

O resultado visual é limitado a 0–100%.

## Regra de governança
Meta atingida não equivale automaticamente a benefício realizado. O sistema sinaliza **Meta atingida · validar**; somente o usuário pode marcar `Realizado`.

## Cobertura de realização
Indicador estrutural baseado em presença de:
- owner;
- iniciativa;
- métrica;
- baseline;
- meta;
- leitura atual;
- próxima revisão;
- evidência do resultado.

Não é uma nota subjetiva do serviço nem uma avaliação financeira automática.

## Portfolio
A leitura de Portfolio reaproveita os horizontes das iniciativas existentes:
- Agora;
- Próximo;
- Depois.

Cada iniciativa mostra os benefícios vinculados, evitando uma segunda estrutura de roadmap.

## Revisões
Toda edição de benefício gera um registro no histórico de revisões com data, status, leitura atual e notas.
