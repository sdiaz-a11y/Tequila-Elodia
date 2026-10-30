# Botella 3D de ELODIA

Genera `apps/web/public/brand/elodia-botella-3d.glb` (el modelo que gira arriba a la derecha de la plataforma) a partir de la foto oficial `assets/brand/official/elodia-botella.png`. La foto original no se modifica.

## Cómo se hace

La botella es casi de revolución, así que en vez de pedirle a una IA que invente la forma, se **reconstruye en Blender con la silueta exacta de la foto** y se le proyecta encima el arte dorado:

1. `bottle_profile.py` mide la silueta (canal alfa del PNG) y guarda `profile.json`.
2. `build_textures.py` separa el arte dorado del vidrio negro y crea dos texturas: color (`albedo.jpg`) y rugosidad/metal (`orm.png`).
3. `build_bottle.py` (Blender) crea el cuerpo, la tapa de 8 caras y el espiral del cuello, aplica los materiales y exporta el GLB (~0.9 MB).

La etiqueta solo se proyecta en el frente; el reverso queda de vidrio liso (no se inventa nada que la foto no muestre).

## Regenerar

Requisitos: Blender 5.x (gratis) y Python 3.10+ con `numpy` y `pillow` (en un entorno virtual).

```
python bottle_profile.py ../../assets/brand/official/elodia-botella.png work
python build_textures.py ../../assets/brand/official/elodia-botella.png work
blender -b -P build_bottle.py -- <ruta-absoluta>/work <ruta-absoluta>/work/bottle.glb
```

Después copia `work/bottle.glb` a `apps/web/public/brand/elodia-botella-3d.glb`. Usa rutas absolutas con Blender y no dejes scripts llamados `inspect.py` o `profile.py` junto a Python (tapan módulos estándar).

## Hunyuan3D 2.1 (probado, no usado)

`hunyuan_space.py` envía la foto al Space público gratuito de Hunyuan3D 2.1 en Hugging Face (`pip install gradio_client`). Este equipo no tiene GPU NVIDIA, así que no se puede ejecutar localmente; y el Space gratuito solo alcanza para la forma sin textura. El resultado inventó una placa en la base y deformó la tapa y el espiral, por eso se descartó. Nota de licencia: el modelo final **no contiene salida de Hunyuan**; se construyó con Blender a partir de nuestra propia foto.

## Visor web

`apps/web/src/components/brand/bottle-3d.tsx` (three.js + React Three Fiber): fondo transparente, giro automático de 360°, arrastre para girarlo a mano y luces de estudio creadas en código (sin descargar nada). Si el navegador no tiene WebGL o falla la carga, `bottle-badge.tsx` muestra la foto fija. Respeta «reducir movimiento».
