import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthDto } from './dto';
import * as argon from 'argon2';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable({})
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}
  async signin(authDto: AuthDto) {
    // find the user by email
    const user = await this.prisma.user.findUnique({
      where: {
        email: authDto.email,
      },
    });
    // if user doesn't exist throw exception
    if (!user) throw new ForbiddenException('Credentials incorrect');
    // compare password
    const pwdMatches = await argon.verify(user.hash, authDto.password);

    // if password incorrect throw exception
    if (!pwdMatches) throw new ForbiddenException('Credentials incorrect');

    //send back the token
    return this.signToken(user.id, user.email);
  }

  async signup(authDto: AuthDto) {
    const hash = await argon.hash(authDto.password);
    try {
      const user = await this.prisma.user.create({
        data: {
          email: authDto.email,
          hash,
        },
      });

      delete user.hash;
      return this.signToken(user.id, user.email);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ForbiddenException('Credentials taken');
        }
      }

      throw error;
    }
  }

  async signToken(
    userId: string,
    email: string,
  ): Promise<{ access_token: string }> {
    const payload = {
      sub: userId,
      email,
    };

    const token = await this.jwt.signAsync(payload, {
      expiresIn: '15m',
      secret: this.config.get('JWT_SECRET'),
    });

    return {
      access_token: token,
    };
  }
}
