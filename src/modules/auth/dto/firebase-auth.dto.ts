import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class FirebaseAuthDto {
  @IsString()
  @IsNotEmpty()
  idToken: string;

  @IsOptional()
  @IsString()
  @MaxLength(4096)
  fcm_token?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  device_type?: string;
}
