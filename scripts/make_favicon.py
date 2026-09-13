"""Generate FLOP seal favicon: cream paper, ink octagon, blue starburst core."""
from PIL import Image, ImageDraw
import math

S = 256
img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
d = ImageDraw.Draw(img)

PAPER = (242, 238, 227, 255)
INK = (26, 24, 18, 255)
BLUE = (10, 111, 174, 255)

def octagon(cx, cy, r, rot=math.pi / 8):
    return [(cx + r * math.cos(rot + i * math.pi / 4), cy + r * math.sin(rot + i * math.pi / 4)) for i in range(8)]

d.rectangle([0, 0, S, S], fill=PAPER)
d.polygon(octagon(128, 128, 108), outline=INK, width=10)
d.polygon(octagon(128, 128, 86), outline=INK, width=6)
for i in range(8):
    a = i * math.pi / 4 + math.pi / 8
    x2 = 128 + math.cos(a) * 56
    y2 = 128 + math.sin(a) * 56
    d.line([128, 128, x2, y2], fill=BLUE, width=10)
d.ellipse([110, 110, 146, 146], fill=BLUE)

img.save("public/icon.png")
img.save("public/favicon.ico", format="ICO", sizes=[(16, 16), (32, 32), (48, 48)])
print("favicon written")
