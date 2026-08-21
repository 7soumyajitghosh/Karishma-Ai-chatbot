import re

with open("src/App.tsx", "r") as f:
    content = f.read()

target = """                        </div>
                      </div>
                    ) : (
                      <form 
                        onSubmit={async (e) => {"""

replacement = """                        </div>
                      </div>
                    ) : (accountView === "login" || accountView === "create") ? (
                      <form 
                        onSubmit={async (e) => {"""

content = content.replace(target, replacement)

target2 = """                        <button 
                          type="submit"
                          disabled={authLoading}
                          className="w-full bg-[#D96B43] hover:bg-[#C85C34] disabled:opacity-50 text-white text-sm font-bold py-3 rounded-xl transition-colors mt-2 cursor-pointer"
                        >
                          {authLoading ? "Please wait..." : (accountView === "create" ? "Create Account" : "Log In")}
                        </button>
                      </form>
                    )}"""

replacement2 = """                        <button 
                          type="submit"
                          disabled={authLoading}
                          className="w-full bg-[#D96B43] hover:bg-[#C85C34] disabled:opacity-50 text-white text-sm font-bold py-3 rounded-xl transition-colors mt-2 cursor-pointer"
                        >
                          {authLoading ? "Please wait..." : (accountView === "create" ? "Create Account" : "Log In")}
                        </button>
                      </form>
                    ) : null}"""

content = content.replace(target2, replacement2)

with open("src/App.tsx", "w") as f:
    f.write(content)

print("Fixed form visibility")
