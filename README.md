# HMS-GS — Next.js 16 + Prisma 7

Squelette du projet de gestion scolaire, reconstruit sur une vraie base de
données (SQLite via Prisma) à la place de `json-server` + accès direct
depuis le client.

## Stack

- **Next.js 16** (App Router, Turbopack)
- **Prisma ORM 7** — nouveau client `prisma-client` (sans moteur Rust),
  généré dans `src/generated/prisma` (voir `prisma/schema.prisma`)
- **SQLite** (base de données locale)
- **Tailwind CSS v4**
- **TypeScript** (ESM, `moduleResolution: bundler`)

## Démarrage

```bash
npm install
# Créer .env avec DATABASE_URL="file:./dev.db" et AUTH_SECRET
# (ou ajuster selon votre configuration)

npm run db:migrate          # crée/actualise la base SQLite + régénère le client Prisma
npm run db:seed             # données de référence minimales (rôles, genres...)

npm run dev
```

## Scripts utiles

| Commande            | Rôle                                                |
| -------------------- | ---------------------------------------------------- |
| `npm run dev`         | Serveur de dev (Turbopack)                          |
| `npm run db:migrate`  | Crée/actualise les tables + régénère le client      |
| `npm run db:studio`   | Interface graphique pour explorer les données        |
| `npm run db:seed`     | Rejoue `prisma/seed.ts`                              |

## Où en est la migration

- [x] Schéma Prisma normalisé (voir `prisma/schema.prisma`), construit à
      partir de l'analyse de l'ancien `database/db.json` **et** de la
      logique réelle du code (formulaires, génération de planning, module
      de pointage) — plusieurs champs mal nommés dans l'ancien projet ont
      été corrigés (`semaineId`, `themeProgrammeId`, `programmeId`,
      `StatutPointage`...).
- [x] Config Next.js 16 / Prisma 7 / Tailwind v4 / SQLite.
- [x] Exemple de route API serveur (`src/app/api/eleves/route.ts`) montrant
      le pattern à reproduire pour chaque ressource : **plus aucun accès
      direct du client à la base**, contrairement à l'ancien projet
      (json-server exposé tel quel + axios côté client).
- [ ] Script de migration des données `back-up-db/dev.db` → Sqlite.
- [ ] Authentification serveur (sessions signées, mots de passe hashés —
      l'ancien projet stockait les mots de passe en clair).
- [ ] Migration des pages (élèves, enseignants, classes, répartitions,
      programmes, coefficients, pointages) vers l'App Router + Prisma.

## Note sur la validation du schéma

`prisma generate` / `prisma validate` nécessitent le téléchargement d'un
petit moteur binaire (`schema-engine`) depuis `binaries.prisma.sh` la
première fois. Si cette commande échoue avec une erreur réseau/403 dans un
environnement restreint, autorisez ce domaine ou lancez la commande depuis
une machine avec un accès réseau standard — le schéma en lui-même a été
relu et vérifié manuellement (toutes les relations ont leur champ inverse).
