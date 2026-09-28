# Stage 4 — Borderless map illustration

Mode: built-in imagegen with `transparent_background: true`.

Input: `stage-4-rehearsing-solo.png`

Output: `stage-4-rehearsing-solo-v2.png`

The outer charcoal frame is removed. The generated alpha cutout retains a thin pale fringe along parts of the outer edge.

## Final selected edit prompt

```text
Use case: precise-object-edit
Input image: edit target — Karla Drive Stage 4 point-to-point navigation map illustration.
Primary request: Remove only the thick charcoal border around the outside of the rounded square map tile. Make the outer edge completely borderless, with the warm cream map surface and pale street/block artwork extending naturally to the same rounded square silhouette.
Invariants: Preserve the map tile's position, dimensions, rounded corners, warm cream surface, peach blocks, pale street layout, gently bending sky-blue route, circular starting marker, and red destination pin. Keep the dark outlines of the two navigation markers unchanged. Keep all colours, composition, and generous margins as close to the original as possible.
Background: Preserve genuine alpha transparency outside the map tile. No replacement outline, frame, stroke, shadow, glow, new objects, labels, letters, or interface controls. Flat illustration.
```
