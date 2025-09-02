import path from "path";

export const basePath = (relativePath: string = '.') => {
    return path.join(__dirname, '../../../', relativePath);
}