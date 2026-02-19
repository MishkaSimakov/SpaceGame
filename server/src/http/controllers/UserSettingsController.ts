import {AuthenticatedRequest} from "@src/http/middleware/auth";

import {Response} from "express";
import {render} from "@src/helpers/Render";
import {createUserSettingsValidator} from "@src/http/validation/UserSettingsValidator";
import {defaultUserSettings} from "@common/UserSettings";

export const show = async (req: AuthenticatedRequest, res: Response) => {
    render(res, 'settings', {
        settings: req.user.settings,
        defaultSettings: defaultUserSettings,
        error: req.flash('error')
    });
};


export const store = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const {data, error} = createUserSettingsValidator().safeParse(req.body);
        if (error) {
            req.flash('error', "Что-то не так с настройками.");

            return res.redirect('settings');
        }

        req.user.settings = data;
        await req.user.save();

        return res.redirect('settings');
    } catch (err) {
        return res.redirect('settings');
    }
};
