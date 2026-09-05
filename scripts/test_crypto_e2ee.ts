import {
  generateE2EEKey,
  exportKeyToBase64,
  importKeyFromBase64,
  deriveKeyFromPassphrase,
  encryptPayload,
  decryptPayload,
  isEncrypted,
  formatRecoveryKey,
  parseRecoveryKey,
  ENVELOPE_PREFIX,
} from "../src/lib/crypto";

async function runTests() {
  console.log("=== Running Karishma AI E2EE Cryptographic Security Tests ===\n");
  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string) {
    total++;
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      process.exitCode = 1;
    }
  }

  // Test 1: Key Generation & Base64 Export/Import
  const key1 = await generateE2EEKey();
  const b64Key1 = await exportKeyToBase64(key1);
  assert(typeof b64Key1 === "string" && b64Key1.length > 40, "Key generated and exported to Base64");

  const importedKey1 = await importKeyFromBase64(b64Key1);
  assert(importedKey1.type === "secret" && importedKey1.algorithm.name === "AES-GCM", "Key re-imported correctly as AES-GCM");

  // Test 2: Encrypt and Decrypt Round-Trip
  const sampleMessage = "Hello Karishma! This is a confidential test message with Banglish: ki khobor?";
  const encrypted = await encryptPayload(sampleMessage, importedKey1);
  assert(isEncrypted(encrypted), "Ciphertext envelope has valid prefix (" + ENVELOPE_PREFIX + ")");
  assert(encrypted !== sampleMessage, "Ciphertext is distinct from plaintext");

  const decryptedResult = await decryptPayload(encrypted, importedKey1);
  assert(decryptedResult.success === true, "Decryption succeeded");
  assert(decryptedResult.text === sampleMessage, "Decrypted text exactly matches original plaintext");

  // Test 3: Random IV Nonce Uniqueness (Zero IV Reuse)
  const encryptedSecond = await encryptPayload(sampleMessage, importedKey1);
  assert(encrypted !== encryptedSecond, "Encrypting same message twice produces different ciphertexts (random IV)");

  // Test 4: Tamper Detection (Integrity / Authentication Tag)
  const envelopeBody = encrypted.substring(ENVELOPE_PREFIX.length);
  const [ivPart, ctPart] = envelopeBody.split(":");
  // Flip characters in the ciphertext portion
  const tamperedCt = ctPart.slice(0, 10) + (ctPart[10] === "A" ? "B" : "A") + ctPart.slice(11);
  const tamperedEnvelope = `${ENVELOPE_PREFIX}${ivPart}:${tamperedCt}`;

  const tamperedResult = await decryptPayload(tamperedEnvelope, importedKey1);
  assert(
    tamperedResult.success === false &&
      (tamperedResult.text.includes("Decryption Failed") || tamperedResult.text.includes("Corrupted")),
    "Tampered ciphertext is detected and safely rejected (AES-GCM tag verification)"
  );

  // Test 5: Wrong Key Rejection
  const key2 = await generateE2EEKey();
  const wrongKeyResult = await decryptPayload(encrypted, key2);
  assert(
    wrongKeyResult.success === false && wrongKeyResult.text.includes("Decryption Failed"),
    "Decryption with wrong key is safely rejected"
  );

  // Test 6: Missing Key Handling
  const noKeyResult = await decryptPayload(encrypted, null);
  assert(
    noKeyResult.success === false && noKeyResult.text.includes("Key Required"),
    "Decryption without key safely reports key required without throwing unhandled exception"
  );

  // Test 7: Backward Compatibility with Legacy Plaintext
  const legacyPlaintext = "This is an old plaintext message saved before encryption was enabled.";
  const legacyResult = await decryptPayload(legacyPlaintext, importedKey1);
  assert(
    legacyResult.success === true && legacyResult.text === legacyPlaintext,
    "Legacy plaintext messages are passed through untouched and intact"
  );

  // Test 8: PBKDF2 Passphrase Key Derivation
  const passphrase = "correct horse battery staple 2026!";
  const salt = "karishma_user_salt_abc123";
  const derivedKey1 = await deriveKeyFromPassphrase(passphrase, salt);
  const derivedEncrypted = await encryptPayload("Secret diary entry", derivedKey1);

  const derivedKeySamePass = await deriveKeyFromPassphrase(passphrase, salt);
  const derivedDecryptSuccess = await decryptPayload(derivedEncrypted, derivedKeySamePass);
  assert(
    derivedDecryptSuccess.success && derivedDecryptSuccess.text === "Secret diary entry",
    "PBKDF2-derived key successfully decrypts with identical passphrase"
  );

  const derivedKeyWrongPass = await deriveKeyFromPassphrase("wrong passphrase", salt);
  const derivedDecryptFail = await decryptPayload(derivedEncrypted, derivedKeyWrongPass);
  assert(
    !derivedDecryptFail.success,
    "PBKDF2-derived key with wrong passphrase safely fails to decrypt"
  );

  // Test 9: Recovery Key Formatting and Parsing
  const formatted = formatRecoveryKey(b64Key1);
  assert(formatted.startsWith("KARM-") && formatted.includes("-"), "Recovery key formatted as user-friendly string");
  const parsed = parseRecoveryKey(formatted);
  assert(parsed === b64Key1, "Recovery key parsed back to exact Base64 string");

  // Test 10: Session Wire Payload Simulation (Zero-Knowledge at Rest)
  const plainSession = {
    id: "session-12345",
    title: "Secret medical or financial discussion",
    timestamp: new Date().toISOString(),
    messages: [
      { id: "msg-1", role: "user", text: "I need confidential advice about my budget." },
      { id: "msg-2", role: "model", text: "I'm right here with you. Everything we discuss is encrypted." }
    ]
  };

  // Simulate client-side encryption before save
  const encryptedSession = {
    id: plainSession.id,
    title: "Encrypted Conversation",
    timestamp: plainSession.timestamp,
    messages: await Promise.all(
      plainSession.messages.map(async (m) => ({
        ...m,
        text: await encryptPayload(m.text, importedKey1),
        isEncrypted: true
      }))
    )
  };

  const wirePayloadString = JSON.stringify(encryptedSession);
  assert(!wirePayloadString.includes("confidential advice"), "Wire/DB payload contains zero plaintext from user message");
  assert(!wirePayloadString.includes("budget"), "Wire/DB payload does not leak message keywords");
  assert(!wirePayloadString.includes("Secret medical or financial discussion"), "Wire/DB payload does not leak custom plaintext title");
  assert(encryptedSession.messages.every(m => isEncrypted(m.text)), "All messages in wire payload carry encrypted envelope");

  // Test 11: Wire Payload Client-side Decryption
  const loadedFromRemote = JSON.parse(wirePayloadString);
  const decryptedMessages = await Promise.all(
    loadedFromRemote.messages.map(async (m: any) => {
      const res = await decryptPayload(m.text, importedKey1);
      return { ...m, text: res.text };
    })
  );

  assert(
    decryptedMessages[0].text === plainSession.messages[0].text &&
    decryptedMessages[1].text === plainSession.messages[1].text,
    "Loaded wire payload decrypts on client to exact original messages"
  );

  console.log(`\n=== Test Results: ${passed}/${total} Passed ===`);
  if (passed !== total) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
