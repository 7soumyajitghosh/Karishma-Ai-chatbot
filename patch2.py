import re

with open("src/App.tsx", "r") as f:
    content = f.read()

target_regex = r'(\s*<div>\s*<label className="block text-\[11px\] font-bold text-\[\#8C857E\] mb-1\.5 uppercase tracking-wider">Password</label>\s*<input[^>]+name="password"[^>]+/>\s*</div>)'

def replacer(match):
    original = match.group(1)
    return original.replace(
        '<label className="block text-[11px] font-bold text-[#8C857E] mb-1.5 uppercase tracking-wider">Password</label>',
        """<div className="flex items-center justify-between mb-1.5">
                            <label className="block text-[11px] font-bold text-[#8C857E] uppercase tracking-wider">Password</label>
                            {accountView === "login" && (
                              <button 
                                type="button"
                                onClick={() => { 
                                  setAccountView("forgot"); 
                                  setAuthError(""); 
                                  const emailInput = document.querySelector('input[name="email"]') as HTMLInputElement;
                                  if (emailInput) setResetEmail(emailInput.value);
                                }}
                                className="text-[11px] font-bold text-[#D96B43] hover:text-[#C85C34] transition-colors cursor-pointer"
                              >
                                Forgot Password?
                              </button>
                            )}
                          </div>"""
    )

new_content = re.sub(target_regex, replacer, content)

with open("src/App.tsx", "w") as f:
    f.write(new_content)

print("Replaced!")
