import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        environment: "node",
        include: ["src/**/*.test.ts"],
        alias: {
            "^flowquery$": "./node_modules/flowquery/dist/index.node.js",
            "^flowquery/extensibility$": "./node_modules/flowquery/dist/extensibility.js",
        },
    },
});
