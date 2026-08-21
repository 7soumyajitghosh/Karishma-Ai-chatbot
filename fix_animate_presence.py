import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

# Fix showModelSwitcher
content = content.replace('{showModelSwitcher && (\n          <>\n            {/* Backdrop */}\n            <motion.div',
                          '{showModelSwitcher && (\n            <motion.div\n              key="model-switcher"')

content = content.replace('              </motion.div>\n            </motion.div>\n          </>\n        )}',
                          '              </motion.div>\n            </motion.div>\n        )}')

# Fix showSettings
old_settings = """      {/* Settings Slide-over Panel */}
      <AnimatePresence>
        {showSettings && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSettings(false)}
              className="fixed inset-0 bg-[#2C2A29]/20 backdrop-blur-sm z-40"
            />
            
            {/* Slide-over */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 w-full max-w-md bg-[#FAF8F5] shadow-2xl z-50 border-l border-[#EBE6DD] flex flex-col overflow-hidden"
            >"""

new_settings = """      {/* Settings Slide-over Panel */}
      <AnimatePresence>
        {showSettings && (
            <motion.div
              key="settings-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSettings(false)}
              className="fixed inset-0 bg-[#2C2A29]/20 backdrop-blur-sm z-40"
            />
        )}
        {showSettings && (
            <motion.div
              key="settings-panel"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 w-full max-w-md bg-[#FAF8F5] shadow-2xl z-50 border-l border-[#EBE6DD] flex flex-col overflow-hidden"
            >"""

content = content.replace(old_settings, new_settings)

# Remove the closing `</>` for showSettings
# Let's find it. It's right before `</AnimatePresence>` for line 1175
old_settings_close = """            </motion.div>
          </>
        )}
      </AnimatePresence>"""

new_settings_close = """            </motion.div>
        )}
      </AnimatePresence>"""

content = content.replace(old_settings_close, new_settings_close)

with open('src/App.tsx', 'w') as f:
    f.write(content)
