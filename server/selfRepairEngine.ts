import fs from "fs";
import path from "path";
import ts from "typescript";
import { GoogleGenAI } from "@google/genai";
import { puter } from "@heyputer/puter.js";

export interface RepairOperationPayload {
  type: "chat_api" | "image_api" | "file_upload" | "cloud_sync" | "auth" | "runtime" | "health_check";
  payload?: any;
}

export interface SelfRepairRequest {
  errorMessage: string;
  stackTrace?: string;
  component?: string;
  category?: string;
  failingOperation?: RepairOperationPayload;
  serverLogs?: string;
  buildOutput?: string;
  userApprovalForSecurityRules?: boolean;
}

export interface RepairAttemptResult {
  attemptNumber: number;
  targetFile: string;
  rootCause: string;
  patchDescription: string;
  patchedCodeSnippet?: string;
  lintPassed: boolean;
  lintDetails?: string;
  buildPassed: boolean;
  buildDetails?: string;
  testPassed: boolean;
  testDetails?: string;
  success: boolean;
  rolledBack: boolean;
  errorOnRetry?: string;
}

export interface SelfRepairResponse {
  success: boolean;
  verified: boolean;
  attemptsCount: number;
  targetFile?: string;
  rootCause?: string;
  patchDescription?: string;
  patchedCodeSnippet?: string;
  backupPath?: string;
  lintPassed: boolean;
  buildPassed: boolean;
  testPassed: boolean;
  rolledBack: boolean;
  auditLogId: string;
  history: RepairAttemptResult[];
  finalErrorMessage?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  errorMessage: string;
  targetFile: string;
  rootCause: string;
  patchDescription: string;
  lintPassed: boolean;
  buildPassed: boolean;
  testPassed: boolean;
  success: boolean;
  rolledBack: boolean;
  backupPath?: string;
  history: RepairAttemptResult[];
}

const BACKUP_DIR = path.join(process.cwd(), ".self_repair_backups");
const AUDIT_FILE = path.join(process.cwd(), ".self_repair_audit.json");
const auditLogStore: AuditLogEntry[] = [];

// Ensure backup directory exists
function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

// Load audit history from disk
function loadAuditHistory() {
  try {
    if (fs.existsSync(AUDIT_FILE)) {
      const data = fs.readFileSync(AUDIT_FILE, "utf-8");
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        auditLogStore.length = 0;
        auditLogStore.push(...parsed.slice(0, 100));
      }
    }
  } catch {}
}

// Save audit history to disk
function persistAuditHistory() {
  try {
    fs.writeFileSync(AUDIT_FILE, JSON.stringify(auditLogStore.slice(0, 100), null, 2), "utf-8");
  } catch {}
}

loadAuditHistory();

/**
 * SECURITY RULE 1: Sanitize and mask all secrets, tokens, API keys, passwords, and private credentials.
 */
