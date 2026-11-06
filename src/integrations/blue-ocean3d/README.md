# Blue Ocean 3D incorporado ao Service Studio

Origem: [CAMBRUSSIJJ/Blue-Ocean3D](https://github.com/CAMBRUSSIJJ/Blue-Ocean3D),
commit `748f47ffa117112680283e6f89864f37ab1c2d6f`, branch
`ux-auditoria-18-correcoes`. O código foi incorporado por solicitação do proprietário
dos dois projetos. A distribuição mantém a licença MIT do Three.js em
`vendor/three/LICENSE`.

`app/studio-entry.mjs` é a entrada desta distribuição. Carrega apenas o editor
de ambientes; o `app.mjs` original fica como referência da origem. O projeto de
exemplo, o armazenamento de projetos do aplicativo independente, o Copiloto e o
simulador independente não são inicializados.

Adaptações locais:

- `studio-host.mjs`: protocolo com origem, janela, sessão, revisão e confirmação
  das transações; histórico e permissões pertencem ao Studio.
- `studio-host.css`: integração visual e remoção do cabeçalho independente.
- `environments-ui.mjs`: criação de salas vazias e abertura das atividades no mapa
  original. Os modelos que criam atividades independentes ficam desativados.
- `index.html`: entrada e estilos incorporados; sem scripts inline.
- `v23.css`: cor de superfície substituída pelo token semântico da plataforma.
- Declarações `.d.mts` para os contratos puros usados pelo adaptador TypeScript.

Edite esta pasta, nunca `public/blue-ocean3d/`. `scripts/prepare-assets.mjs`
recria os arquivos públicos e o bundle CSS com camadas a partir do manifesto.
Reinicie `npm run dev` depois de alterar os módulos incorporados, ou execute
`node scripts/prepare-assets.mjs` antes de recarregar o navegador.

O adaptador e a persistência estão em `src/services/service-spaces.ts` e
`src/domain/spatial-design-schema.ts`. O guia de uso está em
`docs/salas-e-3d.md`.
