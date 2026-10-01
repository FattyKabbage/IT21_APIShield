import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class CreateInvitationDto {
  @ApiProperty({
    example: 'developer@example.com',
    description: 'Email address of the developer to invite',
  })
  @IsEmail()
  email: string;
}