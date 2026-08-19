# ft_transcendence — Base Docker

Squelette de départ pour le projet d'équipe. Il démarre **4 services** en une
commande et affiche une page d'index derrière `nginx` en HTTPS. Chaque membre
viendra ensuite greffer ses modules **à l'intérieur** de `frontend/` et
`backend/` (pas de nouveau conteneur par module).

## Ce que ça fait

- `nginx` reçoit tout le trafic sur `:443` (HTTPS, certificat auto-signé) et
  redirige `:80` → `:443`.
- Il sert le **frontend** React/Vite (avec hot-reload) sur `/`.
- Il relaie `/api/...` vers le **backend** NestJS.
- Le **backend** expose `GET /api/health` → `{ "status": "ok" }`.
- La page d'index affiche un **titre**, un **corps**, et l'état du backend
  (preuve que la chaîne navigateur → nginx → NestJS fonctionne).
- La **database** PostgreSQL tourne avec un volume persistant, prête pour l'ORM.

## Arborescence

```
.
├── Makefile              # `make up` / `make down` / `make logs` ...
├── docker-compose.yml    # orchestration des 4 services
├── .env.example          # gabarit de secrets (copié en .env automatiquement)
└── srcs/
    ├── nginx/            # reverse proxy + TLS
    ├── frontend/         # React + Vite + TypeScript
    ├── backend/          # NestJS
    └── database/         # PostgreSQL (image officielle, pas de Dockerfile)
```

## Lancer le projet

```bash
make up
```

Ouvre **https://localhost** → accepte l'avertissement de certificat (normal en
local avec un certificat auto-signé). Tu dois voir le titre, le corps, et
« Backend: ok ».

```bash
make logs   # logs en direct
make down   # tout arrêter
make clean  # arrêter + supprimer le volume de la base (efface les données)
make re     # redémarrage complet
```

Pour tout comprendre en détail (concepts, pièges, défense), voir **STUDY.md**.
