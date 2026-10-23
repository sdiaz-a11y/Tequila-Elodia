# ELODIA OS

Plataforma privada de dirección, comercialización, marketing y expansión de la marca ELODIA.

**Estado:** Fase 1 en curso (Sprint 1.1 completado) — ver [docs/PROGRESS.md](docs/PROGRESS.md).

## Documentación
- [Arquitectura](docs/ARCHITECTURE.md) · [Base de datos](docs/DATABASE.md) · [Módulos y navegación](docs/MODULES.md)
- [Roadmap y backlog](docs/ROADMAP.md) · [Branding](docs/BRANDING.md) · [Seguridad](docs/SECURITY.md) · [API](docs/API.md) · [Decisiones](docs/DECISIONS.md)
- [Guía para Claude Code](CLAUDE.md)

## Puesta en marcha
```bash
corepack enable          # o ver docs/ARCHITECTURE.md §1 si no hay permisos
pnpm install
cp .env.example .env     # completar con las credenciales de Supabase (nunca se versiona)
pnpm dev                 # web :3000, api :4000
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

## Base de datos (Supabase)
```bash
pnpm --filter @elodia/database migrate:deploy   # aplica migraciones (usa DIRECT_URL)
pnpm --filter @elodia/database seed             # organización, permisos y roles (idempotente)
```
Las migraciones destructivas requieren autorización explícita.
