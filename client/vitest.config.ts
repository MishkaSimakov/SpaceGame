import {defineConfig} from "vitest/config";
import * as path from "path";

export default defineConfig({
    resolve: {
        alias: {
            "@common": path.resolve(__dirname, "../common")
        }
    },
    test: {
        // The board model is pure — no DOM needed. Anything that needs a canvas
        // is view code and is verified in the browser instead.
        environment: "node",
        include: ["src/**/*.test.ts"]
    }
});
