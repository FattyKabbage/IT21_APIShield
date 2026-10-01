import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class BootstrapAdminDto {
  //para sa swagger documentation
  @ApiProperty({
    example: 'admin@example.com',
    description: 'Email address for the initial system administrator',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'StrongPassword123',
    description: 'Password for the system administrator',
    minLength: 12,
    maxLength: 128,
  })
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  password: string;

  @ApiProperty({
    example: 'your-bootstrap-secret',
    description: 'Secret required to bootstrap the initial system administrator',
  })
  @IsString()
  bootstrapSecret: string;
}