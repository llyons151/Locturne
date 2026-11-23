"""Makes `<name>-retake.jpg` for every reference in bed-pairs.txt that wants one: the photo as if taken
again the next morning from about the same spot. Turned 3 degrees, moved 4%, cropped 92%, 12% darker."""
import pathlib, sys
from PIL import Image, ImageEnhance

folder = pathlib.Path(sys.argv[1])
pairs = pathlib.Path(__file__).with_name('bed-pairs.txt').read_text().splitlines()
for line in pairs:
    if line.startswith('#') or not line.strip():
        continue
    ref, shot, _ = line.split()
    if not shot.endswith('-retake') or not (folder / f'{ref}.jpg').exists():
        continue
    img = Image.open(folder / f'{ref}.jpg').convert('RGB')
    w, h = img.size
    img = img.rotate(3, resample=Image.BICUBIC, expand=False)
    cw, ch = int(w * 0.92), int(h * 0.92)
    left, top = int(w * 0.04) + int(w * 0.03), int(h * 0.04) - int(h * 0.02)
    img = img.crop((left, top, min(w, left + cw), min(h, top + ch)))
    img = ImageEnhance.Brightness(img).enhance(0.88)
    img.save(folder / f'{shot}.jpg', quality=85)
    print('made', shot)