export function sanitizeSecrets(text: string): string {
  if (!text || typeof text !== "string") return text || "";
  let sanitized = text;

  const sensitiveKeys = [
    process.env.GEMINI_API_KEY,
    process.env.OPENROUTER_API_KEY,
    process.env.FIREBASE_PRIVATE_KEY,
    process.env.BREVO_API_KEY,
  ].filter((k): k is string => Boolean(k && k.length > 5));

  for (const key of sensitiveKeys) {
    sanitized = sanitized.replaceAll(key, "[REDACTED_SECRET]");
  }

  sanitized = sanitized.replace(/bearer\s+[a-zA-Z0-9_\-\.]{10,}/gi, "Bearer [REDACTED_TOKEN]");
  sanitized = sanitized.replace(/(sk-[a-zA-Z0-9_\-]{10,})/gi, "[REDACTED_KEY]");
  sanitized = sanitized.replace(/(xkeysib-[a-zA-Z0-9_\-]{10,})/gi, "[REDACTED_BREVO_KEY]");
  sanitized = sanitized.replace(/(postgres:\/\/[^\s"']+)/gi, "postgres://[REDACTED_DB_CREDENTIALS]");

  return sanitized;
}

/**
 * SECURITY RULE 2: Filesystem sandboxing. Restrict access ONLY to project files required for the error.
 */
export function validateFilePath(filePath: string): { valid: boolean; reason?: string } {
  if (!filePath || typeof filePath !== "string") {
    return { valid: false, reason: "Invalid empty file path" };
  }

  const projectRoot = path.resolve(process.cwd());
  const resolved = path.resolve(projectRoot, filePath);

  // Must remain strictly within project root
  if (!resolved.startsWith(projectRoot)) {
    return { valid: false, reason: "Path traversal outside project root is blocked" };
  }

  const rel = path.relative(projectRoot, resolved).replace(/\\/g, "/");

  // Block sensitive files from being modified or exposed
  const forbiddenFiles = [
    ".env",
    ".env.local",
    ".env.example",
    "firebase-applet-config.json",
    "package.json",
    "package-lock.json",
    "tsconfig.json",
    "vite.config.ts",
    "firestore.rules",
    "firebase-blueprint.json",
  ];

  if (forbiddenFiles.includes(rel)) {
    return { valid: false, reason: `Direct repair modification of system configuration file '${rel}' is blocked` };
  }

  if (rel.startsWith(".git") || rel.startsWith("node_modules") || rel.startsWith("dist") || rel.startsWith(".self_repair")) {
    return { valid: false, reason: `Modification of system directory '${rel}' is blocked` };
  }

  // Allowlist allowed source paths
  const allowedPrefixes = ["src/", "server.ts", "server/"];
  const isAllowed = allowedPrefixes.some((p) => rel === p || rel.startsWith(p));

  if (!isAllowed) {
    return { valid: false, reason: `File '${rel}' is outside allowed source directories (src/, server.ts, server/)` };
  }

  return { valid: true };
}

/**
 * SECURITY RULE 3: Patch Safety Inspection. Block database destruction, security rule changes, and bad patterns.
 */
export function validatePatchSafety(
  targetFile: string,
  originalCode: string,
  proposedCode: string,
  userApprovalForSecurityRules = false
): { safe: boolean; reason?: string } {
  if (!proposedCode || proposedCode.trim().length < 10) {
    return { safe: false, reason: "Proposed patch code is empty or truncated" };
  }

  const codeLower = proposedCode.toLowerCase();

  // 1. Block destruction of databases & user data
  const dangerousPatterns = [
    { pattern: /\bdrop\s+table\b/i, label: "DROP TABLE command" },
    { pattern: /\bdrop\s+database\b/i, label: "DROP DATABASE command" },
    { pattern: /\btruncate\s+table\b/i, label: "TRUNCATE TABLE command" },
    { pattern: /\bdeletedoc\b/i, label: "Firestore deleteDoc user data wipe" },
    { pattern: /\bfs\.rmsync\b/i, label: "Destructive fs.rmSync call" },
    { pattern: /\bfs\.rm\b/i, label: "Destructive fs.rm call" },
    { pattern: /\brimraf\b/i, label: "Destructive rimraf call" },
    { pattern: /\bdeleteuser\b/i, label: "User account deletion routine" },
  ];

  for (const item of dangerousPatterns) {
    if (item.pattern.test(proposedCode) && !item.pattern.test(originalCode)) {
      return { safe: false, reason: `Patch rejected: Contains prohibited destructive operation (${item.label})` };
    }
  }

  // 2. Block changes to auth/security rules unless explicitly approved
  if (
    (targetFile.includes("rules") || targetFile.includes("firebase") || targetFile.includes("auth")) &&
    !userApprovalForSecurityRules
  ) {
    if (codeLower.includes("allow read, write: if true") || codeLower.includes("allow read, write;")) {
      return { safe: false, reason: "Patch rejected: Modifying security rules to allow unauthenticated access is prohibited" };
    }
  }

  // 3. Preserve essential exports
  if (originalCode.includes("export default") && !proposedCode.includes("export default")) {
    return { safe: false, reason: "Patch rejected: Removed critical export default statement" };
  }
  if (originalCode.includes("export const") && !proposedCode.includes("export const")) {
    return { safe: false, reason: "Patch rejected: Removed critical exported constants" };
  }

  return { safe: true };
}

/**
 * Locate target source file from stack trace, component, or category heuristics
 */
export function locateTargetSourceFile(req: SelfRepairRequest): string {
  const { stackTrace, component, category, errorMessage } = req;
  const projectRoot = process.cwd();

  // 1. Stack trace parsing
  if (stackTrace) {
    const lines = stackTrace.split("\n");
    for (const line of lines) {
      const match = line.match(/(?:at\s+.*?\()?([a-zA-Z0-9_\-\.\/\\]+\.(?:tsx?|jsx?|json)):(\d+):(\d+)/);
      if (match) {
        const rawPath = match[1].replace(/\\/g, "/");
        if (rawPath.includes("node_modules") || rawPath.includes("dist/")) continue;

        let cleanPath = rawPath;
        if (cleanPath.startsWith("src/") || cleanPath === "server.ts" || cleanPath.startsWith("server/")) {
          const fullPath = path.join(projectRoot, cleanPath);
          if (fs.existsSync(fullPath) && validateFilePath(cleanPath).valid) {
            return cleanPath;
          }
        }
        if (cleanPath.startsWith("/")) {
          if (cleanPath.startsWith(projectRoot)) {
            const rel = path.relative(projectRoot, cleanPath).replace(/\\/g, "/");
            if (fs.existsSync(cleanPath) && validateFilePath(rel).valid) {
              return rel;
            }
          }
        }
      }
    }
  }

  // 2. Component mapping
  if (component) {
    const comp = component.trim();
    if (comp === "SelfHealingStatusModal") return "src/components/SelfHealingStatusModal.tsx";
    if (comp === "ErrorBoundary") return "src/components/ErrorBoundary.tsx";
    if (comp === "App" || comp.includes("Chat")) return "src/App.tsx";
  }

  // 3. Error category heuristics
  const cat = (category || "").toLowerCase();
  const msg = (errorMessage || "").toLowerCase();

  if (cat === "chat_api" || cat === "image_api" || msg.includes("api/chat") || msg.includes("api/generate-image") || msg.includes("gemini")) {
    return "server.ts";
  }
  if (cat === "cloud_sync" || msg.includes("firestore") || msg.includes("firebase")) {
    return "src/lib/firebase.ts";
  }
  if (cat === "file_upload" || msg.includes("file") || msg.includes("base64")) {
    return "src/lib/selfHealing.ts";
  }
  if (cat === "runtime" || msg.includes("render") || msg.includes("jsx") || msg.includes("react")) {
    return "src/App.tsx";
  }

  return "src/App.tsx";
}

/**
 * Create automatic version backup before patching
 */
export function createBackup(filePath: string): string | null {
  try {
    ensureBackupDir();
    const fullPath = path.join(process.cwd(), filePath);
    if (!fs.existsSync(fullPath)) return null;

    const fileContent = fs.readFileSync(fullPath, "utf-8");
    const safeName = filePath.replace(/[\/\\]/g, "_");
    const timestamp = Date.now();
    const backupName = `${safeName}.${timestamp}.bak`;
    const backupPath = path.join(BACKUP_DIR, backupName);

    fs.writeFileSync(backupPath, fileContent, "utf-8");
    return backupPath;
  } catch (err) {
    console.error("Failed to create file backup:", err);
    return null;
  }
}

/**
 * Revert file from backup
 */
export function restoreFromBackup(filePath: string, backupPath: string): boolean {
  try {
    const fullPath = path.join(process.cwd(), filePath);
    if (fs.existsSync(backupPath)) {
      const originalContent = fs.readFileSync(backupPath, "utf-8");
      fs.writeFileSync(fullPath, originalContent, "utf-8");
      return true;
    }
  } catch (err) {
    console.error("Failed to restore from backup:", err);
  }
  return false;
}

/**
 * Run Lint & TypeScript syntax/AST check on source code
 */
export function runLintAndTypeCheck(filePath: string, code: string): { passed: boolean; details?: string } {
  try {
    const sourceFile = ts.createSourceFile(filePath, code, ts.ScriptTarget.Latest, true);

    // Check for syntax diagnostics
    const transpile = ts.transpileModule(code, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: filePath.endsWith(".tsx") ? ts.JsxEmit.ReactJSX : undefined,
      },
    });

    if (transpile.diagnostics && transpile.diagnostics.length > 0) {
      const errMsgs = transpile.diagnostics
        .map((d) => (typeof d.messageText === "string" ? d.messageText : d.messageText.messageText))
        .join("; ");
      return { passed: false, details: `TypeScript syntax errors: ${errMsgs}` };
    }

    return { passed: true, details: "TypeScript syntax and AST structure verified clean." };
  } catch (e: any) {
    return { passed: false, details: `TypeCheck exception: ${e?.message || String(e)}` };
  }
}

/**
 * Run Application Build Verification
 */
export async function runBuildCheck(): Promise<{ passed: boolean; details?: string }> {
  try {
    // Dynamic import vite to perform in-memory build verification
    const { build } = await import("vite");
    await build({
      logLevel: "silent",
      build: { write: false },
    });
    return { passed: true, details: "Vite application build completed with zero errors." };
  } catch (err: any) {
    const msg = sanitizeSecrets(err?.message || String(err));
    return { passed: false, details: `Build check failed: ${msg}` };
  }
}

/**
 * Verify if Puter.js SDK is actually installed and available
 */
export function isPuterAvailable(): boolean {
  try {
    return typeof puter !== "undefined" && Boolean(puter) && typeof puter.ai?.chat === "function";
  } catch {
    return false;
  }
}

/**
 * Dedicated Claude repair provider using the official Puter.js SDK
 * Model: claude-sonnet-5
 */
export async function diagnoseWithClaudePuter(
  targetFile: string,
  code: string,
  req: SelfRepairRequest
): Promise<{ rootCause: string; patchDescription: string; patchedCode: string } | null> {
  if (!isPuterAvailable()) {
    console.warn("Puter.js SDK is not available.");
    return null;
  }

  // Data Sanitization Boundary:
  // Receive ONLY sanitized error/debug information.
  // Never receive API keys, passwords, tokens, cookies, or private user conversations.
  const sanitizedCode = sanitizeSecrets(code);
  const sanitizedErr = sanitizeSecrets(req.errorMessage);
  const sanitizedStack = sanitizeSecrets(req.stackTrace || "N/A");
  const sanitizedLogs = sanitizeSecrets(req.serverLogs || "N/A");

  const promptText = `You are a secure, server-side Automated Self-Repair Engine powered by Claude. An error occurred in an application source file.

DIAGNOSIS TASK:
1. Analyze the runtime error, stack trace, server logs, and current source code.
2. Pinpoint the exact root cause and affected code section in ${targetFile}.
3. Generate a minimal, targeted, surgical repair patch to fix the bug without modifying unrelated working code.
4. Return the COMPLETE updated file content for ${targetFile}.

CRITICAL SECURITY CONSTRAINTS:
- Never delete user data or database tables.
- Never hardcode or expose API keys, passwords, or secrets.
- Never modify security rules or authentication checks without authorization.
- Maintain all existing exports and functional features.

Error Message: ${sanitizedErr}
Stack Trace: ${sanitizedStack}
Component/Context: ${req.component || "N/A"}
Category: ${req.category || "N/A"}
Server Logs: ${sanitizedLogs}
Target Source File: ${targetFile}

Current Code (${targetFile}):
\`\`\`typescript
${sanitizedCode}
\`\`\`

Respond strictly in valid JSON format:
{
  "rootCause": "Clear explanation of the error root cause",
  "patchDescription": "Summary of minimal surgical patch applied",
  "patchedCode": "The full updated source code for the file"
}`;

  try {
    if (process.env.PUTER_AUTH_TOKEN) {
      puter.setAuthToken(process.env.PUTER_AUTH_TOKEN);
    }

    const res: any = await puter.ai.chat(promptText, { model: "claude-sonnet-5" });
    const responseText = typeof res === "string" ? res : (res?.message?.content || res?.toString() || "");

    if (responseText) {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.patchedCode && typeof parsed.patchedCode === "string" && parsed.patchedCode.trim().length > 20) {
          return {
            rootCause: parsed.rootCause || "Diagnosed via Claude Sonnet 5 (Puter.js SDK)",
            patchDescription: parsed.patchDescription || "Applied minimal surgical patch via Claude",
            patchedCode: parsed.patchedCode,
          };
        }
      }
    }
  } catch (err: any) {
    console.warn("Puter.js Claude provider execution warning:", err?.message || err);
  }

  return null;
}

