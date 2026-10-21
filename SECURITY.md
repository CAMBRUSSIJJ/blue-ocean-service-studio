# Comunicação de problemas de segurança

O fluxo atual é uma aplicação com persistência local no navegador. Ele pode
conter informações de projetos e pesquisas. Use dados fictícios nas reproduções
e mantenha backups, credenciais e dados pessoais fora de issues e capturas públicas.

## Como comunicar

Se a opção **Report a vulnerability** estiver disponível na aba **Security**
do repositório, utilize esse canal privado. Se não estiver, abra uma issue
solicitando um canal privado ao responsável, sem publicar a exploração ou dados sensíveis.

Na comunicação privada, inclua a versão ou commit afetado, os pré-requisitos,
os passos para reprodução, o impacto observado e uma demonstração mínima com
dados fictícios. Não envie senhas, chaves de API ou backups de projetos reais.

Não há prazo de resposta ou faixa de versões com suporte formalmente definidos.
Use a `main` como referência para conferir se o problema ainda ocorre e informe
explicitamente o commit testado.

## Limites do fluxo local

Contas e sessões locais não representam autenticação de um backend nem uma
fronteira de segurança entre pessoas que compartilham o mesmo perfil de navegador.
A exportação de backups e as permissões do dispositivo precisam ser consideradas
ao trabalhar com informações sensíveis.
