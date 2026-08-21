import re

with open("server.ts", "r") as f:
    content = f.read()

content = content.replace("const https = require('https');", "import * as https from 'https';")
content = content.replace("import * as nodemailer from \"nodemailer\";", "import * as nodemailer from \"nodemailer\";\nimport * as https from \"https\";")
# Also remove the require from the function body
content = content.replace("const https = require('https');\n", "")

with open("server.ts", "w") as f:
    f.write(content)
