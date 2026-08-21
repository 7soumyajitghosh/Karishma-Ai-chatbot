with open('src/App.tsx', 'r') as f:
    content = f.read()

# Fix string templates
content = content.replace('initial="{ x: "100%" }"', 'initial={{ x: "100%" }}')
content = content.replace('animate="{ x: 0 }"', 'animate={{ x: 0 }}')
content = content.replace('exit="{ x: "100%" }"', 'exit={{ x: "100%" }}')
content = content.replace('transition="{ type: "spring", damping: 25, stiffness: 200 }"', 'transition={{ type: "spring", damping: 25, stiffness: 200 }}')

content = content.replace('onClick="{() => setShowSettings(false)}"', 'onClick={() => setShowSettings(false)}')
content = content.replace('onClick="{startMfaSetup}"', 'onClick={startMfaSetup}')
content = content.replace('checked="{retentionPolicy === "session"}"', 'checked={retentionPolicy === "session"}')
content = content.replace('checked="{retentionPolicy === "local"}"', 'checked={retentionPolicy === "local"}')
content = content.replace('checked="{retentionPolicy === "zero"}"', 'checked={retentionPolicy === "zero"}')

content = content.replace('onChange="{() => {', 'onChange={() => {')
content = content.replace('  setRetentionPolicy("session");', '  setRetentionPolicy("session");')
content = content.replace('  localStorage.setItem("best_friend_retention_policy", "session");', '  localStorage.setItem("best_friend_retention_policy", "session");')
content = content.replace('}}" ', '}} ')

import re
content = re.sub(r'onChange="\{\(\) => \{([^}]+)\}\}"', r'onChange={() => {\1}}', content, flags=re.DOTALL)
content = re.sub(r'onClick="\{\(\) => \{([^}]+)\}\}"', r'onClick={() => {\1}}', content, flags=re.DOTALL)
content = content.replace('onClick="{handleVerifyMfaCode}"', 'onClick={handleVerifyMfaCode}')
content = content.replace('onClick="{handleExportBackup}"', 'onClick={handleExportBackup}')
content = content.replace('onClick="{handleDisableMfa}"', 'onClick={handleDisableMfa}')

content = content.replace('maxLength="{6}"', 'maxLength={6}')
content = content.replace('value="{mfaCode}"', 'value={mfaCode}')
content = content.replace('onChange="{(e) => setMfaCode(e.target.value.replace(/\\D/g, ""))}"', 'onChange={(e) => setMfaCode(e.target.value.replace(/\\D/g, ""))}')

content = content.replace('className="{`relative', 'className={`relative')
content = content.replace('className="{`pointer-events-none', 'className={`pointer-events-none')
content = content.replace('}}`}"', '}}`}')

content = content.replace('value="{encryptionKey}"', 'value={encryptionKey}')
content = content.replace('onChange="{(e) => {', 'onChange={(e) => {')


with open('src/App.tsx', 'w') as f:
    f.write(content)

