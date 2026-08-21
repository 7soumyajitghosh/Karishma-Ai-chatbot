import re

with open("src/App.tsx", "r") as f:
    content = f.read()

# Fix useState
content = content.replace('useState<"session" | "local" | "zero">', 'useState<"session" | "local">')

# Fix contextHistory
old_context = """      const contextHistory = retentionPolicy === "zero" 
        ? [newUserMessage]
        : updatedMessages;"""
new_context = """      const contextHistory = updatedMessages;"""
content = content.replace(old_context, new_context)

# Fix save block
old_save = """    if (retentionPolicy === "local") {
      localStorage.setItem("best_friend_chat_history", encodedMessages);
    } else if (retentionPolicy === "zero") {
      localStorage.removeItem("best_friend_chat_history");
    } else {
      // session-only, but let's keep it in session memory
      sessionStorage.setItem("best_friend_chat_history", encodedMessages);
    }"""
new_save = """    if (retentionPolicy === "local") {
      localStorage.setItem("best_friend_chat_history", encodedMessages);
    } else {
      // session-only, but let's keep it in session memory
      sessionStorage.setItem("best_friend_chat_history", encodedMessages);
    }"""
content = content.replace(old_save, new_save)

with open("src/App.tsx", "w") as f:
    f.write(content)
print("done")
