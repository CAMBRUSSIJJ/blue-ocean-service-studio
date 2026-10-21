# Desenvolvimento no Linux

Use **Node.js 22** e **npm 10 ou superior**. Com o nvm instalado, `nvm use`
seleciona a versão indicada em `.nvmrc`.

```bash
npm ci
npm run dev
```

O Vite informa o endereço do servidor no terminal. Para usar o fluxo local,
selecione **Abrir workspace local sem conta** na aplicação.

## Verificações

```bash
npm run docs:check
npm run release:verify
bash preflight-linux.sh
```

O preflight verifica arquivos e contratos do pacote Linux. Ele complementa
o build e os testes; não substitui a validação funcional no navegador.

Os launchers `START.sh`, `start-linux.sh` e `bootstrap-linux.sh` continuam
disponíveis para o fluxo existente. Leia o script antes de executá-lo:
o bootstrap instala dependências, valida a distribuição e inicia o launcher.

## Navegador e ambiente de nuvem

Os testes de navegador usam Python com Playwright e Chromium. Consulte o
[guia de testes](docs/testes.md) para instalar e executar esses componentes.
Para o checkout gerenciado em `/workspace`, use a
[configuração da nuvem](.cloud-environment/README.md).

As notas do antigo README foram preservadas no
[arquivo histórico](docs/archive/notas/README-V1.19.6.md).
