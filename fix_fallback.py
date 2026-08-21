import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

fallback_logic = """      if (!response.ok) {
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
      }"""

content = re.sub(r'      if \(\!response\.ok\) \{\n        const errData = await response\.json\(\);\n        throw new Error\(errData\.error \|\| "Failed to contact your friend\."\);\n      \}', fallback_logic, content)

with open('src/App.tsx', 'w') as f:
    f.write(content)
