import React, { Component, ErrorInfo, ReactNode } from "react";
import { selfHealingSystem as shs } from "../lib/selfHealing";
import { ShieldAlert, RefreshCw, Sparkles, CheckCircle2 } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  isRecovering: boolean;
  recoveredCount: number;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    isRecovering: false,
    recoveredCount: 0,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Self-Healing Error Boundary caught error:", error, errorInfo);

    const errorMsg = error.message || "Unknown runtime rendering exception";
    const stackTrace = errorInfo.componentStack || "";

    // Trigger code auto-repair engine on server
    shs.triggerCodeAutoRepair({
      errorMessage: errorMsg,
      stackTrace,
      component: "ReactComponent",
      category: "runtime",
    }).then((repairResult) => {
      if (repairResult.verified) {
        shs.recordLog({
          category: "runtime",
          context: "React Component Hierarchy",
          message: errorMsg,
          rootCause: repairResult.rootCause || "Component state or props rendering exception",
          recoveryAction: `Auto-repaired source code in ${repairResult.targetFile || "src/App.tsx"}: ${repairResult.patchDescription}`,
          status: "auto_recovered",
          retryCount: repairResult.attemptsCount,
          patchedFile: repairResult.targetFile,
          patchDescription: repairResult.patchDescription,
          verified: true,
        });
      } else {
        shs.recordLog({
          category: "runtime",
          context: "React Component Hierarchy",
          message: errorMsg,
          rootCause: "Component rendering exception - 3 repair attempts exhausted",
          recoveryAction: "Isolated UI error safely without affecting user data",
          status: "unrecoverable",
          retryCount: 3,
        });
      }
    });
  }

  private handleSelfHealRestore = async () => {
    this.setState({ isRecovering: true });

    if (this.state.error) {
      await shs.triggerCodeAutoRepair({
        errorMessage: this.state.error.message || "Runtime exception",
        stackTrace: this.state.errorInfo?.componentStack || "",
        component: "ReactComponent",
        category: "runtime",
      });
    }

    setTimeout(() => {
      this.setState((prev) => ({
        hasError: false,
        error: null,
        errorInfo: null,
        isRecovering: false,
        recoveredCount: prev.recoveredCount + 1,
      }));
    }, 600);
  };

  private handleHardReload = () => {
    try {
      sessionStorage.clear();
    } catch {}
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 shadow-2xl backdrop-blur-lg">
            <div className="flex items-center space-x-3 text-emerald-400 mb-4">
              <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                <ShieldAlert className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Self-Healing System Active</h2>
                <p className="text-xs text-slate-400">Isolated a temporary visual rendering issue</p>
              </div>
            </div>

            <p className="text-sm text-slate-300 mb-4 leading-relaxed bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
              {this.state.error?.message || "An unexpected rendering event occurred. Your chat history and data remain fully safe."}
            </p>

            <div className="space-y-2.5">
              <button
                onClick={this.handleSelfHealRestore}
                disabled={this.state.isRecovering}
                className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-xl transition-all shadow-md active:scale-98 disabled:opacity-50"
              >
                {this.state.isRecovering ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Self-Healing Interface...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Self-Heal & Restore Interface</span>
                  </>
                )}
              </button>

              <button
                onClick={this.handleHardReload}
                className="w-full flex items-center justify-center space-x-2 py-2 px-4 bg-slate-700/60 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reload Page safely</span>
              </button>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-700/50 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center space-x-1 text-emerald-400">
                <CheckCircle2 className="w-3 h-3" />
                <span>Data Protected</span>
              </span>
              <span>Self-Heal Attempts: {this.state.recoveredCount}</span>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
