# RealTalent Service Studio V1.4.10 — Whiteboard Consolidation & UX QA

Esta versão consolida o Whiteboard antes da entrada em Editing Productivity.

## Entregas principais

- Entity × Instance × View Layout formalizado no estado local.
- Layouts independentes para Livre, Blueprint, Fluxo e Journey.
- Blueprint reconstruído como matriz **Etapas × Camadas**, com seis linhas: Evidências, Ações do cliente, Frontstage, Backstage, Processos e Sistemas.
- Migração automática das antigas swimlanes gigantes de Blueprint.
- Biblioteca em modo compacto por categoria, expansível quando necessário.
- Biblioteca fecha após criação de objeto para devolver o canvas ao usuário.
- Picker do Service Graph com busca, indicação de reutilização e criação de nova entidade.
- Inspector com escolha de Etapa/Camada do Blueprint e ações destrutivas recolhidas em Mais ações.
- Feedback visual inequívoco ao soltar objetos em containers.
- Controles de Grade/Snap/Guias/Minimapa consolidados em Exibição.
- Controles de viewport renomeados para Ajustar seleção e Ajustar quadro.
- Indicador de salvamento no cabeçalho.
- Detalhe adaptativo conforme o zoom.
- Refinos responsivos para 1920, 1600, 1440 e 1366 px.

## Executar no Linux

```bash
cd ~/Downloads
unzip RealTalent-Service-Studio-V1.4.10-Whiteboard-Consolidation-UX-QA-Linux-Launcher.zip
cd RealTalent-Service-Studio-V1.4.10-Whiteboard-Consolidation-UX-QA-Linux-Launcher
bash start-linux.sh
```

Abra `http://127.0.0.1:4173/`.
