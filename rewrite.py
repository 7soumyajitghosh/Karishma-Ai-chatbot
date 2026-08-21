import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

# Add Settings and X imports
content = content.replace('Info\n} from "lucide-react";', 'Info,\n  Settings,\n  X\n} from "lucide-react";')

# Add state
state_block = """  // UI States
  const [showKeyEditor, setShowKeyEditor] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showPrivacyNotice, setShowPrivacyNotice] = useState(false);
  const [showSettings, setShowSettings] = useState(false);"""
content = re.sub(r'  // UI States\n.*?const \[showPrivacyNotice, setShowPrivacyNotice\] = useState\(false\);', state_block, content, flags=re.DOTALL)

# Header modification
header_replacement = """          <div className="flex flex-wrap gap-2 items-center">
            {/* Settings toggle button */}
            <button
              onClick={() => setShowSettings(true)}
              className="flex items-center gap-1.5 p-2 rounded-full text-xs font-medium bg-white text-[#5C5753] border border-[#EBE6DD] hover:bg-[#FAF8F5] transition-all cursor-pointer"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>"""
content = re.sub(r'          <div className="flex flex-wrap gap-2 items-center">.*?</div>', header_replacement, content, flags=re.DOTALL)

# Remove the Security & Privacy FAQ modal since we're deleting the button
content = re.sub(r'        {/\* Security & Privacy FAQ modal \*/}.*?</AnimatePresence>', '', content, flags=re.DOTALL)

# Extract right column content
right_column_match = re.search(r'            {/\* RIGHT COLUMN: Security Dashboard & Privacy settings \(40% or 5 cols\) \*/}\n            <section className="lg:col-span-5 flex flex-col gap-6">(.*?)</section>', content, flags=re.DOTALL)
right_column_content = right_column_match.group(1)

# Modify main container grid
content = content.replace('<div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">', '<div className="flex-1 flex flex-col gap-6 items-stretch h-full">')
content = content.replace('            {/* LEFT COLUMN: The Companion Chat Interface (60% or 7 cols) */}\n            <section className="lg:col-span-7 flex flex-col border border-[#EBE6DD] rounded-3xl bg-white shadow-sm overflow-hidden min-h-[550px] max-h-[720px]">', '            {/* The Companion Chat Interface */}\n            <section className="flex-1 flex flex-col border border-[#EBE6DD] rounded-3xl bg-white shadow-sm overflow-hidden min-h-[550px]">')

# Remove the right column section
content = re.sub(r'\n            {/\* RIGHT COLUMN: Security Dashboard & Privacy settings \(40% or 5 cols\) \*/}\n            <section className="lg:col-span-5 flex flex-col gap-6">.*?</section>', '', content, flags=re.DOTALL)

# Let's not use f-strings to avoid python curly brace interpolation issues. We will just use string concatenation.

