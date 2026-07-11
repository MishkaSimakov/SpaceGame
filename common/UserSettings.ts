export type UserSettings = {
    blueConnectorColor: string,
    redConnectorColor: string,

    fixedModulesGrid: boolean,
}

export const defaultUserSettings: UserSettings = {
    blueConnectorColor: '#4343F4',
    redConnectorColor: '#EA4035',

    fixedModulesGrid: false,
};