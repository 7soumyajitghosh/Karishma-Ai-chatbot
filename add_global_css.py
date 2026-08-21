import os
with open("src/index.css", "a") as f:
    f.write("""

/* Theme Effects */
.effect-glass .bg-\\[var\\(--bg-panel\\)\\] {
    background-color: color-mix(in srgb, var(--bg-panel) 80%, transparent) !important;
    backdrop-filter: blur(12px) !important;
    -webkit-backdrop-filter: blur(12px) !important;
}

.effect-shadow .rounded-3xl, .effect-shadow .rounded-2xl {
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1) !important;
}
.effect-shadow .bg-\\[var\\(--accent-bg\\)\\] {
    box-shadow: 0 4px 12px var(--accent-bg) !important;
}

.effect-none * {
    transition: none !important;
    animation: none !important;
}

.effect-dynamic {
    backdrop-filter: blur(20px) saturate(150%) !important;
}

/* Chat Styles */
.style-compact .p-4 {
    padding: 0.5rem !important;
}
.style-compact .space-y-4 > * + * {
    margin-top: 0.5rem !important;
}

.style-modern .rounded-2xl {
    border-radius: 0.5rem !important;
}

.style-minimal .border-\\[var\\(--border-main\\)\\] {
    border-color: transparent !important;
}
""")
