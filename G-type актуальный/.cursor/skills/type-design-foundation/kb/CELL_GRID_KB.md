# Cell-grid drawing («Ячейки») — study of Inbetween (user video, Nov 2026) and our implementation

## Reference mechanics (Inbetween)
- Canvas = grid of cells (default 10×10), each drawn as an outlined shape; pencil fills cells, size 1–7, eraser, trash.
- Filled neighbours fuse into one stroke: straight bridges, convex corners keep the cell shape, concave corners filleted.
- Active grid: shape A/B (circle, square, diamond, triangle, pentagon, hexagon, octagon) + SHAPE % morph, ROTATION, COLUMNS/ROWS, cell SIZE.
- Main grid + subgrid, link grids; project link NONE / GRIDS / SETTINGS ALL; RANDOM, RESET; layers; status «N circles · N layers»; show grid.
- Any settings change morphs drawn letters smoothly into the new look ("filling and transition").

## Implementation in G-type (core_draw_n7.js DRC, ui_draw_n7.js)
- Per-glyph data: cell layers (cell list + grid settings each); ink regenerated, merged with other contours on save/build; old saves compatible.
- Rows map cap height 700; «Нижние ряды» 0–4 add rows below baseline.
- Fusion: raster of cells + bridges → distance-transform closing (concave only) → csgTrace/csgFit. Bridge band = shape's extent perpendicular to the bridge (asymmetric for triangle/pentagon); at «Скругление стыков» 0 the band is capped to one cell to show shape texture.
- QA (tests/e2e_cells.py): no self-intersections, node limits, capsule/circle deviation < 1u, 6 shapes × 5 rotations straight runs spread < 1.5u, panel = canvas state, persistence, TTF contours.
- Transition: SDF blend over --dur-base / --ease-std, retargetable, instant under reduced motion.
- Performance: coarse preview ≤1/frame during drag; exact contours after gesture; linked glyphs recomputed lazily one per tick.

## Lessons
- Panel must re-render from model on every settings change (stale chips showed «Круг» over a hex grid).
- Screenshot scaling can fake "small radius" — measure curvature numerically before changing geometry.
- Layers (Inbetween «Calque»): each layer has its own grid settings + cells + visibility + name; ink = union of visible layers, each fused separately and cached; hidden layers are excluded from the font (say so in the UI). Links work by layer index.
- Mirror lesson: all cell shapes are symmetric about the vertical axis, so exact mirror = rotation −θ (horizontal) or 180°−θ (vertical); negating θ alone is wrong for asymmetric shapes on the vertical axis.
- Never re-render the layers panel inside the blur/change that the removal of its own rename input fires (guard `clBusy`).
- Key 7 belongs to glyph «7»: tool keys 1–6 only; «Ячейки» = `=` / `+` (non-glyph keys in every set).
- Known gaps: a triangle/pentagon always points up before rotation.
