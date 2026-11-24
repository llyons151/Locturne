"""Writes shiny.json with a starting shiny for every moon not in it yet (keeps your edits)."""
import json, pathlib
from shinylib import moons, default_params
P = pathlib.Path(__file__).parent / 'shiny.json'
params = json.loads(P.read_text()) if P.exists() else {}
for i, m in enumerate(moons()):
    if 'a' not in params.get(m['id'], {}):
        params[m['id']] = default_params(m['glow'], i)
P.write_text(json.dumps(params, indent=1))
print(len(params), 'moons')
