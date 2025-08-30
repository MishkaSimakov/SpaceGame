import {typescript} from "@src/tools/codegen/typescript/Main";
import {python} from "@src/tools/codegen/python/Main";

python().catch(err => {
    console.error(err);
    process.exit(1);
});
