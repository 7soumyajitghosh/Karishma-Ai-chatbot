import re

with open("server.ts", "r") as f:
    content = f.read()

# Make sure it awaits and catches errors properly
content = content.replace("""  const info = await transporter.sendMail({""", """  try {
    const info = await transporter.sendMail({""")

content = content.replace("""        </div>`
  });
};""", """        </div>`
    });
  } catch (error: any) {
    throw new Error(`SMTP Error: ${error.message}`);
  }
};""")

with open("server.ts", "w") as f:
    f.write(content)
