import re

with open("src/App.tsx", "r") as f:
    content = f.read()

target = """                        <div>
                          <div className="flex items-center justify-between mb-1.5">
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
                          </div>
                          <input 
                            name="password" 
                            type="password" 
                            placeholder="••••••••" 
                            className="w-full bg-[#FAF8F5] border border-[#EBE6DD] rounded-xl px-4 py-2.5 text-sm text-[#2C2A29] outline-none focus:border-[#D96B43] transition-colors"
                          />
                        </div>"""

replacement = """                        <div>
                          <label className="block text-[11px] font-bold text-[#8C857E] mb-1.5 uppercase tracking-wider">Password</label>
                          <input 
                            name="password" 
                            type="password" 
                            placeholder="••••••••" 
                            className="w-full bg-[#FAF8F5] border border-[#EBE6DD] rounded-xl px-4 py-2.5 text-sm text-[#2C2A29] outline-none focus:border-[#D96B43] transition-colors"
                          />
                          {accountView === "login" && (
                            <div className="flex justify-end mt-2">
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
                            </div>
                          )}
                        </div>"""

content = content.replace(target, replacement)

with open("src/App.tsx", "w") as f:
    f.write(content)

print("Moved.")
