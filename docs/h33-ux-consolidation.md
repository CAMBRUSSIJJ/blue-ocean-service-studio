# H3.3 — Consolidação de navegação, Home e projetos

## Propósito
Reduzir a carga visual do primeiro nível de navegação sem remover capacidades, dados, templates, editores ou rotas. A H3.3 é uma evolução de apresentação: nenhuma migração do Service Graph, nenhuma mudança de IDs e nenhuma reinterpretação de evidências.

## Alterações implementadas
- **Home:** texto orientado a continuidade, último projeto em destaque, acesso único à lista completa de projetos; templates permanecem disponíveis e editáveis. O estado sem projetos explica como começar sem forçar etapas.
- **Visão geral:** quatro indicadores agora são links explícitos para mapas, Personas, Necessidades e Evidências; quando não existe mapa, o mesmo indicador permite criar o primeiro. Uma seção contextual mostra o mapa mais recente e oferece acesso a Personas, Problemas e Whiteboard.
- **Sidebar:** nomes de grupos de navegação mais diretos (Desenhar, Conhecer e Organizar); opções continuam presentes e seus IDs de navegação permanecem preservados. Equipe e Configurações continuam no menu principal; as cópias do rodapé foram removidas.
- **Design system:** folha `ux-consolidation-h33.css` herda os tokens H3 e respeita a hierarquia atual, contraste de foco, `prefers-reduced-motion` e responsividade. Não altera SVG, arraste, faixas nem cartões do editor.

## Contratos preservados
1. A Home ainda mostra projetos, favoritos, templates, criação e arquivamento.
2. A criação de um projeto continua abrindo sua visão geral; o usuário pode entrar nos mapas pela sidebar ou pelo cartão do projeto.
3. Personas, necessidades, problemas e evidências continuam abrindo as bibliotecas reais; não são cópias de dados.
4. Jornada, Blueprint e Whiteboard mantêm o mesmo Service Graph e todos os identificadores.
5. O acesso a configurações e colaboração continua disponível.
6. O funcionamento local e o backup permanecem intactos.

## Checklist de validação
- `npm run release:verify` e workflow **Qualidade** completos;
- Home vazia e com projeto em 390/834/1440 px;
- criação de projeto, abertura, favoritos, filtros e templates;
- acesso às quatro áreas pelo resumo do projeto;
- atalho Whiteboard e continuidade do último mapa;
- sidebar recolhida/expandida, mouse, teclado e navegação móvel;
- não alterar dados canônicos ao trocar de tela;
- conferir foco e contraste e ausência de scroll horizontal no celular.

## Próximas etapas (fora da H3.3)
A H3.4 tratará de ergonomia interna dos editores Jornada/Blueprint, componentes e emoções, com testes específicos de arraste e edição. A H3.5 tratará da integração entre pesquisa, Personas, Whiteboard, oportunidades e plano de melhoria. A colaboração remota exige validação de segurança e persistência antes de ser considerada pronta.
