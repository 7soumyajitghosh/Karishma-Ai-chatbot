import re
with open('src/App.tsx', 'r') as f:
    content = f.read()

old_header = """              <div className="bg-[var(--bg-panel)] border-b border-[var(--border-main)] px-5 py-4 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="relative">"""

new_header = """              <div className="bg-[var(--bg-panel)] border-b border-[var(--border-main)] px-5 py-4 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowThemePanel(true)}
                    className="p-2 -ml-2 rounded-full text-[var(--text-muted)] hover:bg-[var(--bg-hover)] transition-colors"
                  >
                    <Palette className="w-5 h-5" />
                  </button>
                  <div className="relative">"""

content = content.replace(old_header, new_header)

with open('src/App.tsx', 'w') as f:
    f.write(content)
