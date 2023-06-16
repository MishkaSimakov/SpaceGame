import {Entity, PrimaryGeneratedColumn, Column, BaseEntity, BeforeInsert, BeforeUpdate, Unique} from "typeorm"
import bcrypt from 'bcrypt';

@Entity()
export class User extends BaseEntity {
    @PrimaryGeneratedColumn()
    id: number

    @Column({unique: true})
    login: string;

    @Column()
    password: string;

    @Column()
    rememberToken: string;

    @BeforeInsert()
    @BeforeUpdate()
    async updatePassword() {
        const saltRounds = 8;

        this.password = await bcrypt.hash(this.password, saltRounds);
    }
}
