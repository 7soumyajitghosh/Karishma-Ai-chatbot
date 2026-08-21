with open("src/index.css", "r") as f:
    content = f.read()

# Replace the previous Chat Styles
import re
content = re.sub(r'/\* Chat Styles \*/.*', '', content, flags=re.DOTALL)

new_styles = """/* Chat Styles */
.style-compact .p-3.5 {
    padding: 0.5rem 0.75rem !important;
}
.style-compact .space-y-4 > * + * {
    margin-top: 0.5rem !important;
}
.style-compact .text-sm {
    font-size: 0.8125rem !important;
}

.style-modern .rounded-2xl {
    border-radius: 0.5rem !important;
}
.style-modern .rounded-tl-none {
    border-radius: 0.5rem !important;
}
.style-modern .rounded-tr-none {
    border-radius: 0.5rem !important;
}

.style-minimal .bg-\\[var\\(--border-main\\)\\] {
    background-color: transparent !important;
    border: 1px solid var(--border-main) !important;
}
.style-minimal .shadow-sm {
    box-shadow: none !important;
}
"""

with open("src/index.css", "a") as f:
    f.write(new_styles)
