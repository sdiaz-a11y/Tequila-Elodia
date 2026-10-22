# BRANDING — ELODIA OS

Fuente: referencia de identidad visual v1.0 ([brand-reference.json](brand-reference.json), versión condensada) y recursos en [assets/brand/official/](../assets/brand/official/).

## Recursos oficiales (no modificar)
| Archivo | Contenido |
|---|---|
| `assets/brand/official/elodia-botella.png` | Botella de producto, PNG 1024×1536 con transparencia real (RGBA). Usable directamente sobre la UI oscura. |
| `assets/brand/official/elodia-caja-presentacion.jpeg` | Caja de presentación en campo de agave (foto de referencia de marca). |

Faltan: logotipo vectorial independiente (SVG/PNG con transparencia), tipografías oficiales, firma de Jorge Serratos aislada. Hasta tenerlos, la UI usa texto "ELODIA" en tipografía serif provisional, **sin** simular el logotipo.

## Principios
Lujo premium · exclusividad · elegancia · tradición mexicana · sofisticación · ceremonial. Distribución sugerida: **70 % negro / 20 % dorado / 10 % neutros**. Modo oscuro por defecto.

## Paleta de marca
| Token | Hex |
|---|---|
| obsidian_black | `#0B0B0D` |
| charcoal_black | `#1B1A1C` |
| matte_graphite | `#29272A` |
| metallic_gold | `#B8924F` |
| champagne_gold | `#D8B777` |
| antique_gold | `#98733D` |
| warm_ivory | `#F0E4CF` |
| sunset_amber | `#E9A85C` |
| agave_green | `#53634A` |

## Tokens de interfaz (ELODIA OS)
```css
:root {
  --background: #101012;
  --sidebar: #171619;
  --surface: #211E1C;
  --surface-secondary: #2B2723;
  --gold-primary: #D8B777;
  --gold-secondary: #B8924F;
  --text-primary: #F5EBDD;
  --text-secondary: #B9B1A4;
  --border: #40392F;
  /* estados: distintos del dorado para no confundir acento con alerta (propuestos) */
  --success: #7FB285; --warning: #E0A84F; --danger: #D9675B; --info: #7FA6C9;
}
```
Verificar contraste AA en Fase 1 (texto sobre botón dorado usa `--background`).

## Tipografía
- Principal: serif elegante de alto contraste (nombre, categoría, titulares), color `#D8B777`.
- Secundaria: serif clásica en mayúsculas para nombres de edición e información.
- Decorativa: firma manuscrita de Jorge Serratos (solo como imagen oficial).
- **La fuente exacta no está confirmada**; no afirmar una familia concreta sin archivos de marca. Para la UI: serif provisional para encabezados (p. ej. Cormorant Garamond) + sans legible con cifras tabulares (p. ej. Inter) para datos.

## Reglas de UI
- Botones: superficies oscuras con acentos dorados contenidos; tarjetas carbón con bordes sutiles; gráficos en serie dorada sobre fondo oscuro; navegación mínima; tablas de alto contraste.
- Ornamentos con moderación; **evitar degradados dorados excesivos**; priorizar legibilidad y uso profesional.
- Estados (éxito/alerta/error) visualmente distintos del dorado.
- Accesibilidad: foco visible, teclado, `prefers-reduced-motion`.

## Datos del producto (solo los visibles en la imagen oficial)
Elodia · 100 % Agave · TEQUILA AÑEJO · 750 ml · HECHO EN MÉXICO · Edición Especial Conmemorativa 2026 · firma Jorge Serratos · "1+1=3". La graduación alcohólica visible en la imagen (35 % Alc. Vol.) y los textos pequeños **requieren verificación** antes de usarse como dato; no se cargan como catálogo hasta que el equipo los confirme.

## Restricciones creativas
**Preservar:** nombre oficial, identidad negro/dorado, posicionamiento premium, silueta de la botella (cuello torcido, tapón facetado, ornamentos), identidad del empaque.
**Evitar:** reemplazar el logotipo, inventar certificaciones, cambiar información de etiqueta, branding genérico de tequila, exceso decorativo, claims no verificados.
La IA no sustituye recursos oficiales sin aprobación humana (Brand Kit: `official = true`).
