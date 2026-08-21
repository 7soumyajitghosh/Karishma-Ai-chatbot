import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

# Replace the outer div
old_div = '<div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-main)] flex flex-col font-sans transition-colors duration-300">'
new_div = '''<div 
      className="min-h-screen flex flex-col transition-colors duration-300"
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

# Replace the inner section container to use glassmorphism if needed
# We already handle it via global CSS `.bg-[var(--bg-panel)]`
# Let's ensure the main panel uses bg-panel instead of white

content = content.replace('bg-[var(--bg-panel)] shadow-sm', 'bg-[var(--bg-panel)] shadow-sm') # It's already there

with open('src/App.tsx', 'w') as f:
    f.write(content)
