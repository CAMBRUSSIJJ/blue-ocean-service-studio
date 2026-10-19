# V1.20.5-H7.0.4 — Visible Wave Click Feedback

- Corrige o pulso H7.0.3 que ficava atrás da superfície de navegação (`z-index`).
- Cada clique da sidebar agora gera ripple visível no próprio botão.
- A onda inferior sobe de forma mais clara e sincronizada com o clique.
- O pulso lateral nasce na altura do item selecionado e passa pela superfície visível da sidebar.
- `prefers-reduced-motion` mantém feedback visual curto sem movimento amplo, em vez de eliminar todo feedback.
- Não altera a arquitetura de navegação H6 nem a paleta estrutural aprovada.
