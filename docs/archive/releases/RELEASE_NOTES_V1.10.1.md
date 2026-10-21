# V1.10.1 — Collaboration & Cloud Foundations

Esta versão adiciona a fundação local-first de colaboração sem conectar nenhum backend remoto por padrão.

## Entrou
- Workspace de colaboração persistido dentro de `service.collaboration` no Service Graph Schema V3.
- Papéis: Owner, Editor, Comentador e Visualizador.
- Membros e convites locais de preparação.
- Comentários contextuais ligados ao objeto selecionado, quadro ou serviço.
- Presença entre abas do mesmo navegador com `BroadcastChannel`.
- Activity log de colaboração.
- Journal local de mudanças pendentes de sync.
- Contrato de adapters remotos com `pull()` e `push()`.
- Centro de conflitos de revisão para adapters futuros.
- Exportação de envelope de sync.
- Proteção de `dataBridge.transact()` por papel, com bypass interno controlado para comentários/governança.
- Validação/reparo das referências de colaboração pelo Integrity Engine.

## Limites deliberados
- Não existe autenticação remota nesta versão.
- Convites não enviam e-mails.
- Presença é local ao mesmo browser/origin.
- Nenhum provider cloud é ativado automaticamente.
- Sync remoto só funciona quando um adapter explícito é registrado no Runtime Registry.
