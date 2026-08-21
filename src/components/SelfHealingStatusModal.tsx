import React, { useState, useEffect } from "react";
import { selfHealingSystem, ErrorLogEntry } from "../lib/selfHealing";
import {
  Activity,
  ShieldCheck,
  RefreshCw,
  Trash2,
  X,
  CheckCircle,
  AlertTriangle,
  Info,
  Sparkles,
  Database,
  MessageSquare,
  Image as ImageIcon,
  Key,
  Code,
  FileText,
  History,
} from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const SelfHealingStatusModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState<ErrorLogEntry[]>([]);
  const [auditHistory, setAuditHistory] = useState<any[]>([]);
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [healthResult, setHealthResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"logs" | "audit">("logs");

  useEffect(() => {
    if (!isOpen) return;
    const unsub = selfHealingSystem.subscribe((updatedLogs) => {
      setLogs(updatedLogs);
    });
    fetchAuditLogs();
    return () => unsub();
  }, [isOpen]);

  const fetchAuditLogs = async () => {
    try {
      const res = await fetch("/api/self-repair/audit-log");
      if (res.ok) {
        const data = await res.json();
        if (data.history) {
          setAuditHistory(data.history);
        }
      }
    } catch (e) {
      console.warn("Failed to fetch audit log:", e);
    }
  };

  if (!isOpen) return null;

  const handleRunDiagnostics = async () => {
    setIsDiagnosing(true);
    try {
      const result = await selfHealingSystem.runSystemHealthCheck();
      setHealthResult(result);
      await fetchAuditLogs();
    } catch (err) {
      console.error("Health check error:", err);
    } finally {
      setIsDiagnosing(false);
    }
  };

  const handleClearLogs = () => {
    selfHealingSystem.clearLogs();
  };

  const getStatusBadge = (status: ErrorLogEntry["status"]) => {
    switch (status) {
      case "auto_recovered":
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle className="w-3 h-3" />
            <span>Auto-Recovered</span>
          </span>
        );
      case "fallback_applied":
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Sparkles className="w-3 h-3" />
            <span>Fallback Applied</span>
          </span>
        );
      case "retrying":
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <RefreshCw className="w-3 h-3 animate-spin" />
            <span>Retrying...</span>
          </span>
        );
      case "unrecoverable":
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertTriangle className="w-3 h-3" />
            <span>Unrecoverable</span>
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Self-Healing Diagnostics & Self-Repair</h2>
              <p className="text-xs text-slate-400">Automated Error Detection & Claude Self-Repair Monitor</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-900/60 px-6">
          <button
            onClick={() => setActiveTab("logs")}
            className={`py-2.5 px-4 text-xs font-medium border-b-2 transition-colors flex items-center space-x-1.5 ${
              activeTab === "logs"
                ? "border-emerald-500 text-emerald-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Runtime Logs ({logs.length})</span>
          </button>
          <button
            onClick={() => {
              setActiveTab("audit");
              fetchAuditLogs();
            }}
            className={`py-2.5 px-4 text-xs font-medium border-b-2 transition-colors flex items-center space-x-1.5 ${
              activeTab === "audit"
                ? "border-emerald-500 text-emerald-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Server Audit Trail ({auditHistory.length})</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Health Status Bar */}
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <Activity className="w-5 h-5 text-emerald-400" />
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">System Health</span>
                <p className="text-sm font-medium text-emerald-400 flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>100% Protected with Self-Healing & Claude Repair Engine</span>
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleRunDiagnostics}
                disabled={isDiagnosing}
                className="flex items-center space-x-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-all shadow-sm"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isDiagnosing ? "animate-spin" : ""}`} />
                <span>{isDiagnosing ? "Running Diagnostics..." : "Run System Health Check"}</span>
              </button>
            </div>
          </div>

          {/* Diagnostic results if available */}
          {healthResult && (
            <div className="bg-slate-850 border border-slate-700/80 rounded-xl p-4 space-y-3">
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                <span>Diagnostic Results</span>
                <span className="text-emerald-400 capitalize">{healthResult.overallStatus}</span>
              </h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 bg-slate-900 rounded-lg border border-slate-800 flex items-center space-x-2">
                  <MessageSquare className="w-4 h-4 text-emerald-400" />
                  <span className="text-slate-300">{healthResult.details.chat}</span>
                </div>
                <div className="p-2 bg-slate-900 rounded-lg border border-slate-800 flex items-center space-x-2">
                  <Key className="w-4 h-4 text-blue-400" />
                  <span className="text-slate-300">{healthResult.details.auth}</span>
                </div>
                <div className="p-2 bg-slate-900 rounded-lg border border-slate-800 flex items-center space-x-2">
                  <Database className="w-4 h-4 text-purple-400" />
                  <span className="text-slate-300">{healthResult.details.storage}</span>
                </div>
                <div className="p-2 bg-slate-900 rounded-lg border border-slate-800 flex items-center space-x-2">
                  <ImageIcon className="w-4 h-4 text-amber-400" />
                  <span className="text-slate-300">{healthResult.details.image}</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === "logs" ? (
            /* Error & Recovery Logs */
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Recent Error & Recovery Log ({logs.length})
                </h3>
                {logs.length > 0 && (
                  <button
                    onClick={handleClearLogs}
                    className="flex items-center space-x-1 text-xs text-slate-400 hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear Logs</span>
                  </button>
                )}
              </div>

              {logs.length === 0 ? (
                <div className="text-center py-8 bg-slate-800/30 border border-dashed border-slate-800 rounded-xl text-slate-500 text-xs">
                  <ShieldCheck className="w-8 h-8 mx-auto mb-2 text-emerald-500/40" />
                  <span>No error events detected. All system operations running smoothly.</span>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 bg-slate-800/80 border border-slate-700/60 rounded-xl space-y-1.5 text-xs text-slate-300"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-[10px] text-slate-400">{log.timestamp}</span>
                          <span className="font-semibold text-slate-200 capitalize">{log.context}</span>
                        </div>
                        {getStatusBadge(log.status)}
                      </div>
                      <p className="text-slate-300 text-xs">{log.message}</p>
                      {log.rootCause && (
                        <div className="text-[11px] text-slate-400">
                          <span className="font-semibold text-slate-300">Root Cause: </span>
                          <span>{log.rootCause}</span>
                        </div>
                      )}
                      <div className="p-2 bg-slate-900/80 rounded-lg text-[11px] text-slate-400 border border-slate-800 flex items-start space-x-1.5">
                        <Info className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <div className="space-y-0.5">
                          <div>
                            <span className="text-emerald-400 font-medium">Recovery Action: </span>
                            <span>{log.recoveryAction}</span>
                          </div>
                          {log.patchedFile && (
                            <div className="font-mono text-[10px] text-slate-400 pt-0.5">
                              Source Patched: <span className="text-emerald-300">{log.patchedFile}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Server Self-Repair Audit Log Trail */
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Server-Side Self-Repair Audit Trail ({auditHistory.length})
                </h3>
                <button
                  onClick={fetchAuditLogs}
                  className="flex items-center space-x-1 text-xs text-slate-400 hover:text-emerald-400 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh Audit</span>
                </button>
              </div>

              {auditHistory.length === 0 ? (
                <div className="text-center py-8 bg-slate-800/30 border border-dashed border-slate-800 rounded-xl text-slate-500 text-xs">
                  <Code className="w-8 h-8 mx-auto mb-2 text-emerald-500/40" />
                  <span>No server-side repair patches executed yet. Audit log is empty and clean.</span>
                </div>
              ) : (
                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {auditHistory.map((entry) => (
                    <div
                      key={entry.id}
                      className="p-3.5 bg-slate-800/90 border border-slate-700/80 rounded-xl space-y-2 text-xs text-slate-300"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-[10px] text-slate-400">
                            {new Date(entry.timestamp).toLocaleTimeString()}
                          </span>
                          <span className="font-mono font-semibold text-emerald-300">{entry.targetFile}</span>
                        </div>
                        {entry.success ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Patch Verified & Kept
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            Rolled Back
                          </span>
                        )}
                      </div>

                      <div className="text-slate-200 font-medium">{entry.errorMessage}</div>

                      <div className="grid grid-cols-3 gap-2 py-1 text-[10px]">
                        <div className="p-1.5 bg-slate-900 rounded border border-slate-800 flex items-center justify-between">
                          <span className="text-slate-400">Lint Check:</span>
                          <span className={entry.lintPassed ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                            {entry.lintPassed ? "PASSED" : "FAILED"}
                          </span>
                        </div>
                        <div className="p-1.5 bg-slate-900 rounded border border-slate-800 flex items-center justify-between">
                          <span className="text-slate-400">Build Check:</span>
                          <span className={entry.buildPassed ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                            {entry.buildPassed ? "PASSED" : "FAILED"}
                          </span>
                        </div>
                        <div className="p-1.5 bg-slate-900 rounded border border-slate-800 flex items-center justify-between">
                          <span className="text-slate-400">Test Check:</span>
                          <span className={entry.testPassed ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                            {entry.testPassed ? "PASSED" : "FAILED"}
                          </span>
                        </div>
                      </div>

                      <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 font-mono text-[11px] text-slate-300 space-y-1">
                        <div>
                          <span className="text-slate-400">Root Cause: </span>
                          <span className="text-slate-200">{entry.rootCause}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">Repair Patch: </span>
                          <span className="text-emerald-300">{entry.patchDescription}</span>
                        </div>
                        {entry.backupPath && (
                          <div className="text-[10px] text-slate-500">
                            Backup File: {entry.backupPath}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between text-xs text-slate-400">
          <span>Claude Self-Repair Engine v2.0 Active</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
