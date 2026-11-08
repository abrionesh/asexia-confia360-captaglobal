"""Exact 1200×630 share card for Radar AsExIA. Type is drawn, not generated."""
from PIL import Image, ImageDraw, ImageFilter, ImageFont
import math

S = 2
W, H = 1200 * S, 630 * S

def hex_rgba(h, a=255):
    h = h.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), a)

NAVY = hex_rgba("#0A1424")
LIME = hex_rgba("#A3E635")
INK = hex_rgba("#F4F7F2")
CARD = hex_rgba("#12161C")

def mix(a, b, t, alpha=255):
    return tuple(int(a[i] * (1 - t) + b[i] * t) for i in range(3)) + (alpha,)

font_reg = "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"
font_bold = "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"

img = Image.new("RGBA", (W, H), NAVY)
px = img.load()

# Soft vignette: darken toward the corners, keep the center at true navy.
cx, cy = W / 2, H / 2
max_d = math.hypot(cx, cy)
for y in range(H):
    for x in range(0, W, 2):
        d = math.hypot(x - cx, y - cy) / max_d
        shade = max(0.0, (d - 0.45) / 0.55)
        shade = shade * shade * 0.55
        if shade <= 0:
            continue
        r, g, b, _ = px[x, y]
        nr, ng, nb = int(r * (1 - shade)), int(g * (1 - shade)), int(b * (1 - shade))
        px[x, y] = (nr, ng, nb, 255)
        if x + 1 < W:
            px[x + 1, y] = (nr, ng, nb, 255)

draw = ImageDraw.Draw(img)

# Faint plan grid — instrument, not a map with labels.
grid = mix(NAVY, INK, 0.045)
step = 48 * S
for x in range(step, W, step):
    draw.line([(x, 0), (x, H)], fill=grid, width=1)
for y in range(step, H, step):
    draw.line([(0, y), (W, y)], fill=grid, width=1)

# Radar lives on the right. Center stays clear of the type column.
rx, ry = int(940 * S), int(318 * S)
rings = [64, 112, 162, 214]
ring_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
rd = ImageDraw.Draw(ring_layer)
for i, r in enumerate(rings):
    r *= S
    alpha = 210 if i == len(rings) - 1 else 150
    rd.ellipse([rx - r, ry - r, rx + r, ry + r], outline=(*LIME[:3], alpha), width=max(2, 2 * S))

# Tick marks on the outer ring.
outer = rings[-1] * S
for deg in range(0, 360, 15):
    a = math.radians(deg - 90)
    inner = outer - (10 * S if deg % 45 == 0 else 6 * S)
    x1, y1 = rx + math.cos(a) * inner, ry + math.sin(a) * inner
    x2, y2 = rx + math.cos(a) * outer, ry + math.sin(a) * outer
    rd.line([(x1, y1), (x2, y2)], fill=(*LIME[:3], 180), width=max(2, S))

# Sweep: a quiet wedge plus a bright leading edge. Upper-right, away from type.
sweep = Image.new("RGBA", (W, H), (0, 0, 0, 0))
sd = ImageDraw.Draw(sweep)
# PIL pieslice: 0° is 3 o'clock, angles grow clockwise.
sd.pieslice([rx - outer, ry - outer, rx + outer, ry + outer], start=-78, end=-18, fill=(*LIME[:3], 48))
edge = math.radians(-18)
sd.line(
    [(rx, ry), (rx + math.cos(edge) * outer, ry + math.sin(edge) * outer)],
    fill=(*LIME[:3], 230),
    width=3 * S,
)
img = Image.alpha_composite(img, sweep)
img = Image.alpha_composite(img, ring_layer)
draw = ImageDraw.Draw(img)

# Blips — positions in degrees, radii as a fraction of the outer ring.
for deg, frac, rad in ((-40, 0.52, 5), (24, 0.78, 4), (110, 0.62, 3.5), (200, 0.4, 3), (150, 0.9, 4)):
    a = math.radians(deg - 90)
    dist = outer * frac
    bx, by = rx + math.cos(a) * dist, ry + math.sin(a) * dist
    rad *= S
    draw.ellipse([bx - rad, by - rad, bx + rad, by + rad], fill=LIME)

