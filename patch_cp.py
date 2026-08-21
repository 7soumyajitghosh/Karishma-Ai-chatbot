import re

with open("src/App.tsx", "r") as f:
    content = f.read()

target = """                            <input
                              type="password"
                              placeholder="Confirm New Password"
                              value={cpConfirm}
                              onChange={e => setCpConfirm(e.target.value)}
                              className="w-full bg-[#FAF8F5] border border-[#EBE6DD] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#D96B43] focus:border-transparent transition-all"
                            />
                          </div>
                          <button
                            disabled={cpLoading}"""

replacement = """                            <input
                              type="password"
                              placeholder="Confirm New Password"
                              value={cpConfirm}
                              onChange={e => setCpConfirm(e.target.value)}
                              className="w-full bg-[#FAF8F5] border border-[#EBE6DD] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#D96B43] focus:border-transparent transition-all"
                            />
                          </div>
                          
                          <div className="flex justify-end">
                            <button 
                              type="button"
                              onClick={() => { 
                                setResetEmail(loggedInUser.email);
                                localStorage.removeItem("mock_logged_in_user");
                                setLoggedInUser(null);
                                setAccountView("forgot"); 
                                setAuthError(""); 
                                setChatHistoryList([]);
                                localStorage.removeItem("best_friend_saved_chats");
                                setMessages([{
                                  id: "welcome-logout",
                                  role: "model",
                                  text: "You have logged out successfully. Please log in to see your history.",
                                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                                }]);
                                setCurrentChatId(crypto.randomUUID());
                              }}
                              className="text-[11px] font-bold text-[#D96B43] hover:text-[#C85C34] transition-colors cursor-pointer"
                            >
                              Forgot Password?
                            </button>
                          </div>

                          <button
                            disabled={cpLoading}"""

content = content.replace(target, replacement)

with open("src/App.tsx", "w") as f:
    f.write(content)

print("Patched.")
