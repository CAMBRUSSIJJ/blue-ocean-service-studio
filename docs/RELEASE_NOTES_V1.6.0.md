# Release Notes — V1.6.0 Whiteboard Core 1.0

A V1.6.0 encerra o ciclo de construção do motor visual iniciado na V1.4.5 e promove o Whiteboard a **baseline estável** para o restante do RealTalent Service Studio.

## Entregas da versão
- versão do app atualizada para `1.6.0`;
- contrato `Whiteboard Core 1.0` persistido no metadata;
- migração direta da metadata V1.5.9;
- painel **Core 1.0** no cabeçalho, menu do quadro e Command Palette;
- auditoria integrada de dados, instâncias, conexões, containers, Views, Journey, Blueprint, persistência, Recovery, Import/Export, performance e runtime;
- exportação de diagnóstico JSON;
- reparo estrutural seguro com checkpoint obrigatório antes de alterações;
- preflight Linux explícito;
- release gate estático (`qa-core.sh`).

## O que fica congelado como contrato Core 1.0
1. Entidade é separada da instância visual.
2. Layout é propriedade da View, não da entidade.
3. Livre, Fluxo, Jornada e Blueprint compartilham o mesmo Service Graph.
4. Containers mantêm hierarquia explícita.
5. Conexões não criam significado semântico automaticamente.
6. Structured Views usam Column / Lane / Cell.
7. Persona, Canal e Emoção são primitives do Graph.
8. Persistência usa revisão Graph/meta, mirror durável e checkpoints.
9. Importação completa cria checkpoint antes de substituir o projeto.
10. Grandes quadros usam viewport culling e semantic zoom.

## Próxima fase
Após esta versão, novas grandes áreas do Service Studio podem reutilizar o Whiteboard Core em vez de criar motores próprios.
