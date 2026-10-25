"""Draw the kitchen app's Cape house icons. Requires Python Pillow."""
from pathlib import Path
from PIL import Image, ImageDraw

output = Path(__file__).resolve().parents[1] / "public"
for size, name in [(180, "apple-touch-icon.png"), (192, "icon-192.png"), (512, "icon-512.png")]:
    image = Image.new("RGB", (1024, 1024), "#f7f2e7")
    draw = ImageDraw.Draw(image)
    draw.rectangle((670, 210, 740, 440), fill="#a65340")
    draw.polygon([(150, 490), (512, 200), (874, 490)], fill="#203747")
    draw.rectangle((230, 460, 794, 830), fill="#203747")
    draw.rectangle((456, 605, 568, 830), fill="#f7f2e7")
    for x in [300, 634]:
        draw.rectangle((x, 555, x + 90, 660), fill="#f7f2e7")
        draw.line((x + 45, 555, x + 45, 660), fill="#203747", width=10)
        draw.line((x, 607, x + 90, 607), fill="#203747", width=10)
    image.resize((size, size), Image.Resampling.LANCZOS).save(output / name)
