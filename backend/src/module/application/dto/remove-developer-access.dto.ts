import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RemoveDeveloperAccessDto {
  @ApiProperty({
    description: 'Current password of the authenticated organization owner',
  })
  @IsString()
  @IsNotEmpty()
  currentPassword!: string;
}