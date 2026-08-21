import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

old_accent = """                      { id: "teal", hex: "#14B8A6" }
                    ].map(color => (
                      <button
                        key={color.id}
                        onClick={() => setThemeConfig({...themeConfig, accentColor: color.id})}
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${themeConfig.accentColor === color.id ? 'ring-2 ring-offset-2 ring-[var(--accent-main)] scale-110' : 'hover:scale-105'}`}
                        style={{ backgroundColor: color.hex, ringOffsetColor: 'var(--bg-panel)' }}
                      >
                        {themeConfig.accentColor === color.id && <Check className="w-5 h-5 text-white drop-shadow-md" />}
                      </button>
                    ))}
                  </div>"""

new_accent = """                      { id: "teal", hex: "#14B8A6" }
                    ].map(color => (
                      <button
                        key={color.id}
                        onClick={() => setThemeConfig({...themeConfig, accentColor: color.id})}
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shrink-0 ${themeConfig.accentColor === color.id ? 'ring-2 ring-offset-2 ring-[var(--accent-main)] scale-110' : 'hover:scale-105'}`}
                        style={{ backgroundColor: color.hex, ringOffsetColor: 'var(--bg-panel)' }}
                      >
                        {themeConfig.accentColor === color.id && <Check className="w-5 h-5 text-[var(--text-inverted,white)] drop-shadow-md" />}
                      </button>
                    ))}
                    
                    <div className="relative flex items-center shrink-0">
                      <input 
                        type="color" 
                        value={themeConfig.accentColor === 'custom' ? themeConfig.customAccent || '#000000' : '#000000'}
                        onChange={(e) => setThemeConfig({...themeConfig, accentColor: 'custom', customAccent: e.target.value})}
                        className="w-10 h-10 p-0 border-0 rounded-full overflow-hidden cursor-pointer opacity-0 absolute inset-0 z-10"
                        title="Custom Color"
                      />
                      <div 
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all border border-[var(--border-main)] ${themeConfig.accentColor === 'custom' ? 'ring-2 ring-offset-2 ring-[var(--accent-main)] scale-110' : 'hover:scale-105'}`}
                        style={{ 
                          background: themeConfig.accentColor === 'custom' ? themeConfig.customAccent : 'conic-gradient(red, yellow, green, cyan, blue, magenta, red)',
                          ringOffsetColor: 'var(--bg-panel)'
                        }}
                      >
                        {themeConfig.accentColor === 'custom' && <Check className="w-5 h-5 text-[var(--text-inverted,white)] drop-shadow-md mix-blend-difference" />}
                      </div>
                    </div>
                  </div>"""

content = content.replace(old_accent, new_accent)

with open('src/App.tsx', 'w') as f:
    f.write(content)
