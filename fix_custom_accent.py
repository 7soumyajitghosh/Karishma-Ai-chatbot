import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

content = content.replace('customBgUrl: "",\n      font: "default",', 'customBgUrl: "",\n      customAccent: "#D96B43",\n      font: "default",')

# I also need to update the logic for custom accent in the useEffect
old_accent_logic = """    let ac = accentColors[themeConfig.accentColor] || accentColors.orange;
    if (isDark || isAmoled) {
      ac.bg = ac.main + '20';
      ac.border = ac.main + '40';
    }"""

new_accent_logic = """    let ac = accentColors[themeConfig.accentColor] || accentColors.orange;
    if (themeConfig.accentColor === 'custom') {
      ac = {
        main: themeConfig.customAccent,
        hover: themeConfig.customAccent,
        bg: themeConfig.customAccent + '20',
        border: themeConfig.customAccent + '40'
      };
    }
    if (isDark || isAmoled) {
      ac.bg = ac.main + '20';
      ac.border = ac.main + '40';
    }"""

content = content.replace(old_accent_logic, new_accent_logic)

with open('src/App.tsx', 'w') as f:
    f.write(content)
