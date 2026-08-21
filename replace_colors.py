import re

with open("src/App.tsx", "r") as f:
    content = f.read()

hex_map = {
    "#FCFAF7": "var(--bg-main)",
    "#FAF8F5": "var(--bg-panel)",
    "#EBE6DD": "var(--border-main)",
    "#2C2A29": "var(--text-main)",
    "#5C5753": "var(--text-muted)",
    "#8C857E": "var(--text-light)",
    "#D96B43": "var(--accent-main)",
    "#C85C34": "var(--accent-hover)",
    "#FAF0E6": "var(--accent-bg)",
    "#F3D9C9": "var(--accent-border)",
    "#E2DCD3": "var(--bg-hover)",
    "#DFD9D0": "var(--border-dark)",
    
    # Let's also do a few standard colors
    "bg-white": "bg-[var(--bg-panel)]", # wait, white is panel in light mode
    "text-white": "text-[var(--text-inverted,white)]"
}

for hx, var in hex_map.items():
    if hx.startswith("#"):
        # replace arbitrary class forms
        content = content.replace(f"[{hx}]", f"[{var}]")
        # replace inside style objects
        content = content.replace(f'"{hx}"', f'"{var}"')
        content = content.replace(f"'{hx}'", f"'{var}'")

# Specific replacements for white
content = content.replace('bg-white', 'bg-[var(--bg-panel)]')
content = content.replace('text-white', 'text-[var(--text-inverted,white)]')
# Note: we should define --text-inverted for buttons where the background is accent-main

with open("src/App.tsx", "w") as f:
    f.write(content)
