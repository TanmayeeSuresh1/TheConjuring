"""
Generate minimal PNG icons for the SafeShare AI extension.
Run once: python generate_icons.py
Requires Pillow: pip install Pillow
"""
import os
try:
    from PIL import Image, ImageDraw
except ImportError:
    print("Pillow not found. Run: pip install Pillow")
    raise

os.makedirs("icons", exist_ok=True)

def make_icon(size):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    # Dark background circle
    draw.ellipse([0, 0, size-1, size-1], fill=(10, 22, 40, 255))
    # Cyan border
    draw.ellipse([1, 1, size-2, size-2], outline=(0, 245, 255, 200), width=max(1, size//16))
    # Simple shield shape (polygon)
    m = size / 24  # scale factor
    shield = [
        (12*m, 2*m), (3*m, 7*m), (3*m, 12*m),
        (12*m, 21.35*m), (21*m, 12*m), (21*m, 7*m)
    ]
    draw.polygon(shield, fill=(0, 245, 255, 180))
    # Checkmark
    lw = max(1, size // 16)
    draw.line([(9*m, 12*m), (11*m, 14*m), (15*m, 10*m)], fill=(255, 255, 255, 230), width=lw)
    img.save(f"icons/icon{size}.png")
    print(f"Generated icons/icon{size}.png")

for s in [16, 48, 128]:
    make_icon(s)

print("Icons generated successfully.")
