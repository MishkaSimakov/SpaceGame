import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    BaseEntity,
    ManyToMany,
} from "typeorm"
import bcrypt from "bcrypt";
import {Game} from "./game";
import jwt, {JwtPayload} from "jsonwebtoken";
import * as assert from "node:assert";

export interface UserJWTPayload extends JwtPayload {
    _id: string,
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

    static async createHashedPassword(password: string): Promise<string> {
        const saltRounds = 8;

        return await bcrypt.hash(password, saltRounds);
    }

    generateToken(): string {
        const SECRET_KEY = process.env.JWT_SECRET_KEY;
        assert.ok(SECRET_KEY, "Secret key must be set in .env file.");

        return jwt.sign({_id: this.id.toString(), login: this.login}, SECRET_KEY, {
            expiresIn: '1 year',
        });
    }
}
