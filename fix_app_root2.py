import re

with open('src/App.tsx', 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

old_div = '<div className="min-h-screen bg-[var(--bg-panel)] text-[var(--text-main)] flex flex-col font-sans selection:bg-[var(--accent-border)] selection:text-[var(--text-main)]">'
new_div = '''<div 
      className="min-h-screen flex flex-col selection:bg-[var(--accent-border)] selection:text-[var(--text-main)] transition-colors duration-300"
      style={{
        backgroundColor: "var(--bg-main)",
        color: "var(--text-main)",
        backgroundImage: "var(--bg-image)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed"
      }}
    >'''

content = content.replace(old_div, new_div)

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
