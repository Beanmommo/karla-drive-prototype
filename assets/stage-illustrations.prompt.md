# Karla Drive stage illustrations

Generated with the built-in imagegen tool. Each call requested `transparent_background: true`.

## Stage 1

Initial output: `stage-1-car-control-tall.png` (the taller cone selected for the app).

Shorter variation: `stage-1-car-control-v2.png` (created with the proportion refinement below).

```text
Use case: stylized-concept
Asset type: Karla Drive mobile app stage illustration, one individual square transparent PNG asset.
Style/medium: Minimal cute flat 2D illustration with thick smooth charcoal outlines, consistent stroke weight, rounded joins and corners, broad uncomplicated shapes, crisp flat solid colour fills. Readable immediately at small icon size. No shading or dimensional rendering.
Composition/framing: Centre a single compact composition in a square canvas with generous transparent empty margins, about 18–22% on each side. All objects fully visible.
Scene/backdrop: Genuinely transparent background with alpha, including all empty spaces. Do not draw a background colour, card, checkerboard, or shadow.
Primary request: Stage 1 — Car control: Cone + L plate.
Subject: One short, rounded orange traffic cone with exactly one white stripe and a wide softly rounded orange base. Beside it, a yellow square learner plate, tilted slightly and overlapping the cone's lower edge. Both objects clearly recognisable.
Text (verbatim): "L" — one bold black uppercase L centred on the yellow learner plate. No other text.
Intended surrounding UI: pale blue #E4F4FE card, which must NOT be included in the image.
Avoid: koalas, cars, scenery, extra objects, shadows, gradients, texture, text beyond the L.
```

## Stage 2

Output: `stage-2-basic-drives.png`

```text
Use case: stylized-concept
Asset type: Karla Drive mobile app stage illustration, one individual square transparent PNG asset.
Style/medium: Minimal cute flat 2D illustration with thick smooth charcoal outlines, consistent stroke weight, rounded joins and corners, broad uncomplicated shapes, crisp flat solid colour fills. Readable immediately at small icon size. No shading or dimensional rendering.
Composition/framing: Centre a single compact composition in a square canvas with generous transparent empty margins, about 18–22% on each side. All objects fully visible.
Scene/backdrop: Genuinely transparent background with alpha, including all empty spaces. Do not draw a background colour, card, checkerboard, or shadow.
Primary request: Stage 2 — Basic drives: Neighbourhood roads.
Subject: A small neighbourhood road layout from a gently elevated view: a short curved road meeting a simple side street, with exactly two tiny rounded houses beside it and exactly one small tree. Roads form the main shape; houses are small supporting details. Use broad uncomplicated shapes so the neighbourhood is recognisable at icon size.
Color palette: Flat light-grey roads, soft mint greenery, pale cream houses, muted peach roofs, charcoal outlines.
Intended surrounding UI: pale mint #E5F5EB card, which must NOT be included in the image.
Avoid: koalas, cars, people, signs, text, detailed windows, shadows, gradients, texture, elaborate scenery.
```

## Stage 3

Output: `stage-3-complex-drives.png`

```text
Use case: stylized-concept
Asset type: Karla Drive mobile app stage illustration, one individual square transparent PNG asset.
Style/medium: Minimal cute flat 2D illustration with thick smooth charcoal outlines, consistent stroke weight, rounded joins and corners, broad uncomplicated shapes, crisp flat solid colour fills. Readable immediately at small icon size. No shading or dimensional rendering.
Composition/framing: Centre a single compact composition in a square canvas with generous transparent empty margins, about 18–22% on each side. All objects fully visible.
Scene/backdrop: Genuinely transparent background with alpha, including all empty spaces. Do not draw a background colour, card, checkerboard, or shadow.
Primary request: Stage 3 — Complex drives: Highway + rain.
Subject: One short stretch of highway receding gently into the distance, with exactly two broad lanes separated by a few large white dashes. Above one side of the highway, one single puffy cloud with exactly three chunky blue raindrops. Keep the cloud and road close together as one compact symbol. Gentle approachable weather.
Color palette: Flat grey road surfaces, a pale lavender cloud, sky-blue raindrops, charcoal outlines, white lane dashes.
Intended surrounding UI: pale lavender #F0E9FC card, which must NOT be included in the image.
Avoid: koalas, cars, people, buildings, lightning, text, shadows, gradients, texture, detailed road infrastructure.
```

## Stage 4

Output: `stage-4-rehearsing-solo.png`

```text
Use case: stylized-concept
Asset type: Karla Drive mobile app stage illustration, one individual square transparent PNG asset.
Style/medium: Minimal cute flat 2D illustration with thick smooth charcoal outlines, consistent stroke weight, rounded joins and corners, broad uncomplicated shapes, crisp flat solid colour fills. Readable immediately at small icon size. No shading or dimensional rendering.
Composition/framing: Centre a single compact composition in a square canvas with generous transparent empty margins, about 18–22% on each side. All objects fully visible.
Scene/backdrop: Genuinely transparent background with alpha, including all empty spaces. Do not draw a background colour, card, checkerboard, or shadow.
Primary request: Stage 4 — Rehearsing solo: Point-to-point navigation.
Subject: One single softly rounded square map tile, viewed mostly from above. Inside it, only a few broad pale street lines. Connect a small circular starting marker to a larger rounded destination pin with one clear gently bending sky-blue route. Two endpoints and connecting route are the dominant features, immediately readable at small size.
Color palette: Thick charcoal outlines on map outer edge and markers, warm cream map surface, subtle peach map blocks. Sky-blue route. Secondary streets much lighter than the route.
Intended surrounding UI: warm peach #FFF0DC card, which must NOT be included outside the map tile.
Avoid: koalas, cars, people, labels, letters, compass, phone frame, shadows, gradients, texture, additional interface controls.
```

## Stage 1 final proportion refinement

The shorter stage-one variation uses this edit of the initial generated cone illustration. The app uses the original taller cone at the user's request.

```text
Use case: precise-object-edit
Input image: edit target — the generated Karla Drive cone and learner plate illustration.
Primary request: Make the traffic cone SHORT and SQUAT, with its body approximately as tall as it is wide at the bottom, a very rounded top, and a broad softly rounded base. Preserve the slightly tilted yellow square learner plate with its bold black uppercase "L", overlapping the cone's lower edge. Preserve exactly one white stripe around the cone.
Composition: Centre the compact pair on a square transparent canvas. The whole pair should occupy about 64% of canvas width with generous empty transparent margins on every side.
Style: Retain the smooth thick charcoal outlines and cute rounded joins. Strictly flat solid orange, yellow, white and charcoal colour regions, with no gradients, shading, texture or lighting variation.
Invariants: Exactly one cone, exactly one learner plate, no text beyond "L". Keep both objects immediately recognisable at icon size.
Background: Preserve genuine alpha transparency in all empty areas. No coloured card background, no checkerboard, no shadow, no extra objects.
```
