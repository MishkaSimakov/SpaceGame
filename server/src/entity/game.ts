import {Entity, PrimaryGeneratedColumn, Column, BaseEntity, OneToMany, ManyToOne, ManyToMany, JoinTable} from "typeorm"
import {User} from "./user";

@Entity()
export class Game extends BaseEntity {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    name: string;

    @ManyToOne(type => User)
    winner: User;

    @ManyToMany(() => User, (user) => user.games)
    @JoinTable()
    players: User[];
}
