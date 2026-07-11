import {defineConfig} from "vitest/config";
import * as path from "path";

export default defineConfig({
    resolve: {
        alias: {
            "@common": path.resolve(__dirname, "../common"),
            "@src": path.resolve(__dirname, "src")
        }
    },
    test: {
        environment: "node",
        include: ["tests/**/*.test.ts"]
    }
});
