import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignDeveloperDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'User ID of the developer to assign to this application.',
  })
  @IsUUID()
  developerId!: string;
}