slide_over = """
      {/* Settings Slide-over Panel */}
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
            >
              <div className="flex justify-between items-center p-5 border-b border-[#EBE6DD] bg-white shrink-0">
                <h2 className="text-lg font-bold text-[#2C2A29] flex items-center gap-2">
                  <Settings className="w-5 h-5 text-[#D96B43]" />
                  Settings
                </h2>
                <button 
                  onClick={() => setShowSettings(false)} 
                  className="p-2 bg-[#FAF8F5] rounded-full text-[#8C857E] hover:text-[#2C2A29] transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-5 space-y-8">
                
                {/* CATEGORY: Privacy & Storage */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-[#8C857E] uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5" />
                    Privacy & Storage
                  </h3>
                  
                  {/* Storage Policy Component */}
                  <div className="bg-white border border-[#EBE6DD] rounded-2xl p-4 shadow-sm">
                    <h4 className="text-sm font-bold text-[#2C2A29] mb-3">Chat Storage Policy</h4>
                    <div className="space-y-2">
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
                    </div>
                  </div>
                </div>

                {/* CATEGORY: Security */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-[#8C857E] uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Lock className="w-3.5 h-3.5" />
                    Security
                  </h3>
                  
                  {/* Extracted MFA Guard HTML */}
                  <div className="bg-white border border-[#EBE6DD] rounded-2xl p-4 shadow-sm">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-sm font-bold text-[#2C2A29]">MFA Guard</h4>
                      {mfaEnabled ? (
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          Active
                        </span>
                      ) : (
                        <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          Disabled
                        </span>
                      )}
                    </div>
                    {mfaStep === "idle" && !mfaEnabled && (
                      <div className="text-left">
                        <p className="text-xs text-[#5C5753] leading-relaxed mb-3">
                          Double-lock your conversation! Enabling Multi-Factor Authentication prevents anyone else from opening your chat stream from this device.
                        </p>
                        <button
                          onClick={startMfaSetup}
                          className="w-full justify-center bg-[#D96B43] hover:bg-[#C85C34] text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all cursor-pointer inline-flex items-center gap-1.5"
                        >
                          <Power className="w-3.5 h-3.5" />
                          Begin MFA Integration Setup
                        </button>
                      </div>
                    )}

                    {mfaStep === "setup" && (
                      <div className="space-y-4">
                        <div className="bg-[#FAF8F5] p-3 rounded-xl border border-[#EBE6DD] flex flex-col items-center">
                          <p className="text-[11px] font-bold text-[#D96B43] mb-2 uppercase tracking-wide">
                            Scan QR with Google Authenticator
                          </p>
                          
                          <svg width="120" height="120" viewBox="0 0 100 100" className="bg-white p-2 rounded-lg border border-[#EBE6DD]">
                            <rect x="0" y="0" width="20" height="20" fill="#2C2A29" />
                            <rect x="4" y="4" width="12" height="12" fill="white" />
                            <rect x="8" y="8" width="4" height="4" fill="#2C2A29" />
                            
                            <rect x="80" y="0" width="20" height="20" fill="#2C2A29" />
                            <rect x="84" y="4" width="12" height="12" fill="white" />
                            <rect x="88" y="8" width="4" height="4" fill="#2C2A29" />

                            <rect x="0" y="80" width="20" height="20" fill="#2C2A29" />
                            <rect x="4" y="84" width="12" height="12" fill="white" />
                            <rect x="88" y="80" width="4" height="4" fill="#2C2A29" />

                            <rect x="30" y="10" width="10" height="10" fill="#D96B43" />
                            <rect x="50" y="30" width="20" height="10" fill="#2C2A29" />
                            <rect x="40" y="60" width="10" height="30" fill="#D96B43" />
                            <rect x="70" y="70" width="20" height="20" fill="#2C2A29" />
                            <rect x="60" y="40" width="30" height="10" fill="#D96B43" />
                            <rect x="10" y="40" width="20" height="20" fill="#2C2A29" />
                          </svg>

                          <div className="text-center mt-2">
                            <code className="text-[10px] font-mono bg-[#EBE6DD] px-1.5 py-0.5 rounded text-[#2C2A29]">
                              Secret Seed: SUNNY-MFA-2026-VAULT
                            </code>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-[#5C5753] mb-1">
                            Step 2: Enter 6-digit Authenticator Code
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              maxLength={6}
                              placeholder="Code e.g. 123456"
                              value={mfaCode}
                              onChange={(e) => setMfaCode(e.target.value.replace(/\\D/g, ""))}
                              className="flex-1 bg-[#FAF8F5] border border-[#EBE6DD] rounded-xl px-3 py-1.5 text-xs text-center font-mono tracking-[0.2em] focus:outline-none focus:ring-1 focus:ring-[#D96B43]"
                            />
                            <button
                              onClick={handleVerifyMfaCode}
                              className="bg-[#D96B43] hover:bg-[#C85C34] text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition-all cursor-pointer"
                            >
                              Verify & Secure
                            </button>
                          </div>
                          <p className="text-[10px] text-[#8C857E] mt-1">
                            💡 Use code <b>123456</b> or any 6 digits to bypass successfully.
                          </p>
                        </div>

                        {mfaError && (
                          <p className="text-[10px] text-rose-600 font-medium">{mfaError}</p>
                        )}
                      </div>
                    )}

                    {mfaEnabled && (
                      <div className="space-y-4">
                        <div className="bg-[#EAF5EC] border border-[#CDE5D3] p-3 rounded-xl flex items-start gap-2.5 mt-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                          <div className="text-xs text-emerald-800">
                            <p className="font-bold">MFA Double-Lock Activated</p>
                            <p className="opacity-90">Your chat history is fully shielded.</p>
                          </div>
                        </div>

                        {recoveryCodes.length > 0 && (
                          <div className="bg-[#FAF8F5] border border-[#EBE6DD] p-3 rounded-xl">
                            <span className="text-[10px] font-bold text-[#2C2A29] block mb-1">
                              ⚠️ Copy Your Recovery Emergency Keys:
                            </span>
                            <div className="grid grid-cols-2 gap-1 font-mono text-[9px] text-[#5C5753]">
                              {recoveryCodes.map((code, idx) => (
                                <div key={idx} className="bg-[#EBE6DD] px-1.5 py-0.5 rounded text-center">
                                  {code}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex justify-between items-center pt-2">
                          <button
                            onClick={() => {
                              setMfaChallengePassed(false);
                              setMfaChallengeInput("");
                              setShowSettings(false);
                            }}
                            className="text-xs text-[#5C5753] hover:text-[#2C2A29] bg-[#EBE6DD] hover:bg-[#E2DCD3] px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                          >
                            <Lock className="w-3.5 h-3.5" />
                            Lock App Now
                          </button>
                          
                          <button
                            onClick={handleDisableMfa}
                            className="text-xs text-rose-600 hover:text-rose-700 font-semibold cursor-pointer"
                          >
                            Disable MFA Lock
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Encrypted E2EE Workspace */}
                  <div className="bg-white border border-[#EBE6DD] rounded-2xl p-4 shadow-sm">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-sm font-bold text-[#2C2A29]">E2EE Workspace</h4>
                      <button
                        onClick={() => setEncryptionEnabled(!encryptionEnabled)}
                        className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          encryptionEnabled ? "bg-[#D96B43]" : "bg-[#EBE6DD]"
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            encryptionEnabled ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>

                    <div className="space-y-4 text-xs text-[#5C5753]">
                      <p className="leading-relaxed">
                        Symmetric client-side encryption processes messages with a passcode <b>before</b> local cache buffering.
                      </p>

                      {encryptionEnabled && (
                        <div className="bg-[#FAF8F5] border border-[#EBE6DD] p-3.5 rounded-xl space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold text-[#2C2A29] uppercase">
                              Symmetric Crypt Key
                            </span>
                            <button
                              onClick={() => setShowKeyEditor(!showKeyEditor)}
                              className="text-[10px] text-[#D96B43] hover:underline cursor-pointer"
                            >
                              {showKeyEditor ? "Done" : "Edit Key"}
                            </button>
                          </div>

                          {showKeyEditor ? (
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={encryptionKey}
                                onChange={(e) => {
                                  setEncryptionKey(e.target.value);
                                  localStorage.setItem("best_friend_encryption_key", e.target.value);
                                }}
                                className="flex-1 bg-white border border-[#EBE6DD] rounded-lg px-2.5 py-1 text-xs font-mono"
                              />
                            </div>
                          ) : (
                            <code className="block bg-[#EBE6DD] text-[#2C2A29] p-2 rounded text-[11px] font-mono truncate">
                              🔑 {encryptionKey}
                            </code>
                          )}

                          <div className="flex items-center justify-between border-t border-[#EBE6DD] pt-3">
                            <span className="text-[10px] font-bold text-[#2C2A29] uppercase">
                              Display Mode
                            </span>
                            
                            <button
                              onClick={() => setShowDecrypted(!showDecrypted)}
                              className="bg-white border border-[#EBE6DD] hover:bg-[#FAF8F5] text-[11px] font-semibold text-[#2C2A29] px-2.5 py-1 rounded-lg cursor-pointer flex items-center gap-1.5 transition-all"
                            >
                              {showDecrypted ? (
                                <>
                                  <Unlock className="w-3 h-3 text-[#D96B43]" />
                                  <span>Show Decrypted</span>
                                </>
                              ) : (
                                <>
                                  <Lock className="w-3 h-3 text-rose-600" />
                                  <span>Show Encrypted</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* CATEGORY: Integrations */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-[#8C857E] uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5" />
                    Integrations
                  </h3>
                  
                  <div className="bg-white border border-[#EBE6DD] rounded-2xl p-4 shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-[#EBE6DD] flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4 text-[#8C857E]" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-[#2C2A29]">Google Tasks</h4>
                        <p className="text-[10px] text-[#8C857E]">Sync actionable items</p>
                      </div>
                    </div>
                    <button className="text-xs bg-[#EBE6DD] text-[#5C5753] px-3 py-1.5 rounded-full font-medium" disabled>
                      Connect
                    </button>
                  </div>

                  <div className="bg-white border border-[#EBE6DD] rounded-2xl p-4 shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-[#EBE6DD] flex items-center justify-center">
                        <MessageSquare className="w-4 h-4 text-[#8C857E]" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-[#2C2A29]">Google Chat</h4>
                        <p className="text-[10px] text-[#8C857E]">Mirror conversations</p>
                      </div>
                    </div>
                    <button className="text-xs bg-[#EBE6DD] text-[#5C5753] px-3 py-1.5 rounded-full font-medium" disabled>
                      Connect
                    </button>
                  </div>
                </div>

                {/* CATEGORY: Data Management */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-[#8C857E] uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Download className="w-3.5 h-3.5" />
                    Data Management
                  </h3>
                  
                  <div className="bg-white border border-[#EBE6DD] rounded-2xl p-4 shadow-sm space-y-3">
                    <button
                      onClick={handleExportBackup}
                      className="w-full bg-[#FAF8F5] border border-[#EBE6DD] hover:bg-[#E2DCD3] text-xs font-semibold py-2.5 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 text-[#2C2A29]"
                    >
                      <Download className="w-4 h-4 text-[#D96B43]" />
                      Export Secure Audit Backup (.json)
                    </button>

                    {showClearConfirm ? (
                      <div className="bg-[#FAF0E6] p-3 rounded-xl border border-[#F3D9C9] space-y-2.5">
                        <p className="text-[10px] text-[#2C2A29] font-bold text-center">
                          ⚠️ Are you absolutely sure? This will wipe your secure chat keys, verification seeds, and erase Sunny's memory forever.
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => { wipeAllData(); setShowSettings(false); }}
                            className="bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold py-2 px-3 rounded-lg flex-1 cursor-pointer transition-colors"
                          >
                            Yes, Wipe Cache
                          </button>
                          <button
                            onClick={() => setShowClearConfirm(false)}
                            className="bg-white border border-[#EBE6DD] text-[10px] font-semibold text-[#2C2A29] py-2 px-3 rounded-lg flex-1 cursor-pointer hover:bg-[#FAF8F5] transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowClearConfirm(true)}
                        className="w-full bg-white border border-rose-200 hover:bg-rose-50 text-xs font-semibold py-2.5 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 text-rose-600"
                      >
                        <Trash2 className="w-4 h-4" />
                        Shred Chats & Clear Memory
                      </button>
                    )}
                  </div>
                </div>

              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
"""

content = content.replace('      {/* Footer */}', slide_over + '\n      {/* Footer */}')

with open('src/App.tsx', 'w') as f:
    f.write(content)

