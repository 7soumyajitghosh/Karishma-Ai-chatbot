import re

with open("src/App.tsx", "r") as f:
    content = f.read()

# Remove setMessages from inside setChatHistoryList
content = content.replace("""            // If current chat is one of the fetched ones, update its messages too
            if (currentChatId) {
                const currentInCloud = merged.find(s => s.id === currentChatId);
                if (currentInCloud) {
                    setMessages(currentInCloud.messages);
                }
            }""", "")

# Add it after setChatHistoryList
content = content.replace("""            return merged;
          });""", """            return merged;
          });
          
          // Update current messages if it's the active chat
          const currentInCloud = data.sessions.find((s: any) => s.id === currentChatId);
          if (currentInCloud) {
             setMessages(currentInCloud.messages);
          }""")

with open("src/App.tsx", "w") as f:
    f.write(content)
print("Fixed setMessages")
