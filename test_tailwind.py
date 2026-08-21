import re
text = 'className="bg-[#FCFAF7] text-[#2C2A29]"'
text = text.replace('#FCFAF7', 'var(--bg-main)').replace('#2C2A29', 'var(--text-main)')
print(text)
