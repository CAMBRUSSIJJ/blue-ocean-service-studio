# V1.20.5-H7.20-H1 — Dashboard Balance Recovery

Hotfix de regressão visual da H7.20.

## Problema comprovado
A H7.20 reduziu demais a largura dos blocos em desktop: Recentes encolhia para 766 px com três itens, ações ficavam presas a 690 px, Profundidade caiu para 154 px e Aprender parava em um grid estreito. Em viewport 1920×1200 isso deslocava quase todo o conteúdo para a esquerda e deixava uma área vazia excessiva à direita.

## Correção
- restaura canvas principal em largura total;
- Recentes volta a ser uma faixa de workspace em largura total;
- cards recentes mantêm tamanho finito e capa Journey em destaque;
- ações rápidas ocupam largura equilibrada sem ficarem microscópicas;
- Profundidade volta para 184 px e tipografia legível;
- Aprender utiliza toda a largura disponível;
- Favoritos vazio permanece compacto, mas volta a uma escala legível;
- preserva H7.19-H1, Journey Cover, branding e fundo oceânico.

Nenhuma nova funcionalidade de produto foi adicionada.
