import re

with open("src/App.tsx", "r") as f:
    content = f.read()

content = content.replace(
    'Retention: {retentionPolicy === "local" ? "Device Memory" : retentionPolicy === "zero" ? "Stateless Mode" : "Session Cache"}',
    'Retention: {retentionPolicy === "local" ? "E2EE" : "Sessional Memories"}'
)

content = content.replace(
    'Your current storage policy ({retentionPolicy === "zero" ? "Zero-Knowledge" : "Session-Only"}) prevents saving chat history.',
    'Your current storage policy (Sessional Memories) prevents saving chat history.'
)

content = content.replace(
    '{retentionPolicy === "session" || retentionPolicy === "zero" ? (',
    '{retentionPolicy === "session" ? ('
)

with open("src/App.tsx", "w") as f:
    f.write(content)
print("done")
