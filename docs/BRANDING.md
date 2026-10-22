# BRANDING — ELODIA OS

> La paleta es una **propuesta provisional** basada en la referencia visual, no los códigos oficiales. Se centraliza en tokens para cambiarla en un solo lugar.

## Principios
Lujo premium · exclusividad · elegancia · tradición mexicana · sofisticación · identidad artesanal. Modo oscuro por defecto; dorado solo para acentos, indicadores y acciones principales. Sin ornamento excesivo.

## Tokens (CSS, `packages/ui`)

```css
:root {
  --background: #101012;
  --surface: #211E1C;
  --surface-secondary: #2B2723;
  --gold-primary: #D8B777;
  --gold-secondary: #B8924F;
  --text-primary: #F5EBDD;
  --text-secondary: #B9B1A4;
  --border: #40392F;
  /* semánticos (propuestos) */
  --success: #7FB285; --warning: #E0A84F; --danger: #D9675B; --info: #7FA6C9;
}
```

Contraste: `text-primary` sobre `background` ≈ 15:1; `text-secondary` ≈ 8:1; texto sobre botón dorado usa `--background` (verificar ≥ 4.5:1 en Fase 1).

## Tipografía (propuesta)
- Encabezados: serif elegante (p. ej. *Cormorant Garamond* o *Playfair Display*).
- Datos/UI: sans legible con cifras tabulares (p. ej. *Inter*).
Se confirma con la marca; cargar vía `next/font` (sin CDN externo en runtime).

## Reglas
- Reutilizar únicamente recursos oficiales entregados; **no** crear ni modificar logotipos.
- No usar fotografías genéricas de tequila como si fueran oficiales; usar estados vacíos/placeholders neutros.
- La IA no sustituye recursos oficiales sin aprobación humana (control en Brand Kit: `official=true`).
- Componentes: tarjetas KPI, tablas con filtros/paginación, formularios validados, gráficos Recharts con paleta dorada/neutra, estados de carga/vacío/error/confirmación, iconos Lucide.
- Accesibilidad: foco visible, navegación por teclado, `prefers-reduced-motion`, contraste AA.
- Sensación de producto SaaS premium: espaciado generoso, jerarquía clara, microinteracciones sobrias.
