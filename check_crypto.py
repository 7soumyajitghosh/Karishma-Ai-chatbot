import re

with open("src/App.tsx", "r") as f:
    content = f.read()

# Let's find getCiphertext and getDecryptedtext
match1 = re.search(r'const getCiphertext =.*?\}', content, re.DOTALL)
if match1:
    print("getCiphertext found")

match2 = re.search(r'const getDecryptedtext =.*?\}', content, re.DOTALL)
if match2:
    print("getDecryptedtext found")
