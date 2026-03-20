"""Generate 192x192 and 512x512 PNG icons for Catan Dice PWA."""
import struct, zlib, math, os

def png(width, height, pixels):
    def chunk(tag, data):
        c = tag + data
        return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)
    raw = b''.join(b'\x00' + bytes(row) for row in pixels)
    return (b'\x89PNG\r\n\x1a\n'
            + chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0))
            + chunk(b'IDAT', zlib.compress(raw))
            + chunk(b'IEND', b''))

def make_icon(size):
    BG   = (11, 13, 23)      # #0B0D17
    DIE  = (201, 209, 217)   # #C9D1D9
    PIP  = (11, 13, 23)      # #0B0D17
    BORDER = (255, 45, 170)  # #FF2DAA

    pixels = [[list(BG) * size for _ in range(3)] for _ in range(size)]
    # flat list of [r,g,b, r,g,b, ...] per row
    pixels = [[*BG] * size for _ in range(size)]   # start flat

    def dist(ax, ay, bx, by): return math.sqrt((ax-bx)**2 + (ay-by)**2)

    margin  = size * 0.1
    radius  = size * 0.18
    pip_r   = size * 0.075
    border  = size * 0.03

    # Die pips positions (showing face-5)
    cx, cy = size / 2, size / 2
    spread = size * 0.26
    pip_centers = [
        (cx - spread, cy - spread),
        (cx + spread, cy - spread),
        (cx,          cy         ),
        (cx - spread, cy + spread),
        (cx + spread, cy + spread),
    ]

    result = []
    for y in range(size):
        row = []
        for x in range(size):
            # Rounded rect for die
            # nearest corner distance
            inner_x = max(margin + radius, min(size - margin - radius, x))
            inner_y = max(margin + radius, min(size - margin - radius, y))
            corner_dist = dist(x, y, inner_x, inner_y)

            in_die    = corner_dist <= radius
            in_border = corner_dist <= radius + border and not in_die

            in_pip = any(dist(x, y, px, py) <= pip_r for px, py in pip_centers)

            if in_border:
                row += list(BORDER)
            elif in_die and in_pip:
                row += list(PIP)
            elif in_die:
                row += list(DIE)
            else:
                row += list(BG)
        result.append(row)

    return png(size, size, result)

os.makedirs('icons', exist_ok=True)
for size in (192, 512):
    data = make_icon(size)
    path = f'icons/icon-{size}.png'
    with open(path, 'wb') as f:
        f.write(data)
    print(f'Created {path} ({len(data):,} bytes)')

print('Done.')