# Hub
hub = 5 * S
draw.ellipse([rx - hub, ry - hub, rx + hub, ry + hub], fill=INK)
arm = 14 * S
draw.line([(rx - arm, ry), (rx + arm, ry)], fill=(*INK[:3], 180), width=S)
draw.line([(rx, ry - arm), (rx, ry + arm)], fill=(*INK[:3], 180), width=S)

def rounded_rect(target, box, radius, fill, outline=None, width=1):
    d = ImageDraw.Draw(target)
    d.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)

# One paper-dark readout, unlabeled, sitting under the sweep.
panel = Image.new("RGBA", (W, H), (0, 0, 0, 0))
px0, py0 = int(748 * S), int(430 * S)
pw, ph = int(196 * S), int(112 * S)
rounded_rect(panel, [px0, py0, px0 + pw, py0 + ph], 14 * S, CARD, outline=mix(NAVY, INK, 0.16), width=S)
pd = ImageDraw.Draw(panel)
bars = [0.42, 0.7, 0.55, 0.88, 0.33]
gap = 8 * S
bh = 8 * S
inner_w = pw - 28 * S
top = py0 + 18 * S
for i, frac in enumerate(bars):
    y = top + i * (bh + gap)
    color = LIME if i % 2 == 0 else mix(NAVY, INK, 0.72)
    pd.rounded_rectangle([px0 + 14 * S, y, px0 + 14 * S + inner_w * frac, y + bh], radius=bh // 2, fill=color)
img = Image.alpha_composite(img, panel)
draw = ImageDraw.Draw(img)

# Type column. Exact strings.
eyebrow_font = ImageFont.truetype(font_reg, 28 * S)
title_font = ImageFont.truetype(font_bold, 128 * S)
sub_font = ImageFont.truetype(font_reg, 26 * S)

def tracked_width(text, font, tracking):
    return sum(font.getlength(ch) for ch in text) + tracking * (len(text) - 1)

def draw_tracked(target, text, font, x, y, fill, tracking):
    d = ImageDraw.Draw(target)
    cursor = x
    for ch in text:
        d.text((cursor, y), ch, font=font, fill=fill)
        cursor += font.getlength(ch) + tracking

left = 84 * S
eyebrow = "Radar"
title = "AsExIA"
sub = "Comercio local · Getafe"
track = 6 * S

ew = tracked_width(eyebrow, eyebrow_font, track)
tw = title_font.getlength(title)
sw = sub_font.getlength(sub)
# Keep the lockup inside the left half, clear of the radar (outer ring left edge).
radar_left = rx - outer
block_w = max(ew, tw, sw)
if left + block_w > radar_left - 36 * S:
    raise SystemExit(f"lockup collides with radar: {left + block_w} >= {radar_left}")

# Vertically center the three lines as one block.
eb = eyebrow_font.getbbox(eyebrow)
tb = title_font.getbbox(title)
sb = sub_font.getbbox(sub)
gap1, gap2, rule_h, gap3 = 18 * S, 16 * S, 3 * S, 18 * S
eh, th, sh = eb[3] - eb[1], tb[3] - tb[1], sb[3] - sb[1]
block_h = eh + gap1 + th + gap2 + rule_h + gap3 + sh
top_y = (H - block_h) / 2

# Eyebrow baseline compensation: draw at top - bbox.top so the ink starts at top_y.
ey = top_y - eb[1]
draw_tracked(img, eyebrow, eyebrow_font, left, ey, mix(NAVY, INK, 0.78), track)

ty = top_y + eh + gap1 - tb[1]
draw = ImageDraw.Draw(img)
draw.text((left, ty), title, font=title_font, fill=INK)

rule_y = top_y + eh + gap1 + th + gap2
draw.rectangle([left, rule_y, left + 72 * S, rule_y + rule_h], fill=LIME)

sy = rule_y + rule_h + gap3 - sb[1]
draw.text((left, sy), sub, font=sub_font, fill=LIME)

# Edge crop safety: nothing important within 48px of the frame.
margin = 48 * S
if left < margin or top_y < margin or top_y + block_h > H - margin:
    raise SystemExit(f"lockup margin fail top={top_y} h={block_h}")
if rx + outer > W - 36 * S or ry + outer > H - 28 * S or ry - outer < 28 * S:
    raise SystemExit("radar clips the frame")

out = img.convert("RGB").resize((1200, 630), Image.Resampling.LANCZOS)
out.save("/workspace/.grok/og-preview.png", "PNG")
print("preview", out.size, "lockup_w", block_w / S, "top", top_y / S)
