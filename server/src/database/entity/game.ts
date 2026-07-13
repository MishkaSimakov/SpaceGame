import {
    Entity,
    Column,
    BaseEntity,
    ManyToOne,
    ManyToMany,
    JoinTable,
    PrimaryColumn
} from "typeorm";
import {User} from "./user";
import {GameSettings} from "@common/Types";

export enum GameStatus {
    ACTIVE = "active",
    ERROR = "error",
    FINISHED = "finished"
}

@Entity()
export class Game extends BaseEntity {
    @PrimaryColumn({nullable: false})
    id!: string;

    @Column({nullable: false})
    name!: string;

    @ManyToOne(() => User, {nullable: false})
    owner!: User;

    @ManyToOne(() => User, {nullable: true})
    winner?: User;

    @ManyToMany(() => User, (user) => user.games, {nullable: false})
    @JoinTable()
    players!: User[];

    @Column({nullable: false})
    logFilepath!: string;

    @Column("simple-json")
    settings!: GameSettings;

    @Column({type: "enum", enum: GameStatus, nullable: false})
    status!: GameStatus;

    @Column({nullable: false, type: "timestamptz"})
    createdAt!: Date;

    @Column({nullable: true, type: "timestamptz"})
    finishedAt?: Date;


    isFinished(): boolean {
        return this.status === GameStatus.FINISHED;
    }
}
