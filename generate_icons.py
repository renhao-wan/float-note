#!/usr/bin/env python3
"""
Generate all icon sizes for FloatNote from the SVG logo.
"""
import os
import cairosvg
from PIL import Image
import io

# Base paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SVG_PATH = os.path.join(BASE_DIR, "public", "logo.svg")

# Output directories
TAURI_ICONS_DIR = os.path.join(BASE_DIR, "src-tauri", "icons")
DOCS_DIR = os.path.join(BASE_DIR, "docs")
PUBLIC_DIR = os.path.join(BASE_DIR, "public")
LANDING_DIR = os.path.join(BASE_DIR, "landing", "public")

# Icon sizes needed
ICON_SIZES = {
    # Tauri icons
    "32x32.png": (32, 32),
    "128x128.png": (128, 128),
    "128x128@2x.png": (256, 256),
    "icon.png": (512, 512),
    # macOS iconset sizes
    "icon_16x16.png": (16, 16),
    "icon_16x16@2x.png": (32, 32),
    "icon_32x32.png": (32, 32),
    "icon_32x32@2x.png": (64, 64),
    "icon_48x48.png": (48, 48),
    "icon_128x128.png": (128, 128),
    "icon_128x128@2x.png": (256, 256),
    "icon_256x256.png": (256, 256),
    "icon_256x256@2x.png": (512, 512),
    "icon_512x512.png": (512, 512),
    "icon_512x512@2x.png": (1024, 1024),
}

# Docs icons
DOCS_ICONS = {
    "favicon-32x32.png": (32, 32),
    "icon-128.png": (128, 128),
    "icon.png": (512, 512),
}


def svg_to_png(svg_path, output_path, width, height):
    """Convert SVG to PNG with specified dimensions."""
    png_data = cairosvg.svg2png(
        url=svg_path,
        output_width=width,
        output_height=height
    )

    # Ensure output directory exists
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    with open(output_path, 'wb') as f:
        f.write(png_data)

    return output_path


def create_ico(png_paths, ico_path):
    """Create ICO file from multiple PNG files."""
    images = []
    for png_path in png_paths:
        if os.path.exists(png_path):
            img = Image.open(png_path)
            images.append(img)

    if images:
        # Save as ICO with multiple sizes
        images[0].save(
            ico_path,
            format='ICO',
            sizes=[(img.width, img.height) for img in images],
            append_images=images[1:]
        )
        return ico_path
    return None


def create_icns(png_dir, icns_path):
    """Create ICNS file for macOS (simplified version - creates from largest PNG)."""
    # For a proper ICNS, we'd need to use iconutil on macOS
    # For now, we'll create a placeholder that Tauri can use
    largest_png = os.path.join(png_dir, "icon_512x512@2x.png")
    if os.path.exists(largest_png):
        # ICNS creation is complex, we'll note this needs to be done on macOS
        print(f"Note: ICNS file needs to be created on macOS using iconutil")
        print(f"  Run: iconutil -c icns {png_dir} -o {icns_path}")
        return None
    return None


def generate_favicon_svg():
    """Generate a simplified SVG for favicon use."""
    favicon_svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#3b82f6"/>
      <stop offset="100%" stop-color="#8b5cf6"/>
    </linearGradient>
  </defs>
  <rect x="4" y="4" width="24" height="20" rx="4" fill="url(#g)"/>
  <rect x="4" y="4" width="24" height="5" rx="4" fill="white" opacity="0.2"/>
  <circle cx="8" cy="6.5" r="1.5" fill="#ff5f57"/>
  <circle cx="12" cy="6.5" r="1.5" fill="#ffbd2e"/>
  <circle cx="16" cy="6.5" r="1.5" fill="#28ca42"/>
  <rect x="8" y="13" width="12" height="2" rx="1" fill="white" opacity="0.9"/>
  <rect x="8" y="17" width="16" height="1.5" rx="0.75" fill="white" opacity="0.6"/>
  <rect x="8" y="20" width="10" height="1.5" rx="0.75" fill="white" opacity="0.4"/>
</svg>'''
    return favicon_svg


def main():
    print("Generating FloatNote icons...")

    # Check if SVG exists
    if not os.path.exists(SVG_PATH):
        print(f"Error: SVG file not found at {SVG_PATH}")
        return

    # Create directories
    os.makedirs(TAURI_ICONS_DIR, exist_ok=True)
    os.makedirs(os.path.join(TAURI_ICONS_DIR, "icon.iconset"), exist_ok=True)
    os.makedirs(DOCS_DIR, exist_ok=True)
    os.makedirs(LANDING_DIR, exist_ok=True)

    # Generate Tauri icons
    print("\n1. Generating Tauri icons...")
    for filename, (width, height) in ICON_SIZES.items():
        if "icon_" in filename:
            # macOS iconset
            output_path = os.path.join(TAURI_ICONS_DIR, "icon.iconset", filename)
        else:
            # Main Tauri icons
            output_path = os.path.join(TAURI_ICONS_DIR, filename)

        svg_to_png(SVG_PATH, output_path, width, height)
        print(f"   Created: {filename} ({width}x{height})")

    # Generate docs icons
    print("\n2. Generating docs icons...")
    for filename, (width, height) in DOCS_ICONS.items():
        output_path = os.path.join(DOCS_DIR, filename)
        svg_to_png(SVG_PATH, output_path, width, height)
        print(f"   Created: {filename} ({width}x{height})")

    # Generate landing page logo
    print("\n3. Generating landing page logo...")
    svg_to_png(SVG_PATH, os.path.join(LANDING_DIR, "logo.png"), 512, 512)
    print("   Created: logo.png (512x512)")

    # Copy SVG to landing
    import shutil
    shutil.copy2(SVG_PATH, os.path.join(LANDING_DIR, "logo.svg"))
    print("   Created: logo.svg")

    # Generate favicon SVG (simplified)
    print("\n4. Generating favicon SVG...")
    favicon_svg = generate_favicon_svg()
    favicon_path = os.path.join(PUBLIC_DIR, "favicon.svg")
    with open(favicon_path, 'w') as f:
        f.write(favicon_svg)
    print("   Created: favicon.svg")

    # Generate ICO file
    print("\n5. Generating ICO file...")
    ico_sizes = [
        os.path.join(TAURI_ICONS_DIR, "32x32.png"),
        os.path.join(TAURI_ICONS_DIR, "128x128.png"),
        os.path.join(TAURI_ICONS_DIR, "128x128@2x.png"),
    ]
    ico_path = os.path.join(TAURI_ICONS_DIR, "icon.ico")
    create_ico(ico_sizes, ico_path)
    print("   Created: icon.ico")

    # Note about ICNS
    print("\n6. ICNS file generation:")
    print("   For macOS ICNS, run on macOS:")
    print(f"   iconutil -c icns {os.path.join(TAURI_ICONS_DIR, 'icon.iconset')} -o {os.path.join(TAURI_ICONS_DIR, 'icon.icns')}")

    print("\n✓ Icon generation complete!")
    print("\nGenerated files:")
    print(f"  - Tauri icons: {TAURI_ICONS_DIR}")
    print(f"  - Docs icons: {DOCS_DIR}")
    print(f"  - Public favicon: {PUBLIC_DIR}")
    print(f"  - Landing logo: {LANDING_DIR}")


if __name__ == "__main__":
    main()
