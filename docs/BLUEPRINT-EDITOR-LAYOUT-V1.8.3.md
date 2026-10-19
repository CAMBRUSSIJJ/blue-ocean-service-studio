# Blueprint Editor Layout — V1.8.3

## Objetivo

Transformar o editor tecnicamente completo da V1.8.2 em uma experiência coerente com a nova Blueprint Home, reduzindo densidade visual e clarificando responsabilidades.

## Hierarquia da interface

1. **Header** — contexto, navegação, Views e ações globais.
2. **Canvas** — área principal de modelagem.
3. **Toolbar** — ações diretas de criação/manipulação.
4. **Blueprint Panel** — propriedades do documento.
5. **Inspector** — propriedades do objeto selecionado.
6. **More menu** — ações infrequentes e administrativas.

## Regra de responsabilidade

- `Blueprint Panel` altera o documento.
- `Inspector` altera o objeto/conexão/container selecionado.
- `Canvas settings` alteram grade, snap, guias e comportamento visual do canvas.
- `Service Graph` altera/reutiliza entidades canônicas.

## Blueprint Panel

### Estrutura

Controla leitura estrutural do Blueprint sem apagar dados:

- seis lanes;
- linhas semânticas;
- filtros;
- Saved Views;
- reorganização automática.

### Contexto

Mantém identidade e vínculo:

- nome;
- Serviço;
- Jornada;
- Etapas compartilhadas.

### Governança

Mantém metadados do artefato:

- Owner;
- Status.

Ownership operacional continua nas entidades Frontstage, Backstage, Processo e Sistema.

## Responsividade

- 1366 px mantém título, Views e ações essenciais na mesma linha.
- 1100 px remove ações secundárias antes de reduzir a área do canvas.
- em telas menores o painel de documento usa largura fluida sem sobrepor a toolbar.