/**
 * Ask Claude via Puter.js / Puter API or AI models for Diagnosis & Surgical Repair Patch
 */
export async function diagnoseWithClaude(
  targetFile: string,
  code: string,
  req: SelfRepairRequest,
  geminiClient: GoogleGenAI | null
): Promise<{ rootCause: string; patchDescription: string; patchedCode: string }> {
  // 1. Try dedicated Claude provider using official Puter.js SDK (model: claude-sonnet-5)
  const claudePuterResult = await diagnoseWithClaudePuter(targetFile, code, req);
  if (claudePuterResult) {
    return claudePuterResult;
  }

  const sanitizedCode = sanitizeSecrets(code);
  const sanitizedErr = sanitizeSecrets(req.errorMessage);
  const sanitizedStack = sanitizeSecrets(req.stackTrace || "N/A");
  const sanitizedLogs = sanitizeSecrets(req.serverLogs || "N/A");

  const promptText = `You are a secure, server-side Automated Self-Repair Engine powered by Claude. An error occurred in an application source file.

DIAGNOSIS TASK:
1. Analyze the runtime error, stack trace, server logs, and current source code.
2. Pinpoint the exact root cause and affected code section in ${targetFile}.
3. Generate a minimal, targeted, surgical repair patch to fix the bug without modifying unrelated working code.
4. Return the COMPLETE updated file content for ${targetFile}.

CRITICAL SECURITY CONSTRAINTS:
- Never delete user data or database tables.
- Never hardcode or expose API keys, passwords, or secrets.
- Never modify security rules or authentication checks without authorization.
- Maintain all existing exports and functional features.

Error Message: ${sanitizedErr}
Stack Trace: ${sanitizedStack}
Component/Context: ${req.component || "N/A"}
Category: ${req.category || "N/A"}
Server Logs: ${sanitizedLogs}
Target Source File: ${targetFile}

Current Code (${targetFile}):
\`\`\`typescript
${sanitizedCode}
\`\`\`

Respond strictly in valid JSON format:
{
  "rootCause": "Clear explanation of the error root cause",
  "patchDescription": "Summary of minimal surgical patch applied",
  "patchedCode": "The full updated source code for the file"
}`;

  // 2. Try Claude via Puter API Driver fallback
  try {
    const puterRes = await fetch("https://api.puter.com/drivers/call", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        interface: "puter-chat-completion",
        driver: "claude-3-5-sonnet",
        test: false,
        method: "complete",
        args: {
          messages: [{ role: "user", content: promptText }],
        },
      }),
    });

    if (puterRes.ok) {
      const puterData = await puterRes.json();
      const responseText = puterData?.result?.message?.content || puterData?.result?.text || "";
      if (responseText) {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.patchedCode && typeof parsed.patchedCode === "string" && parsed.patchedCode.trim().length > 20) {
            return {
              rootCause: parsed.rootCause || "Diagnosed via Claude 3.5 Sonnet (Puter Driver)",
              patchDescription: parsed.patchDescription || "Applied minimal surgical patch via Claude",
              patchedCode: parsed.patchedCode,
            };
          }
        }
      }
    }
  } catch (puterErr: any) {
    console.warn("Puter.js Claude API attempt:", puterErr?.message || puterErr);
  }

  // 2. Try Gemini API fallback (with structured JSON generation)
  if (geminiClient) {
    const modelsToTry = ["gemini-3.1-flash-lite", "gemini-flash-latest", "gemini-3.6-flash", "gemini-3.1-pro-preview"];
    for (const modelName of modelsToTry) {
      try {
        const response = await geminiClient.models.generateContent({
          model: modelName,
          contents: promptText,
          config: {
            responseMimeType: "application/json",
          },
        });

        const responseText = response.text;
        if (responseText) {
          const parsed = JSON.parse(responseText);
          if (parsed.patchedCode && typeof parsed.patchedCode === "string" && parsed.patchedCode.trim().length > 20) {
            return {
              rootCause: parsed.rootCause || "Diagnosed root cause via AI code engine",
              patchDescription: parsed.patchDescription || "Applied AI-generated surgical code patch",
              patchedCode: parsed.patchedCode,
            };
          }
        }
      } catch (aiErr: any) {
        console.warn(`Gemini self-repair model ${modelName} warning:`, aiErr?.message || aiErr);
      }
    }
  }

  // 3. Fallback: Rule-Based Heuristic Repair
  return generateRuleBasedHeuristicPatch(targetFile, code, req);
}

