import re

with open("src/App.tsx", "r") as f:
    content = f.read()

# Let's count how many times "accountView === \"forgot\"" appears
print("forgot:", content.count('accountView === "forgot"'))
print("reset:", content.count('accountView === "reset"'))
