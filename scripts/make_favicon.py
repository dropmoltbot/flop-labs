"""FLOP terminal favicon: dark plate, cyan chip corners, sig core."""
from PIL import Image, ImageDraw

S = 256
img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
d = ImageDraw.Draw(img)

BG = (4, 7, 14, 255)
SIG = (0, 180, 216, 255)
HOT = (72, 202, 255, 255)

d.rectangle([0, 0, S, S], fill=BG)
d.rectangle([8, 8, S - 8, S - 8], outline=SIG, width=12)
px = 32
for gx, gy, col in [(1, 1, HOT), (6, 1, SIG), (3, 3, HOT), (1, 6, SIG), (6, 6, HOT)]:
    d.rectangle([gx * px + 16, gy * px + 16, gx * px + 16 + px - 8, gy * px + 16 + px - 8], fill=col)

img.save("public/icon.png")
img.save("public/favicon.ico", format="ICO", sizes=[(16, 16), (32, 32), (48, 48)])
print("crt favicon written")
