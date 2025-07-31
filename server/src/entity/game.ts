import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    BaseEntity,
    OneToMany,
    ManyToOne,
    ManyToMany,
    JoinTable,
    PrimaryColumn
} from "typeorm"
import {User} from "./user";

@Entity()
export class Game extends BaseEntity {
    @PrimaryColumn({nullable: false})
    id: string

    @Column({nullable: false})
    name: string;

    @ManyToOne(type => User, {nullable: true})
    winner: User;

    @ManyToMany(() => User, (user) => user.games, {nullable: false})
    @JoinTable()
    players: User[];

    @Column({nullable: false})
    logFilepath: string;

    @Column({nullable: true, type: "timestamptz"})
    finishedAt: Date;
}
