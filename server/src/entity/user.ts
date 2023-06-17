import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    BaseEntity,
    ManyToMany,
    JoinTable
} from "typeorm"
import bcrypt from "bcrypt";
import {Game} from "./game";

@Entity()
export class User extends BaseEntity {
    @PrimaryGeneratedColumn()
    id: number

    @Column({unique: true})
    login: string;

    @Column()
    password: string;

    @Column({nullable: true})
    rememberToken: string;

    @ManyToMany(() => Game, (game) => game.players)
    games: Game[];

    static async createHashedPassword(password: string): Promise<string> {
        const saltRounds = 8;

        return await bcrypt.hash(password, saltRounds);
    }
}
