import re

with open("src/App.tsx", "r") as f:
    content = f.read()

# Modify the cloud sync effect to include encryptionKey in dependencies and do decryption
cloud_sync_regex = re.compile(r'// Sync cloud history on login\s*useEffect\(\(\) => \{.*?\}, \[loggedInUser\?\.id\]\);', re.DOTALL)

new_cloud_sync = """// Sync cloud history on login and when encryption key changes
  useEffect(() => {
    if (loggedInUser?.id) {
      fetch("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: loggedInUser.id })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.sessions) {
          setChatHistoryList(prev => {
            const merged = [...prev];
            data.sessions.forEach((cloudSession: any) => {
              // Decrypt
              cloudSession.messages = cloudSession.messages.map((m: any) => {
                if (m.isEncrypted) {
                  try {
                    const cipherChars = JSON.parse(atob(m.text));
                    let plainText = "";
                    for (let i = 0; i < cipherChars.length; i++) {
                       plainText += String.fromCharCode(cipherChars[i] ^ encryptionKey.charCodeAt(i % encryptionKey.length));
                    }
                    return { ...m, text: plainText };
                  } catch (e) {
                    return { ...m, text: "[Encrypted Message - Invalid Key]" };
                  }
                }
                return m;
              });

              const existingIdx = merged.findIndex(s => s.id === cloudSession.id);
              if (existingIdx >= 0) {
                merged[existingIdx] = cloudSession;
              } else {
                merged.push(cloudSession);
              }
            });
            merged.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            const encodedChats = btoa(encodeURIComponent(JSON.stringify(merged)));
            localStorage.setItem("best_friend_saved_chats", encodedChats);
            
            // If current chat is one of the fetched ones, update its messages too
            if (currentChatId) {
                const currentInCloud = merged.find(s => s.id === currentChatId);
                if (currentInCloud) {
                    setMessages(currentInCloud.messages);
                }
            }
            
            return merged;
          });
        }
      })
      .catch(console.error);
    }
  }, [loggedInUser?.id, encryptionKey]);"""

content = cloud_sync_regex.sub(new_cloud_sync, content)

# Modify the cloud save logic
save_regex = re.compile(r'// Sync to cloud if authenticated and persistent\s*if \(loggedInUser\?\.id && retentionPolicy === "local"\) \{.*?\}\s*return newList;', re.DOTALL)

new_save = """// Sync to cloud if authenticated and persistent
        if (loggedInUser?.id && retentionPolicy === "local") {
          const sessionToSave = newList.find(c => c.id === currentChatId);
          if (sessionToSave) {
            const payload = JSON.parse(JSON.stringify(sessionToSave));
            payload.messages = payload.messages.map((m: any) => {
              if (m.isEncrypted) {
                let cipherChars = [];
                for (let i = 0; i < m.text.length; i++) {
                   cipherChars.push(m.text.charCodeAt(i) ^ encryptionKey.charCodeAt(i % encryptionKey.length));
                }
                const cipher = btoa(JSON.stringify(cipherChars));
                return { ...m, text: cipher };
              }
              return m;
            });

            fetch("/api/history/save", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ userId: loggedInUser.id, session: payload })
            }).catch(console.error);
          }
        }
        
        return newList;"""

content = save_regex.sub(new_save, content)

with open("src/App.tsx", "w") as f:
    f.write(content)
print("Updated encryption sync successfully")
