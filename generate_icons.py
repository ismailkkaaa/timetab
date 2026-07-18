"""
generate_icons.py
Generates icon-192.png, icon-512.png, and icon-maskable-512.png
for TimeTab PWA using only Python stdlib.

The TT logo:
  - Background: #0C0C0D (near black)
  - Left "T": #DDDDDD (light grey) — large, top-left area
  - Right "T": #185DEA (blue) — smaller, overlapping bottom-right

Produced as flat, clean geometric shapes matching the SVG icon design.
"""

import struct, zlib

def make_png(width: int, height: int, pixels) -> bytes:
    """pixels: list of (R,G,B,A) tuples in row-major order"""
    def chunk(name: bytes, data: bytes) -> bytes:
        c = struct.pack('>I', len(data)) + name + data
        c += struct.pack('>I', zlib.crc32(name + data) & 0xFFFFFFFF)
        return c

    # IHDR
    ihdr = struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0)  # 8-bit RGB
    # Build raw image data (RGB — no alpha to keep it simple for PNG)
    raw = b''
    for row in range(height):
        raw += b'\x00'  # filter type: none
        for col in range(width):
            r, g, b, a = pixels[row * width + col]
            raw += bytes([r, g, b])
    compressed = zlib.compress(raw, 9)

    png = b'\x89PNG\r\n\x1a\n'
    png += chunk(b'IHDR', ihdr)
    png += chunk(b'IDAT', compressed)
    png += chunk(b'IEND', b'')
    return png


def make_icon(size: int, maskable: bool = False) -> bytes:
    """
    Draws a TT logo at the given size.
    maskable: adds extra safe-zone padding (20% each side) for maskable icons
    """
    BG   = (12, 12, 13, 255)    # #0C0C0D
    LGREY = (221, 221, 221, 255) # #DDDDDD
    BLUE  = (24, 93, 234, 255)   # #185DEA

    pixels = [BG] * (size * size)

    def fill_rect(x, y, w, h, color):
        for row in range(max(0, y), min(size, y + h)):
            for col in range(max(0, x), min(size, x + w)):
                pixels[row * size + col] = color

    # For maskable icons, push everything into the central 60%
    pad = int(size * 0.15) if maskable else 0
    draw_w = size - pad * 2
    draw_h = size - pad * 2

    # Scale factors based on the SVG viewbox (210x210)
    s = draw_w / 210.0

    def scaled(v):
        return int(v * s)

    ox = pad  # x offset
    oy = pad  # y offset

    # --- Left "T" (grey) at SVG coords: x=24,y=39, w=91,h=119 ---
    # Top bar of grey T: x=24,y=39, w=91,h=32
    fill_rect(ox + scaled(24), oy + scaled(39), scaled(91), scaled(32), LGREY)
    # Stem of grey T: x=53,y=71, w=32,h=87
    fill_rect(ox + scaled(53), oy + scaled(71), scaled(32), scaled(87), LGREY)

    # --- Right "T" (blue) at SVG coords: x=96,y=83, w=88,h=97 ---
    # Top bar of blue T: x=96,y=83, w=88,h=31
    fill_rect(ox + scaled(96), oy + scaled(83), scaled(88), scaled(31), BLUE)
    # Stem of blue T: x=125,y=114, w=29,h=66
    fill_rect(ox + scaled(125), oy + scaled(114), scaled(29), scaled(66), BLUE)

    return make_png(size, size, pixels)


# Generate icons
for size, suffix, maskable in [
    (192, 'icon-192', False),
    (512, 'icon-512', False),
    (512, 'icon-maskable-512', True),
]:
    path = f'assets/icons/{suffix}.png'
    data = make_icon(size, maskable)
    with open(path, 'wb') as f:
        f.write(data)
    print(f'Generated {path} ({len(data)} bytes)')

print('Done.')
