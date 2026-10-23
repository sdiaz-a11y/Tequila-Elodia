# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: the VP of ELODIA, who leads the brand's commercial expansion and strategic/operational direction. Works mainly at a desktop (office laptop or monitor); the phone is for quick consultation: checking figures, approving things, calling or messaging a contact. Secondary (later phases): sales team, marketing, operations, finance, collaborators and external distributors, each seeing only what their role allows.

## Product Purpose

ELODIA OS is the private operating platform for the growth of ELODIA, a Mexican premium tequila brand launched by a business influencer. It centralizes strategic direction, commercial prospecting (CRM, opportunities), distributors and territorial expansion, sales, marketing and content, products and inventory, finance, projects and compliance documents. Success: the VP runs the brand's growth from one place with real, permission-scoped data and no decorative buttons.

## Positioning

A custom internal platform for one premium brand (not a generic SaaS CRM): it models the tequila brand's own reality — distributors and territories as first-class, regulated-alcohol advertising reviewed by humans, official brand assets governing every creative.

## Operating Context

Spanish (Mexico) UI; code and commits in English. Business data is entered by the team; the system never invents products, prices, clients or logos. Production model, warehouses, invoicing and logistics responsibilities are configurable, not assumed. Compliance is document control with human approvals, never an automatic "compliant" verdict.

## Capabilities and Constraints

Monorepo: Next.js (web) and NestJS (api) over Supabase PostgreSQL. Authentication is server-side sessions (httpOnly cookie, optional TOTP); every permission is enforced in the API and the UI only hides what is not allowed. Phase 1 scope: foundation, auth, admin, CRM, territories/distributors, projects/tasks, catalog and brand kit, initial dashboard. Navigation (from the master prompt): Dirección, Comercial, Marketing, Operaciones, Administración, Inteligencia, Sistema. Dark theme only (user decision, 2026-10-22). Desktop-first, responsive down to phone.

## Brand Commitments

Name ELODIA; premium Mexican tequila; luxury, elegance, exclusivity, Mexican tradition with technological modernity, editorial feel. Dark mode as the identity, gold as the accent (tokens in docs/BRANDING.md, provisional until official assets arrive). The official bottle photo (`assets/brand/official/`, served from `apps/web/public/brand/`) may be used; the logo must never be redrawn or reinterpreted — until the vector logo exists the UI uses the plain text "ELODIA". Do not claim certifications, alcohol content or label text that the team has not verified.

## Evidence on Hand

Official bottle PNG (RGBA) and a presentation-box photo of the Edición Especial Conmemorativa 2026. Absent and not to be fabricated: vector logo, official typefaces, real products, prices, clients, distributors, territories, campaigns, metrics.

## Product Principles

1. Real data or an honest empty state; never simulated figures presented as real.
2. Every control does something; nothing is decorative.
3. Permissions are enforced by the backend; the interface reflects them.
4. Premium restraint: gold and motion are accents that earn attention, not wallpaper.
5. The VP's time is the scarce resource: summarize, prioritize, make the next action obvious.

## Accessibility & Inclusion

Keyboard operable with visible focus, AA contrast on dark surfaces, `prefers-reduced-motion` respected, loading/error/empty states everywhere, Spanish (MX) copy.
