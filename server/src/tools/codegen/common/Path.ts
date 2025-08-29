import path from "path";

import {basePath} from "@src/helpers/Paths";

export function codegenPath(relativePath: string) {
    return basePath(path.join('server/src/tools/codegen/', relativePath));
}
