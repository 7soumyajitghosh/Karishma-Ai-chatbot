# Karishma AI — Rules for AI Agents

All AI agents interacting with or modifying the Karishma AI codebase must strictly follow these rules:

1. **Read all files inside `AI_CHANGELOG/` before modifying the project.** Familiarize yourself with recent context and ongoing tasks.
2. **Read `CURRENT_STATE.md` before starting a task.** Understand what is actively functioning, what is simulated or fallback, and what known issues exist.
3. **Read `ROADMAP.md` to understand the overall goal.** Align all proposed changes with the established architecture and milestone priorities.
4. **Check existing code before creating replacement code.** Do not recreate helpers, components, or stores that already exist.
5. **Never delete a file without checking imports and references.** Trace both static imports and dynamic references across frontend and backend.
6. **Never delete a dependency without checking whether it is used.** Check `package.json`, build configurations, and runtime imports first.
7. **Never expose, print, commit, or store secrets/API keys in source code.** All keys belong solely in server-side environment variables.
8. **Never modify working functionality unnecessarily.** Avoid gratuitous refactors or changing working patterns without a direct request.
9. **Preserve the existing architecture unless there is a clear technical reason to change it.** Follow the Render + Express + Vite + Supabase model.
10. **Prefer minimal, targeted fixes.** Keep diffs small, auditable, and easy to roll back if necessary.
11. **Run the production build (`npm run build`) after meaningful code changes.** Ensure bundling and compilation succeed before ending your turn.
12. **Run relevant tests and lint checks (`npm run lint`) when available.** Fix any type or compiler errors immediately.
13. **Check for TypeScript, build, or runtime errors after changes.** Do not leave broken builds or silent runtime syntax failures.
14. **Update `CHANGELOG.md` after every meaningful modification.** Record the date, modified files, purpose, problem solved, and verification method.
15. **Update `CURRENT_STATE.md` when the actual project state changes.** Reflect fixed issues, newly discovered bugs, or altered system states.
16. **Update `ROADMAP.md` when a roadmap task changes status.** Mark items completed (✅), in progress (🔄), or blocked (⚠️) accurately.
17. **Do not claim a problem is fixed without verification.** Test commands, check output codes, and inspect runtime behavior before concluding.
18. **Do not invent missing configuration or services.** Do not assume unconfigured environment variables exist; implement safe fallbacks.
19. **Do not commit credentials or sensitive values.** Keep placeholders in examples and never leak keys into git history or client configs.
20. **Before removing Firebase or any other integration, trace all imports and runtime usage first.** Verify both backend (`server.ts`) and frontend (`src/App.tsx`, `src/lib/`) references before deprecating any integration.
