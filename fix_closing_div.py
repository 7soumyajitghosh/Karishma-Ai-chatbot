import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

old_str = """                        )}
                      </div>

                      {/* Decryption Helper pill */}"""

new_str = """                        )}
                      </div>
                      {!isUser && (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-white border border-[#EBE6DD] rounded-full px-2 py-1 shadow-sm shrink-0">
                          {["👍", "❤️", "😂"].map(emoji => (
                            <button 
                              key={emoji} 
                              onClick={() => handleReaction(m.id, emoji)}
                              className="hover:scale-125 transition-transform text-xs cursor-pointer"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}
                      </div>
                      {m.reactions && m.reactions.length > 0 && (
                        <div className={`flex items-center gap-1 mt-1 ${isUser ? "ml-auto mr-2" : "mr-auto ml-2"}`}>
                          <div className="flex items-center gap-1 bg-white border border-[#EBE6DD] rounded-full px-2 py-0.5 shadow-sm">
                            {m.reactions.map(r => (
                              <span key={r} className="text-xs">{r}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Decryption Helper pill */}"""

content = content.replace(old_str, new_str)

with open('src/App.tsx', 'w') as f:
    f.write(content)
