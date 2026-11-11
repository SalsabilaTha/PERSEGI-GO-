"""Membuat ikon PNG aplikasi (PWA) dengan Pillow.

Jalankan: python scripts/make_icons.py
Hasil: frontend/assets/icons/*.png
"""
from pathlib import Path

from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent.parent / "frontend" / "assets" / "icons"
PURPLE = (98, 88, 232, 255)
PURPLE_DARK = (73, 64, 200, 255)
YELLOW = (255, 200, 92, 255)
WHITE = (255, 255, 255, 255)


def draw_icon(size: int, maskable: bool = False, rounded: bool = True) -> Image.Image:
    scale = 4  # gambar besar lalu diperkecil agar tepinya halus
    big = size * scale
    img = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    if maskable or not rounded:
        d.rectangle([0, 0, big, big], fill=PURPLE)
    else:
        d.rounded_rectangle([0, 0, big - 1, big - 1], radius=int(big * 0.22), fill=PURPLE)

    # Area aman ikon maskable = 80% tengah
    safe = 0.62 if maskable else 0.74
    grid = big * safe
    origin = (big - grid) / 2
    gap = grid * 0.07
    cell = (grid - 2 * gap) / 3
    radius = cell * 0.22
    for r in range(3):
        for c in range(3):
            x = origin + c * (cell + gap)
            y = origin + r * (cell + gap)
            color = YELLOW if (r, c) == (0, 2) else WHITE
            d.rounded_rectangle([x, y, x + cell, y + cell], radius=radius, fill=color)

    # Bayangan tipis di bawah
    d.rounded_rectangle([origin, origin + grid + gap * 0.6, origin + grid, origin + grid + gap * 1.1],
                        radius=gap * 0.25, fill=PURPLE_DARK)
    return img.resize((size, size), Image.LANCZOS)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    draw_icon(192).save(OUT / "icon-192.png")
    draw_icon(512).save(OUT / "icon-512.png")
    draw_icon(512, maskable=True).save(OUT / "icon-maskable-512.png")
    # iOS menambahkan sudut membulat sendiri, jadi apple-touch-icon dibuat kotak penuh
    draw_icon(180, rounded=False).convert("RGB").save(OUT / "apple-touch-icon.png")
    print(f"Ikon dibuat di {OUT}")


if __name__ == "__main__":
    main()
