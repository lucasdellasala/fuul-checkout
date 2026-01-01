export type SKU = 'APE' | 'PUNK' | 'MEEBIT';

export const VALID_SKUS: readonly SKU[] = ['APE', 'PUNK', 'MEEBIT'] as const;

export function isValidSKU(value: string): value is SKU {
  return VALID_SKUS.includes(value as SKU);
}

export function validateSKU(value: string): SKU {
  if (!isValidSKU(value)) {
    throw new Error(`Invalid SKU: ${value}. Must be one of: ${VALID_SKUS.join(', ')}`);
  }
  return value;
}
