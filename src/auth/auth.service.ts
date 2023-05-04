import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { validate } from 'class-validator';
import { UsersDTO } from 'src/users/dtos/users.dto';
import { Users } from 'src/users/entities/users.entity';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';


@Injectable()
export class AuthService {
    constructor(
    @InjectRepository(Users) private usersRepository:Repository<Users>){}

    async createUser(body: any): Promise<Record<string, any>> {
        // Validation Flag
        let isOk = false;
      
        // Transform body into DTO
        const userDTO = new UsersDTO();
        userDTO.email = body.email;
        userDTO.password = bcrypt.hashSync(body.password, 10);
      
        // Validate DTO against validate function from class-validator
        await validate(userDTO).then((errors) => {
          if (errors.length > 0) {
            throw new Error("Error");
          } else {
            isOk = true;
          }
        });
        if (isOk) {
          await this.usersRepository.save(userDTO).catch((error) => {
            isOk = false;
            throw new Error("Error");
          });
          if (isOk) {
            return { status: 201, content: { msg: `User created with success` } };
          } else {
            return { status: 400, content: { msg: 'User already exists' } };
          }
        } else {
          return { status: 400, content: { msg: 'Invalid content' } };
        }
      }

      async login(user: any): Promise<Record<string, any>> {
        // Validation Flag
        let isOk = false;
    
        // Transform body into DTO
        const userDTO = new UsersDTO();
        userDTO.email = user.email;
        userDTO.password = user.password;
    
        // Validate DTO against validate function from class-validator
        await validate(userDTO).then((errors) => {
          if (errors.length > 0) {
            throw new Error("Error");
          } else {
            isOk = true;
          }
        });
    
        if (isOk) {
          // Get user information
          const userDetails = await this.usersRepository.findOne({
            where : {email: user.email},
           });
           if (userDetails == null) {
             return { status: 401, msg: { msg: 'Invalid credentials' } };
           }
     
           // Check if the given password match with saved password
           const isValid = bcrypt.compareSync(user.password, userDetails.password);
           if (isValid) {
             const payload = { email: user.email };
             const token = jwt.sign(payload, 'secret', { expiresIn: '15m' });
             return {
               status: 200,
               msg: {
                 email: user.email,
                 access_token: token,
               },
             };
           } else {
             return { status: 401, msg: { msg: 'Invalid credentials' } };
           }
         } else {
           return { status: 400, msg: { msg: 'Invalid fields.' } };
         }
        }

        async getUserByEmail(email: string): Promise<Users | null> {
          return await this.usersRepository.findOne({ where: { email} });
        }
      
        async generateResetPasswordToken(user: Users): Promise<string> {
          const payload = { email: user.email };
          return jwt.sign(payload, 'secret', { expiresIn: '15m' });
        }
      
        async resetPassword(token: string, password: string): Promise<Record<string, any>> {
          let decoded: any;
          try {
            decoded = jwt.verify(token, 'secret');
          } catch (err) {
            return { status: 400, msg: { msg: 'Invalid token' } };
          }
      
          const user = await this.usersRepository.findOne({ where: { email: decoded.email } });
      
          if (!user) {
            return { status: 404, msg: { msg: 'User not found' } };
          }
      
          const hashedPassword = await bcrypt.hash(password, 10);
          user.password = hashedPassword;
          await this.usersRepository.save(user);
      
          return { status: 200, msg: { msg: 'Password reset successful' } };
        }
}