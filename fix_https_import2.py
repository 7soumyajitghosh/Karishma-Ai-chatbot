import re

with open("server.ts", "r") as f:
    content = f.read()

content = content.replace("    import * as https from 'https';\n", "")

with open("server.ts", "w") as f:
    f.write(content)
