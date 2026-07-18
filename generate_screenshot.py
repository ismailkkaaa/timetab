"""
generate_screenshot.py
Generates a 390x844 app screenshot PNG for the PWA manifest.
Uses only Python stdlib.
"""
import struct, zlib

def make_png_rgb(width, height, get_pixel):
    def chunk(name, data):
        c = struct.pack('>I', len(data)) + name + data
        c += struct.pack('>I', zlib.crc32(name + data) & 0xFFFFFFFF)
        return c
    ihdr = struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0)
    raw = b''
    for row in range(height):
        raw += b'\x00'
        for col in range(width):
            r, g, b = get_pixel(col, row, width, height)
            raw += bytes([r, g, b])
    png = b'\x89PNG\r\n\x1a\n'
    png += chunk(b'IHDR', ihdr)
    png += chunk(b'IDAT', zlib.compress(raw, 9))
    png += chunk(b'IEND', b'')
    return png

def screenshot_pixel(x, y, w, h):
    BG   = (17, 17, 17)       # #111 dark bg
    SURF = (24, 24, 24)       # surface card
    BLUE = (37, 99, 235)      # #2563EB
    LGREY = (200, 200, 200)   # text colour
    MUTED = (100, 100, 100)   # muted

    # Header bar (~60px)
    if y < 60:
        if 20 <= x < 52 and 16 <= y < 48:  # logo square
            return (37, 99, 235)
        if 60 <= x < 200 and 22 <= y < 42:  # wordmark area
            return LGREY
        return SURF
    # Bottom nav (~64px)
    if y > h - 64:
        bar_y = y - (h - 64)
        if bar_y == 0:
            return BLUE
        if x < w // 3:
            return (30, 30, 30)  # active home
        return SURF

    # Current period card (y: 80-260)
    if 80 <= y < 260 and 16 <= x < w - 16:
        if x < 22:             return BLUE        # left accent bar
        if 30 <= x < 110 and 100 <= y < 120:
            return BLUE        # countdown digits area
        if 30 <= x < 200 and 140 <= y < 160:
            return BLUE        # countdown display
        return SURF

    # Next period card (y: 270-330)
    if 270 <= y < 330 and 16 <= x < w - 16:
        if x < 20:             return (150, 80, 200)   # purple accent
        return (22, 22, 22)

    # Schedule items
    for i in range(4):
        top = 360 + i * 80
        if top <= y < top + 70 and 16 <= x < w - 16:
            if i == 0 and x < 20:  return BLUE  # current item accent
            return (22, 22, 22)

    return BG

data = make_png_rgb(390, 844, screenshot_pixel)
with open('assets/screenshots/home.png', 'wb') as f:
    f.write(data)
print(f'Generated assets/screenshots/home.png ({len(data)} bytes)')
