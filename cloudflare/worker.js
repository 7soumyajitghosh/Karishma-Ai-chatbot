// Cloudflare Worker entry point. Deliberately tiny: it does NOT reimplement any
// app logic. Every request is forwarded into a single container instance that
// runs the existing Express server (server.ts -> dist/server.cjs).
//
// Written as .js on purpose so the project's `tsc --noEmit` lint never compiles
// it (it has no include/exclude and would otherwise need Workers types).
import { Container, getContainer } from "@cloudflare/containers";

export class KarishmaContainer extends Container {
  // Must match ENV PORT / EXPOSE in the Dockerfile.
  defaultPort = 8080;
  // Scale to zero when idle so an idle backend costs nothing.
  sleepAfter = "30m";
}

export default {
  async fetch(request, env) {
    // One backend instance; route the request straight through to it.
    return getContainer(env.KARISHMA_CONTAINER).fetch(request);
  },
};
