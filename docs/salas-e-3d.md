# Salas e 3D no Service Studio

Abra um projeto e selecione **Salas e 3D** no menu de desenho. A primeira tela é a
planta geral do serviço. **Ampliar editor** usa a tela inteira; Escape permite sair.

1. Em **Mapa do serviço**, escolha um mapa existente ou **Planta do serviço** para
   planejar apenas os ambientes.
2. Na planta geral, crie as salas, mova-as e desenhe os corredores.
3. Em **Atividades e fluxo**, use o botão de transferência de uma atividade para
   vinculá-la a uma sala. As atividades mantêm os IDs e os dados do mapa original.
4. Selecione a sala e abra **Sala em 3D** para inserir móveis, configurar paredes,
   portas e passagens. A planta 2D permite editar as mesmas estruturas.
5. Use **Editar mapa** para alterar atividades, tempos ou conexões. Ao retornar,
   as salas usam os dados atuais do mapa.

As alterações usam o salvamento e o histórico do projeto. **Desfazer**, **Refazer**
e **Backup do projeto** incluem os ambientes. Um projeto diferente mantém sua
própria planta. No celular, há um atalho **Salas e 3D** na navegação inferior.

## Dados e limites

A geometria fica em `service.spatialDesign`, com uma planta independente por ID
de mapa e uma planta geral do serviço. São armazenados os ambientes, as atribuições
por ID de atividade, os móveis, as paredes, as portas, as escalas e os corredores.
Textos e tempos continuam pertencendo ao mapa. Notas das faixas operacionais
legadas também são reconhecidas; notas de pesquisa e Personas permanecem no mapa.

A criação de salas não insere exemplos ou atividades fictícias. As visualizações
espaciais representam a organização física; não calculam tempos operacionais.
Mapas acima de 24 etapas, 600 componentes operacionais ou 1500 conexões exibem uma
orientação para dividi-los, sem truncar os dados. Cada planta comporta até 48 salas.

O editor exige WebGL para o 3D. Se o navegador não oferecer esse recurso, a planta
2D continua disponível. As medidas representam uma malha esquemática.

## Desenvolvimento e verificações

Consulte [Desenvolvimento](desenvolvimento.md) e [Testes](testes.md) para preparar
Node.js, Python e Playwright. A fonte do editor fica em
[src/integrations/blue-ocean3d](../src/integrations/blue-ocean3d/README.md).

```bash
npm ci
npm run release:verify
npm run spaces:test
npm run spaces:browser
npm run docs:check
```

O teste de navegador serve a build com os mesmos cabeçalhos CSP do servidor Linux.
Cobre mapa nativo, atribuição de atividade, WebGL real, mobiliário, histórico,
backup e restauração, recarregamento, troca de projeto, permissões e celular.
Capturas e resultados ficam em `artifacts/service-spaces/`.

Para testar durante o desenvolvimento:

```bash
npm run dev -- --host 127.0.0.1 --port 5184
# Em outro terminal, depois de preparar os assets:
BO_SPACES_URL=http://127.0.0.1:5184 npm run spaces:browser
```

## Pacote Linux completo

Depois da verificação de release, `python3 scripts/package-linux-spaces.py` cria
`downloads/Blue-Ocean-Service-Studio-3D-Linux.zip` e seu SHA-256. O pacote contém o
código fonte e a build pronta, sem `node_modules` ou dados pessoais. Extraia e
execute `bash ABRIR-LINUX.sh`; basta Python 3 para abrir a build local em
`http://127.0.0.1:4173/`. Mantenha o terminal aberto durante o teste.

Para modificar e recompilar o código, use Node.js 22 e as instruções de
[desenvolvimento no Linux](../README-LINUX.md).
