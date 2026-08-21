import re

with open("src/App.tsx", "r") as f:
    content = f.read()

# Replace the retention policy labels
old_settings = """                    <div className="space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer p-2 rounded-xl hover:bg-[#FAF8F5] transition-all">
                        <input
                          type="radio"
                          name="retention"
                          checked={retentionPolicy === "local"}
                          onChange={() => {
                            setRetentionPolicy("local");
                            localStorage.setItem("best_friend_retention_policy", "local");
                          }}
                          className="accent-[#D96B43]"
                        />
                        <div>
                          <span className="font-semibold block text-sm text-[#2C2A29]">Encrypted Local Cache</span>
                          <span className="text-[11px] text-[#8C857E]">Keeps chat safe on this machine using secure localStorage.</span>
                        </div>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer p-2 rounded-xl hover:bg-[#FAF8F5] transition-all">
                        <input
                          type="radio"
                          name="retention"
                          checked={retentionPolicy === "session"}
                          onChange={() => {
                            setRetentionPolicy("session");
                            localStorage.setItem("best_friend_retention_policy", "session");
                          }}
                          className="accent-[#D96B43]"
                        />
                        <div>
                          <span className="font-semibold block text-sm text-[#2C2A29]">Session-Only Memory</span>
                          <span className="text-[11px] text-[#8C857E]">Wipes completely once you close the window.</span>
                        </div>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer p-2 rounded-xl hover:bg-[#FAF8F5] transition-all">
                        <input
                          type="radio"
                          name="retention"
                          checked={retentionPolicy === "zero"}
                          onChange={() => {
                            setRetentionPolicy("zero");
                            localStorage.setItem("best_friend_retention_policy", "zero");
                            localStorage.removeItem("best_friend_chat_history");
                          }}
                          className="accent-[#D96B43]"
                        />
                        <div>
                          <span className="font-semibold block text-sm text-rose-700">Zero-Knowledge Sandbox</span>
                          <span className="text-[11px] text-[#8C857E]">Instant stateless messaging. Zero footprints buffered.</span>
                        </div>
                      </label>
                    </div>"""

new_settings = """                    <div className="space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer p-2 rounded-xl hover:bg-[#FAF8F5] transition-all">
                        <input
                          type="radio"
                          name="retention"
                          checked={retentionPolicy === "local"}
                          onChange={() => {
                            setRetentionPolicy("local");
                            localStorage.setItem("best_friend_retention_policy", "local");
                          }}
                          className="accent-[#D96B43]"
                        />
                        <div>
                          <span className="font-semibold block text-sm text-[#2C2A29]">End-to-End Encryption (E2EE)</span>
                          <span className="text-[11px] text-[#8C857E]">Persistent chat securely synced and encrypted across devices.</span>
                        </div>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer p-2 rounded-xl hover:bg-[#FAF8F5] transition-all">
                        <input
                          type="radio"
                          name="retention"
                          checked={retentionPolicy === "session"}
                          onChange={() => {
                            setRetentionPolicy("session");
                            localStorage.setItem("best_friend_retention_policy", "session");
                          }}
                          className="accent-[#D96B43]"
                        />
                        <div>
                          <span className="font-semibold block text-sm text-[#2C2A29]">Sessional Memories</span>
                          <span className="text-[11px] text-[#8C857E]">Chat is wiped when session ends. Not saved or synced anywhere.</span>
                        </div>
                      </label>
                    </div>"""

if old_settings in content:
    content = content.replace(old_settings, new_settings)
else:
    print("Could not find exact match for settings block")

with open("src/App.tsx", "w") as f:
    f.write(content)
print("done")
