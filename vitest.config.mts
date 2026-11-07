import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["lib/**/*.test.ts", "supabase/tests/**/*.test.ts"],
    environment: "node",
    // Les tests RLS partagent une base : pas de parallélisme entre fichiers.
    fileParallelism: false,
  },
});
