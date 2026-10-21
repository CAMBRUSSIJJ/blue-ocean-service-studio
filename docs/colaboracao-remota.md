# Colaboração remota: pré-requisitos e critérios de entrega

## Estado atual

A plataforma funciona no navegador. Perfis locais compartilham os projetos do
mesmo navegador; não são contas privadas de uma plataforma remota. Comentários,
participantes e presença local não enviam convites nem liberam acesso por outro
dispositivo. Os backups transportam uma cópia do projeto, sem edição simultânea.

Ainda não há um backend provisionado para este projeto. Por isso, login remoto,
workspaces privados e colaboração entre dispositivos não são apresentados como
funcionalidades prontas. Os botões sociais ficam indisponíveis, e a sincronização
remota só pode ser usada quando houver uma integração registrada.

## Infraestrutura necessária

Uma implementação remota precisa de identidade, banco de dados e autorização no
servidor. Um serviço gerenciado, como Supabase, é uma opção a avaliar para reunir
autenticação e PostgreSQL com regras por workspace. A escolha do provedor e seu
provisionamento precedem a ativação; este documento não declara uma integração implementada.

Para conectar um backend, serão necessários um projeto do provedor, seus
endereços públicos, configuração dos ambientes de desenvolvimento e produção,
URLs de retorno do login e um fluxo de recuperação de identidade. Credenciais
administrativas pertencem ao servidor e às configurações seguras do ambiente,
nunca ao bundle do navegador ou ao repositório.

## Entrega mínima para uso em equipe

1. **Identidade:** cadastro, confirmação quando aplicável, login, saída e
   recuperação verificável. A sessão deve expirar e poder ser revogada.
2. **Separação de dados:** workspaces, participantes e projetos com autorização
   aplicada no servidor. Testar que um usuário de outro workspace não consegue
   ler, alterar, listar ou exportar seus projetos, mesmo fazendo requisições diretas.
3. **Dados existentes:** manter o workspace local intacto e oferecer uma importação
   explícita do backup para o workspace remoto escolhido. Não enviar dados locais
   automaticamente ao criar uma conta.
4. **Convites e papéis:** convite com aceitação, revogação e validade; distinguir
   responsável, editor, comentador e leitor em operações autorizadas no servidor.
5. **Persistência:** revisão do documento, controle de concorrência, histórico
   recuperável e tratamento de erros de rede sem anunciar salvamento remoto falso.
6. **Colaboração:** comentários entre usuários e dispositivos reais; presença e
   atualização simultânea somente com uma estratégia de conflitos definida.
7. **Operação:** backups do banco, recuperação testada, logs sem dados sensíveis,
   limites de uso e monitoramento de erros e tentativas de acesso indevido.

## Validação antes da ativação

Executar o ciclo convidar → aceitar → acessar → editar/comentar → sincronizar →
reabrir em outro dispositivo → recuperar uma versão. Usar contas e contextos
independentes, verificar isolamento no banco e testar queda de conexão,
sessão expirada, convite revogado e alterações concorrentes.

A estrutura atual de adapters pode integrar um serviço, mas não substitui esses
critérios. Até essa validação, a aplicação permanece explicitamente em modo local.
