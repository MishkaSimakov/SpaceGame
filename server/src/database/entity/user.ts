import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    BaseEntity,
    ManyToMany,
} from "typeorm";
import bcrypt from "bcrypt";
import {Game} from "./game";
import jwt, {JwtPayload} from "jsonwebtoken";
import * as assert from "node:assert";
import {UserSettings} from "@common/UserSettings";

export interface UserJWTPayload extends JwtPayload {
    id: string,
    login: string
}

// TODO: strict typing
@Entity()
export class User extends BaseEntity {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({unique: true, nullable: false})
    login!: string;

    @Column({nullable: false})
    password!: string;

    @ManyToMany(() => Game, (game) => game.players)
    games!: Game[];

    @Column({nullable: false})
    isBot!: boolean;

    @Column("simple-json")
    settings!: UserSettings;

    static async createHashedPassword(password: string): Promise<string> {
        const saltRounds = 8;

        return await bcrypt.hash(password, saltRounds);
    }

    generateToken(): string {
        const secretKey = process.env.JWT_SECRET_KEY;
        assert.ok(secretKey, "Secret key must be set in .env file.");

        return jwt.sign({id: this.id.toString(), login: this.login}, secretKey, {
            expiresIn: '1 year',
        });
    }
}
