# QA V1.8.8

Validação em Chromium headless no Linux, com armazenamento inicial limpo.

- Build TypeScript/Vite concluído; contratos estáticos e preflight aprovados.
- Criar jornada Delivery, abrir novamente e adicionar etapa: vínculo e quantidade corretos; abertura preserva a data de edição.
- Alternar Guiado/Profissional; abrir diagnóstico; header sem sobreposição.
- Salvar no Plano de Ação mantém duas jornadas, dois quadros e entidades estendidas.
- Criar tarefa, mover, desfazer e refazer preserva o estado esperado.
- Exportar backup completo, recarregar e comparar jornadas com o backup.
- Duplicar jornada remapeia etapas; excluir cópia preserva a original.
- Card Blueprint usa as três etapas da jornada vinculada, sem misturar as seis etapas de outra jornada.
- Importar backup completo e recarregar preserva as jornadas; arquivo com referência de etapa ausente é rejeitado sem alterar o projeto.
- Falha simulada de quota no write de metadados restaura os bytes anteriores de graph e metadados.
- Alteração em segunda aba aparece na primeira; salvar nela mantém a revisão nova.
- Homes verificadas em 1440, 800 e 390px; sem erros JavaScript no fluxo.

Limites: execução automatizada não substitui testes manuais em todas as distribuições, dispositivos ou tecnologias assistivas. Não foi validada colaboração simultânea em nuvem. Diagnósticos são indicadores estruturais.
