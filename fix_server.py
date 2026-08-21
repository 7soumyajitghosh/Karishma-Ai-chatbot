import re

with open("server.ts", "r") as f:
    content = f.read()

# I will find the end of sendBrevoEmail and remove the leftovers
start_idx = content.find("};\n    const req = https.request")
end_idx = content.find("  });\n};\n\n// Auth endpoints") + len("  });\n};\n")

if start_idx != -1 and end_idx != -1:
    content = content[:start_idx + 2] + "\n" + content[end_idx:]
    with open("server.ts", "w") as f:
        f.write(content)
    print("Fixed leftovers")
else:
    print("Could not find leftovers")
