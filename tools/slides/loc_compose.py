"""Make new Loc reaction pictures: one of Loc's silhouette poses (tools/reels/public/loc-*.png, the mascot's own art,
never drawn on) placed on a real photo, cropped to the 3:2 letterbox the egg format uses (1080x718).
  python3 tools/slides/loc_compose.py <pose> <photo.jpg> <out-name> [--x 0.5] [--y 0.62] [--h 0.62] [--crop-y 0.5]
pose: crossed | point | tap | walk-a | walk-b | watch.  x/y = Loc's centre (fraction of the crop), h = Loc's height
(fraction of the crop height), crop-y = where the 3:2 band sits in a taller photo (0 top .. 1 bottom).
Silhouettes are black, so pick a light background. Output: photos/loc/<out-name>.jpg"""
import os, sys
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
a = sys.argv[1:]
opt = lambda k, d: float(a[a.index(k) + 1]) if k in a else d
pose, photo, out = a[0], a[1], a[2]
bg = Image.open(os.path.join(HERE, 'photos', photo)).convert('RGB')
W, H = 1080, 718
s = W / bg.width; bg = bg.resize((W, round(bg.height * s)))
top = round((bg.height - H) * opt('--crop-y', 0.5)) if bg.height > H else 0
bg = bg.crop((0, top, W, top + H))
loc = Image.open(os.path.join(HERE, '..', 'reels', 'public', f'loc-{pose}.png')).convert('RGBA')
lh = round(H * opt('--h', 0.62)); loc = loc.resize((round(loc.width * lh / loc.height), lh))
cx, cy = opt('--x', 0.5) * W, opt('--y', 0.62) * H
bg.paste(loc, (round(cx - loc.width / 2), round(cy - loc.height / 2)), loc)
os.makedirs(os.path.join(HERE, 'photos', 'loc'), exist_ok=True)
bg.save(os.path.join(HERE, 'photos', 'loc', out + '.jpg'), quality=90)
print('photos/loc/' + out + '.jpg')
