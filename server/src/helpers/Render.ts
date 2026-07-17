import { Response} from "express";

export const render = (response: Response, path: string, state?: Record<string, any>) => {
    const renderer = (response as any).view;

    response.send(renderer.renderSync(path, state));
};