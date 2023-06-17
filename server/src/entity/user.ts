import {Entity, PrimaryGeneratedColumn, Column, BaseEntity, BeforeInsert, BeforeUpdate, Unique} from "typeorm"
import bcrypt from "bcrypt";

@Entity()
export class User extends BaseEntity {
    @PrimaryGeneratedColumn()
    id: number

    @Column({unique: true})
    login: string;

    @Column()
    password: string;

    @Column({ nullable: true })
    rememberToken: string;

    static async createHashedPassword(password: string): Promise<string> {
        const saltRounds = 8;

        return await bcrypt.hash(password, saltRounds);
    }
}
