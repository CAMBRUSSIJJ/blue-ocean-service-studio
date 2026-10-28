# Entity Canvas — Personas (primeira entrega)

## Intenção
Transformar o perfil da Persona em uma área visual de edição direta, sem uma segunda pré-visualização nem uma cópia das informações. O Service Graph continua sendo a fonte canônica; os blocos continuam armazenados na própria entidade `persona`.

## Uso
- Criação com um único campo continua no modal compartilhado com Jobs e Necessidades.
- No perfil, título e componentes são editáveis inline. Clique no conteúdo para escrever; cada alteração segue o autosave existente.
- Arraste o controle ⠿ para reorganizar os blocos.
- Redimensione com o controle discreto ⋮⋮ no canto inferior direito, revelado ao passar o mouse; ← e → funcionam com teclado.
- O menu ⋯ oferece mover, ocultar e alternar largura; ocultar não apaga os dados.
- Os espaços vazios sugerem Necessidades, Canais, Citações e a biblioteca completa.
- O componente Relações mostra os registros reais associados; abra **Banco de conexões** para buscar e conectar Jobs/Necessidades/Dores/Evidências. Arraste um registro ao grafo ou clique em Vincular. Clicar num nó conectado desvincula a relação sem excluir o registro.
- **Detalhes do perfil** abre sob demanda. Ali ficam completude e metadados; completude é preenchimento, não validação científica.
- Tema escuro é opcional, restrito ao canvas e armazenado como preferência local; a identidade visual azul do sistema permanece.

## Garantias
1. Não são criados registros de Job/Necessidade por arraste, apenas relações `relatedIds` e `personaIds` já suportadas pelo domínio.
2. O grafo visual é derivado de `personaRelationOptions(graph)` e de `connectedIds`, sem duplicação do Service Graph.
3. A configuração de largura `half/full` usa o modelo existente `PersonaVisualCard`; a ordenação existente continua.
4. Os registros e as evidências continuam acessíveis na aba Relações/Evidências.
5. Autosave continua sendo **local**, sem afirmar sincronização remota.
6. A tela fica em tema claro por padrão; o escuro é opcional e não altera os outros editores.

## Verificação
- `npm run release:verify`
- `npm run personas:p2p3:browser` — criação, edição direta, redimensionamento, relações reais e persistência após reabertura.
- `npm run e2e:visual` e `Qualidade` no GitHub Actions.
- Abrir o editor com dois registros relacionados, acionar Banco de conexões e alternar claro/escuro.
- Conferir Firefox, mouse, teclado e viewport de 390px.

## Próximas evoluções
O componente `EntityCanvasResizeHandle` e o grafo `EntityCanvasRelations` são reutilizáveis. A próxima etapa é aplicar composição visual própria a Jobs e Necessidades, permitir posições mais flexíveis com snapping e revisar o fluxo em dispositivos touch. Não há colaboração em tempo real nem geração de informações pela IA nesta entrega.
