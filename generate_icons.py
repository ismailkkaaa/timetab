"""
generate_icons.py — v2
Generates icon-192.png, icon-512.png, icon-maskable-512.png
with RGBA (color_type=6) for proper Android PWA support.
Pure Python stdlib — no external dependencies.
"""
import struct, zlib

def make_png_rgba(width: int, height: int, pixels: list) -> bytes:
    """
    pixels: list of (R, G, B, A) tuples, row-major order.
    Produces a valid RGBA PNG using filter type 0 (none).
    """
    def chunk(name: bytes, data: bytes) -> bytes:
        crc_val = zlib.crc32(name + data) & 0xFFFFFFFF
        return struct.pack('>I', len(data)) + name + data + struct.pack('>I', crc_val)

    # IHDR: width, height, bit_depth=8, color_type=6 (RGBA)
    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)

    # Raw scanlines: filter byte + RGBA bytes
    raw_rows = []
    for row in range(height):
        row_bytes = bytearray()
        row_bytes.append(0)  # filter type: None
        for col in range(width):
            r, g, b, a = pixels[row * width + col]
            row_bytes.extend([r, g, b, a])
        raw_rows.append(bytes(row_bytes))

    raw_data = b''.join(raw_rows)
    compressed = zlib.compress(raw_data, 9)

    png = b'\x89PNG\r\n\x1a\n'
    png += chunk(b'IHDR', ihdr_data)
    png += chunk(b'IDAT', compressed)
    png += chunk(b'IEND', b'')
    return png


def make_icon(size: int, maskable: bool = False) -> bytes:
    """
    Renders the TimeTab TT logo at the given size.
    maskable=True adds a 20% safe-zone padding on all sides.
    """
    # Brand colours
    BG     = (12,  12,  13,  255)   # #0C0C0D
    LGREY  = (221, 221, 221, 255)   # #DDDDDD
    BLUE   = (24,  93,  234, 255)   # #185DEA

    pixels = [BG] * (size * size)

    def fill_rect(x, y, w, h, color):
        for row in range(max(0, y), min(size, y + h)):
            for col in range(max(0, x), min(size, x + w)):
                pixels[row * size + col] = color

    # Maskable icons need 20% safe-zone padding
    pad = int(size * 0.20) if maskable else int(size * 0.05)
    draw_w = size - pad * 2

    # Scale factor: SVG canvas is 210×210
    s = draw_w / 210.0
    ox = pad
    oy = pad

    def sc(v): return int(round(v * s))

    # Grey "T" — SVG rect: x=24 y=39 w=91 h=119
    #   Top bar: x=24 y=39 w=91 h=32
    fill_rect(ox + sc(24), oy + sc(39), sc(91), sc(32), LGREY)
    #   Stem:    x=53 y=71 w=32 h=87   (centered: 24+(91-32)/2 = 53.5)
    fill_rect(ox + sc(53), oy + sc(71), sc(32), sc(87), LGREY)

    # Blue "T" — SVG rect: x=96 y=83 w=88 h=97
    #   Top bar: x=96 y=83 w=88 h=31
    fill_rect(ox + sc(96), oy + sc(83), sc(88), sc(31), BLUE)
    #   Stem:    x=125 y=114 w=29 h=66   (centered: 96+(88-29)/2 = 125.5)
    fill_rect(ox + sc(125), oy + sc(114), sc(29), sc(66), BLUE)

    return make_png_rgba(size, size, pixels)


ICONS = [
    ('assets/icons/icon-192.png',          192, False),
    ('assets/icons/icon-512.png',          512, False),
    ('assets/icons/icon-maskable-512.png', 512, True),
]

for path, size, maskable in ICONS:
    data = make_icon(size, maskable)
    with open(path, 'wb') as f:
        f.write(data)
    print(f'Generated {path}  ({size}x{size}, {len(data):,} bytes)')

print('\nAll icons generated successfully.')
