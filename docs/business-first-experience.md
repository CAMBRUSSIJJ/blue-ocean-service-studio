# Experiência para MEIs e pequenas empresas

Esta entrega implementa as prioridades da avaliação de uso. Os perfis da avaliação são fictícios; os testes automatizados não equivalem a entrevistas ou validação com empresários reais.

## Primeiro uso e Persona

O início da Jornada oferece quatro objetivos: organizar o atendimento, reduzir atrasos, padronizar o serviço e resolver um problema do cliente. Cada objetivo destaca um modelo existente e fica registrado no campo de objetivo da Jornada. Os exemplos continuam identificados como exemplos editáveis.

Jornadas com objetivo começam com orientação e menos comandos de visualização. **Mostrar todos os comandos** revela as ferramentas completas. A escolha muda a apresentação, sem alterar cartões, fontes ou planos.

A criação de uma etapa agora devolve sua identidade canônica ao editor, associada ao identificador local estável. A resposta não substitui rascunhos nem associa etapas pela posição. O seletor também resolve uma etapa nova pelo identificador local quando a confirmação ainda está em trânsito. Um identificador canônico obsoleto continua sendo rejeitado.

Ao criar ou vincular uma Persona, a opção **Usar também como Persona da jornada** define explicitamente o contexto. Sem essa opção, o cartão apenas marca sua presença na etapa. A operação é única e pode ser desfeita por inteiro. A troca de contexto lê as emoções da Persona escolhida; ela não transfere emoções de outra pessoa.

## Trabalho cotidiano

**Uma etapa por vez** apresenta as faixas e os mesmos controles de edição em uma coluna. A navegação permanece visível no celular, permite selecionar uma etapa e mantém os identificadores e a ordem canônica. **Ver mapa completo** devolve a matriz.

**Revisar e melhorar** oferece recortes de atividades sem responsável, esperas e prazos, dependências, transferências e melhorias. O tempo de espera é um registro explícito em minutos; os recortes não inventam tempos nem tratam estimativas como medições. As ações da revisão abrem os detalhes e planos existentes.

Problemas colocados como referência também entram na revisão. O caminho segue problema → evidências → ação → responsável → indicador → medição → decisão da equipe. A próxima decisão aparece como orientação; o aplicativo não decide se uma melhoria foi validada.

Informar um responsável, recurso ou transferência documenta o combinado. Isso não envia tarefas, mensagens, notificações nem ativa integrações com ferramentas citadas no mapa.

## Cópias e recuperação

**Dados e backup** explica onde as edições atuais estão salvas e permite baixar o projeto completo, abrir a recuperação e transferir um arquivo para outro dispositivo. A importação existente valida o conteúdo, mostra a prévia e cria um checkpoint antes da substituição. Checkpoints locais não substituem uma cópia fora do navegador.

## Workspace remoto

O botão fica em **Colaboração → Nuvem e backup → Abrir workspace remoto**, também acessível no painel de dados do mapa.

O acesso usa Supabase Auth e um projeto separado do CRM da organização RealTalent. A publicação é explícita: o usuário escolhe enviar uma cópia do projeto para a conta autenticada. A conta local não é usada como identidade remota.

O responsável gera códigos de convite de uso único, válidos por sete dias, para Editor, Comentador ou Leitor. O servidor guarda somente o hash do código. O responsável pode remover acessos. Os comentários remotos têm autoria vinculada ao usuário autenticado e ficam separados dos comentários locais de demonstração.

Salvar no workspace remoto publica o projeto inteiro com a revisão esperada. Uma gravação concorrente é rejeitada no servidor; a cópia local permanece disponível para backup. O usuário pode carregar a versão remota depois de confirmar a substituição. Os dez últimos salvamentos completos ficam disponíveis como backups.

Essa sincronização usa publicações explícitas. Ela não mescla alterações de cartões automaticamente nem transmite cada tecla em tempo real. Para continuar sem o vínculo, **Continuar com cópia local** preserva o projeto no navegador.

Todas as seis tabelas públicas têm RLS. As funções expostas são invocadoras; as rotinas com privilégios elevados ficam no esquema privado e verificam `auth.uid()`. Nenhum papel enviado pelo cliente concede acesso. A atualização direta de documentos e membros é proibida; a publicação verifica permissão e revisão atomicamente.

## Configuração e operação

- Copie [.env.example](../.env.example) para `.env.local` e configure somente a URL e a chave publicável.
- Aplique a [migração inicial](../supabase/migrations/20261024210232_cloud_workspaces.sql) e o [ajuste de resposta a conflitos](../supabase/migrations/20261024214454_conflict_http_status.sql) exclusivamente no projeto dedicado ao Blue Ocean.
- No Supabase Auth, configure Site URL e Redirect URLs para os endereços publicados. O formulário informa a origem atual como `emailRedirectTo`; ela precisa estar autorizada para retornar após a confirmação por e-mail.
- A prévia da branch `feat/business-first-experience` usa variáveis limitadas a essa branch. A ativação em produção exige configurar suas variáveis e publicar o código revisado.
- Nunca use chave secreta ou `service_role` no navegador.

A auditoria inicial do Supabase não apresentou alertas de segurança. Os índices de um banco recém-criado podem aparecer como [ainda não utilizados](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index); os índices de chaves estrangeiras e acesso por membro foram mantidos.

## Verificação reproduzível

```sh
npm run release:verify
npm run business:browser
npm run remote:security:test
npm run remote:stack
npm run remote:browser
npm run remote:stop
npm run docs:check
```

Os testes de segurança usam PostgreSQL 17 descartável e identidades de JWT de teste. O teste completo usa GoTrue, PostgREST e PostgreSQL reais em contêineres locais, cinco contas criadas pela API local de Auth e contextos independentes do Chromium. Nenhuma conta de teste é inserida no Auth do projeto remoto. Os serviços locais ficam acessíveis apenas pelo endereço de loopback; as credenciais são geradas por execução e ficam em `work/`, ignorado pelo Git. Execute `remote:stop` também após investigar uma falha.

São verificados login, publicação, convites, isolamento entre contas, editor, leitor, comentador, conflito de revisões, preservação do rascunho, recuperação por backup, histórico, saída da conta e navegação móvel. Os outros testes cobrem Persona em etapas novas sem recarga, cancelamento, desfazer/refazer, reorganização, planos, indicadores e preservação do conteúdo entre perspectivas.

Na verificação desta entrega, o banco hospedado confirmou RLS nas seis tabelas, ausência de leitura anônima e nenhum alerta de segurança. O acesso HTTP direto ao domínio Supabase foi bloqueado pela política de rede do ambiente de desenvolvimento; a verificação completa de Auth e dados foi realizada nos serviços locais descartáveis. Isso deve ser distinguido de um teste autenticado de ponta a ponta no domínio publicado.
