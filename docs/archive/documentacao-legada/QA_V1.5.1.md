# QA — V1.5.1 Template Engine

## Validações automatizadas

- abertura do Whiteboard sem erros JavaScript;
- biblioteca com 6 templates nativos;
- preview visual e filtros por categoria;
- filtro Operação retorna Fluxo de serviço e Mapa de processo;
- inserção parcial do Fluxo cria 6 objetos e 5 conexões;
- salvar seleção como template pessoal;
- busca de template pessoal;
- variável `{Etapa}` solicitada e substituída antes da inserção;
- criação de novo quadro a partir de template pessoal;
- integração com Command Palette;
- correção do menu contextual interceptando o modal de salvar template;
- nenhuma exceção JavaScript no fluxo final.

## Observação do ambiente
O Chromium do ambiente bloqueia navegação automatizada direta para `127.0.0.1`; o QA de interação foi executado em harness isolado com os mesmos JS/CSS distribuídos no launcher. O launcher HTTP é validado separadamente.
