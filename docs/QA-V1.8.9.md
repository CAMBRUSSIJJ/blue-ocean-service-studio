# QA V1.8.9 — Master UX Polish

## Contratos estáticos

`./qa-core.sh` valida APIs do Whiteboard/Journey/Blueprint, Health, migrations, assets V1.8.9, paleta, filtros, modal de gerenciamento, confirmação segura, navegação móvel, topbar do editor e responsividade do Kanban.

## Regressões explicitamente protegidas

- Service Graph e dados da V1.8.8 continuam usando as mesmas chaves/migrações.
- Journey Home continua disponível.
- Guided/Professional, Blueprint Grid e Blueprint Health continuam presentes.
- O pacote compilado continua executável apenas com Python 3.
- Blueprint Home não usa mais `prompt`, `confirm` ou `alert` para configurar/excluir.

## Teste manual recomendado

1. Abrir Jornada e Blueprint existentes.
2. Favoritar Blueprint e filtrar Favoritos.
3. Abrir menu `•••`, configurar e salvar nome/responsável/status.
4. Acionar Exclusão, cancelar; repetir e confirmar em dois passos em uma cópia descartável.
5. Alternar cards/lista e testar teclado (`Tab`, `Enter`).
6. Abrir Whiteboard, Journey, Blueprint Health e Plano de Ação.
7. Redimensionar para ~800 px e ~390 px; conferir barra inferior, modais e Kanban.
8. Exportar um backup e confirmar que o download continua funcionando.

A automação estática não substitui testes manuais em diferentes distribuições Linux ou tecnologias assistivas.
