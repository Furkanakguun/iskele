# Iskele

Mock frontend for a Docker image workflow UI: pick a Git repo/branch, list Dockerfile modules, then **build → tar → zip → push** on a CI host (Jenkins-style). No real Docker/Git backend yet — data is fictional demo content.

## Stack

- React + TypeScript + Vite + Tailwind
- App lives in [`web/`](web/)

## Quick start

```bash
cd web
npm install
npm run dev
```

Mock login: `testci` / `testci` (or `admin` / `admin`).

## Demo data

Sample project is **Nimbus Cart** (fictional microservices). Not tied to any company repo or registry.

## Status

Frontend-only prototype. Backend (Git API + Docker jobs) is planned later.
