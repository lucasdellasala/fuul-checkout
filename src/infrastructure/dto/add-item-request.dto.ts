import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';

export enum SKUEnum {
  APE = 'APE',
  PUNK = 'PUNK',
  MEEBIT = 'MEEBIT',
}

export class AddItemRequestDto {
  @IsEnum(SKUEnum)
  sku: SKUEnum;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;
}
