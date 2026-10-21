# Data Integrity — V1.10.0

## Regra central

Mutações estruturais devem passar pelo Integrity Engine. O motor conhece relações do núcleo, entidades estendidas, boards, tarefas, métricas, pesquisa, benefícios, cenários e governança.

### Exclusão

O plano de exclusão possui três classes:

- `cascade`: objetos cuja existência depende da entidade removida;
- `detach`: relações opcionais que podem ser removidas com segurança;
- `block`: restrições que impedem a operação, como excluir a última Jornada do Serviço.

### Importação

1. Parse JSON.
2. Migrar Schema V2 → V3 quando necessário.
3. Reparar referências opcionais que podem ser desacopladas com segurança.
4. Validar relações obrigatórias.
5. Bloquear a importação se ainda houver erro estrutural.

### Persistência

- IndexedDB: cópia durável completa (`latest-good` + checkpoints).
- localStorage: cache rápido; quando o projeto excede a quota, usa uma representação compacta que remove payloads de imagem e mantém a cópia completa no IndexedDB.
- Recuperação escolhe a revisão durável mais recente quando ela é igual ou superior ao cache local.

### Segurança de mídia

Imagens embutidas só são aceitas como `data:image/<tipo>;base64,...`. Links são limitados a HTTP/HTTPS nos caminhos sanitizados de importação.
