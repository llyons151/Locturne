# Instagram pinned trio

15 designs for the 3 pinned posts. Each is one 3240×1440 canvas cut into three 1080×1440 (3:4) tiles.
Research: docs/reports/Instagram pinned post trio.md (local only).

- `versions.js`: every design (background, phones, text). Tiles are centred at x = 540 / 1620 / 2700.
- `trio.html?v=01`: draws one design (add `&debug` to see the seams).
- `./render.sh [ids]` → `out/<id>/trio.png` + `tile-1..3.jpg` (post tile 3 first, tile 1 last).
- Phones: `ph/<shot>__<angle>.webp`, made from tools/store-shots/phone3d/compose.py (`--grid grid-soft`), then
  resized to 1700 px tall. Not in git (`phones/`, `ph/`, `out/`).
