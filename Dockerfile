# --------------------------------------------------------------------------
# Karishma backend + built web app, for Cloud Run.
#
# This is the SAME Express server (server.ts) the browser version already uses.
# Nothing about the app changes; it just gets a public HTTPS URL so the Android
# APK no longer needs your PC's localhost.
# --------------------------------------------------------------------------

# ---------- build stage: needs devDependencies (vite, esbuild) ----------
FROM node:22-slim AS build
WORKDIR /app

# Toolchain some native deps still expect during install.
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm install --no-audit --no-fund

COPY . .

# `npm run build` = vite build (-> dist/) + esbuild server.ts (-> dist/server.cjs)
RUN npm run build

# ---------- runtime stage: production dependencies only ----------
FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm install --omit=dev --no-audit --no-fund \
  && npm cache clean --force

# server.ts is bundled with --packages=external, so node_modules above is required.
COPY --from=build /app/dist ./dist

# server.ts resolves dist/ and db.json from process.cwd(), so start from /app.
# Cloud Run injects PORT; on Cloudflare Containers we pin it to match defaultPort.
ENV PORT=8080
EXPOSE 8080
CMD ["node", "dist/server.cjs"]
