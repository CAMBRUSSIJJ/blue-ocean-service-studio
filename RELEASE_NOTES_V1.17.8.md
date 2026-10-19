# BLUE OCEAN Service Studio V1.17.8 — Professional Entry & Authentication Experience

## Adicionado
- Entrada premium BLUE OCEAN com composição visual Service Graph/Journey/Blueprint.
- Login local com e-mail/senha e derivação PBKDF2 + salt aleatório.
- Cadastro guiado em duas etapas (conta → uso/workspace).
- Recuperação de senha local.
- Sessão persistente opcional ("Manter conectado") e sessão temporária.
- Loading de workspace com feedback de preparação.
- Menu de conta e saída no shell autenticado.
- Botões Google/Microsoft preparados visualmente, sem simular OAuth inexistente.
- Acesso ao workspace local sem conta para preservar o modo local-first atual.

## Melhorado
- Primeira impressão passa de editor direto para experiência de plataforma.
- Responsividade desktop/tablet/mobile e reduced motion.
- Erros de autenticação inline, sem alert/confirm/prompt nativos.

## Limites
- Esta release NÃO cria autenticação cloud real. Credenciais e sessão pertencem somente a este dispositivo/navegador.
- Google/Microsoft exigem backend/OAuth e continuam apenas como entradas preparadas.
- Recuperação de senha não envia e-mail enquanto o backend cloud não existir.