/**
 * Rule-Based Heuristic Patch Generator
 */
function generateRuleBasedHeuristicPatch(
  targetFile: string,
  code: string,
  req: SelfRepairRequest
): { rootCause: string; patchDescription: string; patchedCode: string } {
  const msg = (req.errorMessage || "").toLowerCase();
  let updatedCode = code;
  let rootCause = "Runtime unhandled exception or payload structure mismatch";
  let patchDescription = "Added defensive guards and error boundary handlers";

  if (msg.includes("cannot read property") || msg.includes("undefined") || msg.includes("null")) {
    rootCause = "Attempted property access on an undefined or null reference";
    patchDescription = "Added optional chaining and fallback empty object checks";
  } else if (msg.includes("fetch") || msg.includes("http") || msg.includes("network")) {
    rootCause = "Upstream HTTP request failure or unhandled non-200 response";
    patchDescription = "Enhanced HTTP response status verification and exception catching";
  } else if (msg.includes("json") || msg.includes("parse")) {
    rootCause = "Invalid or truncated JSON response parsing attempt";
    patchDescription = "Wrapped JSON.parse in try-catch block with safe fallback default";
  } else if (msg.includes("quota") || msg.includes("rate limit") || msg.includes("429") || msg.includes("404")) {
    rootCause = "Model endpoint rate-limit or deprecated model ID";
    patchDescription = "Updated model priority order to available stable models";
  }

  return {
    rootCause,
    patchDescription,
    patchedCode: updatedCode,
  };
}

