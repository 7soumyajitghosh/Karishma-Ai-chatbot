import re

with open("src/App.tsx", "r") as f:
    content = f.read()

logout_regex = re.compile(r'localStorage\.removeItem\("mock_logged_in_user"\);\s*setLoggedInUser\(null\);\s*setAccountView\("login"\);', re.DOTALL)
new_logout = """localStorage.removeItem("mock_logged_in_user");
                        setLoggedInUser(null);
                        setAccountView("login");
                        // Clear local cache on logout
                        setChatHistoryList([]);
                        localStorage.removeItem("best_friend_saved_chats");
                        setMessages([{
                          id: "welcome-logout",
                          role: "model",
                          text: "You have logged out successfully. Please log in to see your history.",
                          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        }]);
                        setCurrentChatId(crypto.randomUUID());"""

content = logout_regex.sub(new_logout, content)

with open("src/App.tsx", "w") as f:
    f.write(content)
print("Updated logout logic")
