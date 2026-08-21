import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

# 1. Add reactions to Message interface
content = content.replace(
    '  isEncrypted?: boolean;\n}',
    '  isEncrypted?: boolean;\n  reactions?: string[];\n}'
)

# 2. Add handleReaction function after messages map
# Let's just add it before the return statement of App
func_to_add = """
  const handleReaction = (messageId: string, emoji: string) => {
    setMessages(prev => prev.map(m => {
      if (m.id === messageId) {
        const currentReactions = m.reactions || [];
        if (currentReactions.includes(emoji)) {
          return { ...m, reactions: currentReactions.filter(r => r !== emoji) };
        } else {
          return { ...m, reactions: [...currentReactions, emoji] };
        }
      }
      return m;
    }));
  };
"""
content = content.replace('  // Welcome message when application loads', func_to_add + '  // Welcome message when application loads')

# 3. Add Smile icon to lucide-react imports if not there
if 'Smile' not in content:
    content = content.replace('Brain,\n  Zap\n}', 'Brain,\n  Zap,\n  Smile\n}')

# 4. Modify message rendering
old_message = """                    <div
                      key={m.id}
                      className={`flex flex-col ${isUser ? "items-end" : "items-start"} max-w-[85%] ${
                        isUser ? "ml-auto" : "mr-auto"
                      }`}
                    >
                      {/* Name tag */}
                      <span className="text-[10px] text-[#8C857E] mb-1 px-1">
                        {isUser ? "You" : "Karishma"} • {m.timestamp}
                      </span>

                      {/* Bubble */}
                      <div
                        className={`p-3.5 rounded-2xl text-sm leading-relaxed ${
                          isUser
                            ? "bg-[#D96B43] text-white rounded-tr-none shadow-sm"
                            : "bg-[#EBE6DD] text-[#2C2A29] rounded-tl-none"
                        }`}
                      >"""

new_message = """                    <div
                      key={m.id}
                      className={`flex flex-col ${isUser ? "items-end" : "items-start"} max-w-[85%] group ${
                        isUser ? "ml-auto" : "mr-auto"
                      }`}
                    >
                      {/* Name tag */}
                      <span className="text-[10px] text-[#8C857E] mb-1 px-1">
                        {isUser ? "You" : "Karishma"} • {m.timestamp}
                      </span>

                      <div className="relative flex items-center gap-2">
                        {isUser && (
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-white border border-[#EBE6DD] rounded-full px-2 py-1 shadow-sm shrink-0">
                            {["👍", "❤️", "😂"].map(emoji => (
                              <button 
                                key={emoji} 
                                onClick={() => handleReaction(m.id, emoji)}
                                className="hover:scale-125 transition-transform text-xs"
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        )}
                        {/* Bubble */}
                        <div
                          className={`p-3.5 rounded-2xl text-sm leading-relaxed ${
                            isUser
                              ? "bg-[#D96B43] text-white rounded-tr-none shadow-sm"
                              : "bg-[#EBE6DD] text-[#2C2A29] rounded-tl-none"
                          }`}
                        >"""

old_end_bubble = """                        {/* Grounding web search citations if they exist */}
                        {m.citations && m.citations.length > 0 && (
                          <div className="mt-2.5 pt-2 border-t border-[#DFD9D0] text-[11px] text-[#5C5753]">
                            <span className="font-semibold block mb-1">🌍 Helpful Real-Time Sources:</span>
                            <div className="flex flex-col gap-1">
                              {m.citations.map((cit, idx) => (
                                <a
                                  key={idx}
                                  href={cit.uri}
                                  target="_blank"
                                  referrerPolicy="no-referrer"
                                  className="underline text-[#D96B43] hover:text-[#2C2A29] block truncate font-mono"
                                >
                                  {cit.title}
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>"""

new_end_bubble = """                        {/* Grounding web search citations if they exist */}
                        {m.citations && m.citations.length > 0 && (
                          <div className="mt-2.5 pt-2 border-t border-[#DFD9D0] text-[11px] text-[#5C5753]">
                            <span className="font-semibold block mb-1">🌍 Helpful Real-Time Sources:</span>
                            <div className="flex flex-col gap-1">
                              {m.citations.map((cit, idx) => (
                                <a
                                  key={idx}
                                  href={cit.uri}
                                  target="_blank"
                                  referrerPolicy="no-referrer"
                                  className="underline text-[#D96B43] hover:text-[#2C2A29] block truncate font-mono"
                                >
                                  {cit.title}
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      {!isUser && (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-white border border-[#EBE6DD] rounded-full px-2 py-1 shadow-sm shrink-0">
                          {["👍", "❤️", "😂"].map(emoji => (
                            <button 
                              key={emoji} 
                              onClick={() => handleReaction(m.id, emoji)}
                              className="hover:scale-125 transition-transform text-xs"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}
                      </div>
                      {m.reactions && m.reactions.length > 0 && (
                        <div className={`flex items-center gap-1 mt-1 ${isUser ? "mr-2" : "ml-2"}`}>
                          <div className="flex items-center bg-white border border-[#EBE6DD] rounded-full px-2 py-0.5 shadow-sm">
                            {m.reactions.map(r => (
                              <span key={r} className="text-xs">{r}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>"""

content = content.replace(old_message, new_message)
content = content.replace(old_end_bubble, new_end_bubble)

with open('src/App.tsx', 'w') as f:
    f.write(content)
