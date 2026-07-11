import {defaultUserSettings, UserSettings} from "@common/UserSettings";

export function getUserSettings(): Readonly<UserSettings> {
    return (window as any).userSettings ?? defaultUserSettings;
}