import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

theme_panel_jsx = """
      {/* Theme Slide-over Panel */}
      <AnimatePresence>
        {showThemePanel && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowThemePanel(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            />
            
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-full max-w-md bg-[var(--bg-panel)] shadow-2xl z-50 border-r border-[var(--border-main)] flex flex-col overflow-hidden text-[var(--text-main)]"
            >
              <div className="px-5 py-4 border-b border-[var(--border-main)] flex justify-between items-center bg-[var(--bg-panel)] sticky top-0 z-10">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Palette className="w-5 h-5 text-[var(--accent-main)]" />
                  Theme Customization
                </h2>
                <button 
                  onClick={() => setShowThemePanel(false)} 
                  className="p-2 rounded-full text-[var(--text-muted)] hover:bg-[var(--bg-hover)] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-5 space-y-8 pb-20">
                
                {/* Appearance */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold flex items-center gap-1.5 text-[var(--text-muted)]">
                    <Sun className="w-4 h-4" /> Appearance
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {["light", "dark", "system", "amoled"].map(mode => (
                      <button
                        key={mode}
                        onClick={() => setThemeConfig({...themeConfig, appearance: mode})}
                        className={`p-2.5 text-xs rounded-xl border font-medium capitalize transition-all ${themeConfig.appearance === mode ? 'bg-[var(--accent-bg)] border-[var(--accent-main)] text-[var(--accent-main)]' : 'bg-[var(--bg-main)] border-[var(--border-main)] hover:border-[var(--border-dark)]'}`}
                      >
                        {mode === 'amoled' ? 'AMOLED Black' : mode + ' Mode'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Accent Color */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold flex items-center gap-1.5 text-[var(--text-muted)]">
                    <Paintbrush className="w-4 h-4" /> Accent Color
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: "orange", hex: "#D96B43" },
                      { id: "blue", hex: "#3B82F6" },
                      { id: "green", hex: "#10B981" },
                      { id: "purple", hex: "#8B5CF6" },
                      { id: "red", hex: "#EF4444" },
                      { id: "pink", hex: "#EC4899" },
                      { id: "teal", hex: "#14B8A6" }
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
                  </div>
                </div>

                {/* Chat Style */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold flex items-center gap-1.5 text-[var(--text-muted)]">
                    <Layout className="w-4 h-4" /> Chat Style
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {["rounded", "compact", "modern", "minimal"].map(style => (
                      <button
                        key={style}
                        onClick={() => setThemeConfig({...themeConfig, chatStyle: style})}
                        className={`p-2.5 text-xs rounded-xl border font-medium capitalize transition-all ${themeConfig.chatStyle === style ? 'bg-[var(--accent-bg)] border-[var(--accent-main)] text-[var(--accent-main)]' : 'bg-[var(--bg-main)] border-[var(--border-main)] hover:border-[var(--border-dark)]'}`}
                      >
                        {style}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Background */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold flex items-center gap-1.5 text-[var(--text-muted)]">
                    <Image className="w-4 h-4" /> Background
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {["solid", "gradient", "blur", "abstract", "custom"].map(bg => (
                      <button
                        key={bg}
                        onClick={() => {
                          if (bg === 'custom') {
                            const url = prompt("Enter an image URL for your background:");
                            if (url) {
                              setThemeConfig({...themeConfig, background: bg, customBgUrl: url});
                            }
                          } else {
                            setThemeConfig({...themeConfig, background: bg});
                          }
                        }}
                        className={`p-2.5 text-xs rounded-xl border font-medium capitalize transition-all ${themeConfig.background === bg ? 'bg-[var(--accent-bg)] border-[var(--accent-main)] text-[var(--accent-main)]' : 'bg-[var(--bg-main)] border-[var(--border-main)] hover:border-[var(--border-dark)]'}`}
                      >
                        {bg}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Fonts */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold flex items-center gap-1.5 text-[var(--text-muted)]">
                    <Type className="w-4 h-4" /> Fonts
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {["default", "inter", "poppins", "roboto", "nunito"].map(font => (
                      <button
                        key={font}
                        onClick={() => setThemeConfig({...themeConfig, font: font})}
                        className={`p-2.5 text-xs rounded-xl border font-medium capitalize transition-all ${themeConfig.font === font ? 'bg-[var(--accent-bg)] border-[var(--accent-main)] text-[var(--accent-main)]' : 'bg-[var(--bg-main)] border-[var(--border-main)] hover:border-[var(--border-dark)]'}`}
                      >
                        {font}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Effects */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold flex items-center gap-1.5 text-[var(--text-muted)]">
                    <Wand2 className="w-4 h-4" /> Effects
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: "glass", label: "Glassmorphism" },
                      { id: "smooth", label: "Smooth Animations" },
                      { id: "dynamic", label: "Dynamic Blur" },
                      { id: "shadow", label: "Bubble Shadows" },
                      { id: "none", label: "Disable Animations" }
                    ].map(eff => (
                      <button
                        key={eff.id}
                        onClick={() => setThemeConfig({...themeConfig, effects: eff.id})}
                        className={`p-2.5 text-xs rounded-xl border font-medium transition-all ${themeConfig.effects === eff.id ? 'bg-[var(--accent-bg)] border-[var(--accent-main)] text-[var(--accent-main)]' : 'bg-[var(--bg-main)] border-[var(--border-main)] hover:border-[var(--border-dark)]'}`}
                      >
                        {eff.label}
                      </button>
                    ))}
                  </div>
                </div>

              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
"""

content = content.replace("      {/* Model Switcher Modal */}", theme_panel_jsx + "\n      {/* Model Switcher Modal */}")

with open('src/App.tsx', 'w') as f:
    f.write(content)
