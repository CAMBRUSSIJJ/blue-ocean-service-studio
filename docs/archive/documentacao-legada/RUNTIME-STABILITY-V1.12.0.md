# Runtime Stability V1.12.0

## Fluxo de inicialização
1. Runtime Registry.
2. Data Integrity.
3. Whiteboard/Data Bridge.
4. Stability bootstrap executa recovery e valida persistência.
5. React monta a aplicação somente após `dataBridge.prepare()`.
6. Módulos complementares registram suas APIs.
7. Blue Ocean Shell aplica branding por eventos, sem observar/mutar o DOM continuamente.

## Persistência
- Fonte primária: Service Graph V3.
- Cache: localStorage revisionado.
- Cópia durável: IndexedDB `latest-good` + checkpoints.
- Concorrência: revisão maior em outra aba bloqueia overwrite.
- Corrupção: estado bruto é preservado na chave de quarentena antes do fallback.

## Importação
A importação completa agora pode ser iniciada fora do Whiteboard. O diálogo usa o overlay quando disponível e `document.body` como host seguro quando o editor está fechado. Antes da troca é criado checkpoint; persistência falha dispara rollback.

## Tela branca
Há estado de boot, captura de falhas de inicialização e Error Boundary. A aplicação não deve ficar silenciosamente em branco.
