import {DataSource} from "typeorm";
import {User} from "../entity/user";
import {Game} from "../entity/game";

export default class DatabaseManager {
    constructor() {
    }

    async initConnection() {
        const AppDataSource = new DataSource({
            type: "mysql",
            host: process.env.DB_HOST,
            port: parseInt(process.env.DB_PORT),
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
                throw new Error("Error during Data Source initialization", err);
            });
    }
}
