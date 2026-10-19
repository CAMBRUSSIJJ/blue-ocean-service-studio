# Blue Ocean Service Studio V1.20.5-H17.0.4

## Referência do vídeo implementada

Painel inicial de ações diretas (Nova Jornada, Nova Persona, Nova Métrica), biblioteca recente, escolha de mapa em branco/modelo em tela cheia e edição da primeira etapa diretamente na Jornada. O caminho de fases antigo ficou recolhido, podendo ser exibido sob demanda.

A abertura agora seleciona a Jornada no editor integrado (`journeyHome.selectInWorkspace`), sem montar o canvas sobreposto.

A criação não exige Pesquisa nem cadastro prévio de Persona. Os modelos reutilizam `journeyHome.model().templates` e `journeyHome.create({ templateId })`; as etapas geradas são exemplos editáveis, não fatos confirmados. Sem integração de geração por IA.

## Dados e validação

Sem migrações destrutivas. Jornada e contexto continuam no grafo original. H17.0.3.1 TS2367 já corrigido. `npm run qa`, `preflight-linux.sh`, PostCSS e `tsc --noEmit --noCheck` validam fonte; para `npm run typecheck`/`npm run build` completos instalar as dependências.