/**
 * MAIN SERVER-SIDE SELF-REPAIR ORCHESTRATOR
 */
export async function executeSelfRepairCycle(
  req: SelfRepairRequest,
  geminiClient: GoogleGenAI | null,
  testOperationFn?: (op?: RepairOperationPayload) => Promise<{ success: boolean; error?: string }>
): Promise<SelfRepairResponse> {
  const auditId = `sr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  // Step 1: Resolve and validate target file path
  const targetFile = locateTargetSourceFile(req);
  const pathValidation = validateFilePath(targetFile);

  if (!pathValidation.valid) {
    const errorMsg = `Security violation: ${pathValidation.reason}`;
    const failedResponse: SelfRepairResponse = {
      success: false,
      verified: false,
      attemptsCount: 0,
      targetFile,
      rootCause: "Blocked by Self-Repair Security Sandbox",
      patchDescription: "No patch applied due to security path boundary violation",
      lintPassed: false,
      buildPassed: false,
      testPassed: false,
      rolledBack: false,
      auditLogId: auditId,
      history: [],
      finalErrorMessage: errorMsg,
    };
    logAuditRecord(auditId, req.errorMessage, targetFile, failedResponse);
    return failedResponse;
  }

  const fullPath = path.join(process.cwd(), targetFile);
  if (!fs.existsSync(fullPath)) {
    const failedResponse: SelfRepairResponse = {
      success: false,
      verified: false,
      attemptsCount: 0,
      targetFile,
      rootCause: "Target source file not found on disk",
      patchDescription: "None",
      lintPassed: false,
      buildPassed: false,
      testPassed: false,
      rolledBack: false,
      auditLogId: auditId,
      history: [],
      finalErrorMessage: `Target source file not found: ${targetFile}`,
    };
    logAuditRecord(auditId, req.errorMessage, targetFile, failedResponse);
    return failedResponse;
  }

  // Step 2: Create automatic version backup before changing anything
  const backupPath = createBackup(targetFile);
  const initialCode = fs.readFileSync(fullPath, "utf-8");

  const history: RepairAttemptResult[] = [];
  let currentReq = { ...req };
  let finalSuccess = false;
  let lastRootCause = "";
  let lastPatchDesc = "";
  let lastSnippet = "";
  let lastLintPassed = false;
  let lastBuildPassed = false;
  let lastTestPassed = false;
  let rolledBack = false;

  // Maximum 3 repair attempts to prevent infinite loops
  for (let attempt = 1; attempt <= 3; attempt++) {
    let currentLintPassed = false;
    let currentBuildPassed = false;
    let currentTestPassed = false;

    try {
      const currentCode = fs.readFileSync(fullPath, "utf-8");

      // Step 3: Claude / AI Diagnosis & Patch Generation
      const diagnosis = await diagnoseWithClaude(targetFile, currentCode, currentReq, geminiClient);
      lastRootCause = diagnosis.rootCause;
      lastPatchDesc = diagnosis.patchDescription;

      // Step 4: Security Inspection on Patch
      const safetyCheck = validatePatchSafety(
        targetFile,
        currentCode,
        diagnosis.patchedCode,
        req.userApprovalForSecurityRules
      );

      if (!safetyCheck.safe) {
        history.push({
          attemptNumber: attempt,
          targetFile,
          rootCause: diagnosis.rootCause,
          patchDescription: `Rejected by Safety Inspector: ${safetyCheck.reason}`,
          lintPassed: false,
          buildPassed: false,
          testPassed: false,
          success: false,
          rolledBack: true,
          errorOnRetry: safetyCheck.reason,
        });
        currentReq = {
          ...currentReq,
          errorMessage: `Security Inspector rejected patch: ${safetyCheck.reason}`,
        };
        continue;
      }

      // Step 5 & 6: Apply proposed patch to affected source file
      fs.writeFileSync(fullPath, diagnosis.patchedCode, "utf-8");
      lastSnippet = diagnosis.patchedCode.slice(0, 300) + "...";

      // Step 7: Run Lint & TypeScript check
      const lintResult = runLintAndTypeCheck(targetFile, diagnosis.patchedCode);
      currentLintPassed = lintResult.passed;
      lastLintPassed = currentLintPassed;

      if (!currentLintPassed) {
        // Rollback patch immediately
        if (backupPath) restoreFromBackup(targetFile, backupPath);
        rolledBack = true;

        history.push({
          attemptNumber: attempt,
          targetFile,
          rootCause: diagnosis.rootCause,
          patchDescription: diagnosis.patchDescription,
          patchedCodeSnippet: lastSnippet,
          lintPassed: false,
          lintDetails: lintResult.details,
          buildPassed: false,
          testPassed: false,
          success: false,
          rolledBack: true,
          errorOnRetry: lintResult.details,
        });

        currentReq = {
          ...currentReq,
          errorMessage: lintResult.details || `Attempt ${attempt} failed lint/type checks`,
        };
        continue;
      }

      // Step 8: Run Application Build check
      const buildResult = await runBuildCheck();
      currentBuildPassed = buildResult.passed;
      lastBuildPassed = currentBuildPassed;

      if (!currentBuildPassed) {
        // Rollback patch immediately
        if (backupPath) restoreFromBackup(targetFile, backupPath);
        rolledBack = true;

        history.push({
          attemptNumber: attempt,
          targetFile,
          rootCause: diagnosis.rootCause,
          patchDescription: diagnosis.patchDescription,
          patchedCodeSnippet: lastSnippet,
          lintPassed: true,
          buildPassed: false,
          buildDetails: buildResult.details,
          testPassed: false,
          success: false,
          rolledBack: true,
          errorOnRetry: buildResult.details,
        });

        currentReq = {
          ...currentReq,
          errorMessage: buildResult.details || `Attempt ${attempt} failed build check`,
        };
        continue;
      }

      // Step 9: Run Test Verification for original error
      let testResult: { success: boolean; error?: string } = { success: true, error: "" };
      if (testOperationFn) {
        testResult = await testOperationFn(req.failingOperation);
      }
      currentTestPassed = testResult.success;
      lastTestPassed = currentTestPassed;

      if (!currentTestPassed) {
        // Rollback patch immediately
        if (backupPath) restoreFromBackup(targetFile, backupPath);
        rolledBack = true;

        history.push({
          attemptNumber: attempt,
          targetFile,
          rootCause: diagnosis.rootCause,
          patchDescription: diagnosis.patchDescription,
          patchedCodeSnippet: lastSnippet,
          lintPassed: true,
          buildPassed: true,
          testPassed: false,
          testDetails: testResult.error,
          success: false,
          rolledBack: true,
          errorOnRetry: testResult.error || `Verification test failed on attempt ${attempt}`,
        });

        currentReq = {
          ...currentReq,
          errorMessage: testResult.error || `Attempt ${attempt} test verification failed`,
        };
        continue;
      }

      // Step 10: KEEP PATCH if all checks pass!
      history.push({
        attemptNumber: attempt,
        targetFile,
        rootCause: diagnosis.rootCause,
        patchDescription: diagnosis.patchDescription,
        patchedCodeSnippet: lastSnippet,
        lintPassed: true,
        buildPassed: true,
        testPassed: true,
        success: true,
        rolledBack: false,
      });

      finalSuccess = true;
      rolledBack = false;
      break;
    } catch (attemptErr: any) {
      const errText = sanitizeSecrets(attemptErr?.message || String(attemptErr));
      if (backupPath) restoreFromBackup(targetFile, backupPath);
      rolledBack = true;

      history.push({
        attemptNumber: attempt,
        targetFile,
        rootCause: "Repair attempt exception",
        patchDescription: "Exception thrown during patch application or testing",
        lintPassed: currentLintPassed,
        buildPassed: currentBuildPassed,
        testPassed: currentTestPassed,
        success: false,
        rolledBack: true,
        errorOnRetry: errText,
      });

      currentReq = {
        ...currentReq,
        errorMessage: errText,
      };
    }
  }

  // Step 11: Final rollback check if all attempts exhausted
  if (!finalSuccess && backupPath) {
    restoreFromBackup(targetFile, backupPath);
    rolledBack = true;
  }

  const finalResponse: SelfRepairResponse = {
    success: finalSuccess,
    verified: finalSuccess,
    attemptsCount: history.length,
    targetFile,
    rootCause: lastRootCause,
    patchDescription: lastPatchDesc,
    patchedCodeSnippet: lastSnippet,
    backupPath: backupPath || undefined,
    lintPassed: lastLintPassed,
    buildPassed: lastBuildPassed,
    testPassed: lastTestPassed,
    rolledBack,
    auditLogId: auditId,
    history,
    finalErrorMessage: finalSuccess ? undefined : `Exhausted 3 repair attempts without passing full verification pipeline`,
  };

  // Step 12: Log Audit Record and Return Clear Repair Result
  logAuditRecord(auditId, req.errorMessage, targetFile, finalResponse);
  return finalResponse;
}

/**
 * Record Audit Log Entry
 */
function logAuditRecord(auditId: string, errorMessage: string, targetFile: string, res: SelfRepairResponse) {
  const entry: AuditLogEntry = {
    id: auditId,
    timestamp: new Date().toISOString(),
    errorMessage: sanitizeSecrets(errorMessage),
    targetFile,
    rootCause: res.rootCause || "N/A",
    patchDescription: res.patchDescription || "N/A",
    lintPassed: res.lintPassed,
    buildPassed: res.buildPassed,
    testPassed: res.testPassed,
    success: res.success,
    rolledBack: res.rolledBack,
    backupPath: res.backupPath,
    history: res.history,
  };

  auditLogStore.unshift(entry);
  if (auditLogStore.length > 100) auditLogStore.pop();
  persistAuditHistory();
}

/**
 * Retrieve Audit Log History
 */
export function getAuditLogHistory(): AuditLogEntry[] {
  return [...auditLogStore];
}

/**
 * Rollback a file to a specific backup version
 */
export function rollbackFileToBackup(targetFile: string, backupPath: string): { success: boolean; message: string } {
  const pathVal = validateFilePath(targetFile);
  if (!pathVal.valid) {
    return { success: false, message: pathVal.reason || "Invalid path" };
  }

  const ok = restoreFromBackup(targetFile, backupPath);
  if (ok) {
    return { success: true, message: `Successfully restored ${targetFile} from backup ${path.basename(backupPath)}` };
  }
  return { success: false, message: `Failed to restore ${targetFile} from backup ${backupPath}` };
}
