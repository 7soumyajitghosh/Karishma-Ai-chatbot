import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

# Replace the fetch logic in handleSendMessage
old_fetch = """      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: messagesPayload,
          model: selectedModel,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const errorText = errData.error || "";
        if (errorText.toLowerCase().includes("quota") || errorText.toLowerCase().includes("not found") || errorText.toLowerCase().includes("not available") || errorText.toLowerCase().includes("no longer available")) {
            const models = ["gemini-3.6-flash", "gemini-3.1-pro-preview", "gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.5-flash-lite"];
            const currIdx = models.indexOf(selectedModel);
            const nextModel = currIdx !== -1 && currIdx < models.length - 1 ? models[currIdx + 1] : models[0];
            setSelectedModel(nextModel);
            localStorage.setItem("best_friend_selected_model", nextModel);
            throw new Error(`Model limit reached. Automatically switching to ${nextModel}. Please try again.`);
        }
        throw new Error(errorText || "Failed to contact your friend.");
      }

      const data = await response.json();"""

new_fetch = """      let currentModelToUse = selectedModel;
      let finalData = null;
      let modelLimitHit = false;

      for (let attempt = 0; attempt < 3; attempt++) {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: messagesPayload,
            model: currentModelToUse,
          }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          const errorText = errData.error || "";
          
          if (errorText.toLowerCase().includes("quota") || errorText.toLowerCase().includes("not found") || errorText.toLowerCase().includes("not available") || errorText.toLowerCase().includes("no longer available") || errorText.toLowerCase().includes("rate limit")) {
              const models = ["gemini-3.6-flash", "gemini-3.1-pro-preview", "gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.5-flash-lite"];
              const currIdx = models.indexOf(currentModelToUse);
              const nextModel = currIdx !== -1 && currIdx < models.length - 1 ? models[currIdx + 1] : models[0];
              
              currentModelToUse = nextModel;
              modelLimitHit = true;
              
              if (attempt === 2) {
                  setSelectedModel(currentModelToUse);
                  localStorage.setItem("best_friend_selected_model", currentModelToUse);
                  throw new Error(`Model limits reached. Automatically switched to ${currentModelToUse}. Please try again in a few seconds.`);
              }
              // Wait a tiny bit before retrying just in case
              await new Promise(r => setTimeout(r, 500));
              continue;
          } else {
              throw new Error(errorText || "Failed to contact your friend.");
          }
        }
        
        finalData = await response.json();
        break; // Success!
      }

      if (modelLimitHit) {
          setSelectedModel(currentModelToUse);
          localStorage.setItem("best_friend_selected_model", currentModelToUse);
      }
      
      const data = finalData;"""

content = content.replace(old_fetch, new_fetch)

with open('src/App.tsx', 'w') as f:
    f.write(content)
