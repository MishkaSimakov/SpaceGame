import {DataSource} from "typeorm";
import {User} from "./entity/user";
import {Game} from "./entity/game";
import * as process from "node:process";
import {defaultUserSettings} from "@common/UserSettings";

export default class DatabaseManager {
    constructor() {
    }

    async initConnection() {
        const AppDataSource = new DataSource({
            type: "postgres",
            host: process.env.DB_HOST,
            port: parseInt(process.env.DB_PORT ?? "5432"),
            username: process.env.DB_USERNAME,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_DATABASE,
            synchronize: true,
            entities: [User, Game],
        });

        await AppDataSource.initialize()
            .then(async () => {
                console.log("Data Source has been initialized!");
            })
            .catch((err) => {
                console.warn(err);
                throw new Error("Error during Data Source initialization");
            });
    }

    // for testing
    async fakeUsers() {
        const users = ['first', 'second'];

        for (const name of users) {
            const existUserWithSameName = await User.createQueryBuilder().where({
                login: name
            }).getExists();

            if (existUserWithSameName) {
                continue;
            }

            let user = new User();

            user.login = name;
            user.password = await User.createHashedPassword(name);
            user.isBot = false;
            user.settings = defaultUserSettings;

            await user.save();

            console.log(`🤥 fake user '${name}' generated`);
        }
    }
}
