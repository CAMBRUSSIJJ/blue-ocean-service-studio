# SOURCE BASELINE — V1.18.2

Base: V1.18.1 Compositor Ocean Performance.

Autoridade de fonte permanece em `src/`.

Mudanças de arquitetura desta baseline:
- React é o único proprietário estrutural de `aside[data-bo-precision-sidebar-native]` e `header[data-bo-precision-header-native]`.
- Runtimes legados podem observar/abrir workspaces, mas não inserir ou reordenar filhos nesses containers nativos.
- Home 3.0 deriva todos os indicadores diretamente do mesmo Service Graph; nenhuma cópia de dados foi criada.
