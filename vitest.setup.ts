import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

// Next.js compiles "server-only" to a no-op only under its own "react-server"
// bundler condition; under plain Vite/Vitest it resolves to the throwing
// stub. Neutralize it globally so lib/session.ts, lib/ratelimit.ts etc. can
// be imported (even transitively) from tests.
vi.mock("server-only", () => ({}));

// vitest.config.ts nemá `test.globals: true` (testy importují `describe`/`it`
// explicitně z "vitest"), takže se automatický cleanup z @testing-library/react
// nespustí sám — bez tohohle by DOM z jednoho testu prosakoval do dalšího.
afterEach(() => {
  cleanup();
});
