import {typescript} from "@src/tools/codegen/typescript/Main";

typescript().catch(err => {
    console.error(err);
    process.exit(1);
});
