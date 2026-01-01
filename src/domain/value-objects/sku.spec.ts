import { isValidSKU, validateSKU, VALID_SKUS } from './sku';

describe('SKU', () => {
  describe('VALID_SKUS', () => {
    it('should contain APE, PUNK, and MEEBIT', () => {
      expect(VALID_SKUS).toContain('APE');
      expect(VALID_SKUS).toContain('PUNK');
      expect(VALID_SKUS).toContain('MEEBIT');
      expect(VALID_SKUS).toHaveLength(3);
    });
  });

  describe('isValidSKU', () => {
    it('should return true for valid SKUs', () => {
      expect(isValidSKU('APE')).toBe(true);
      expect(isValidSKU('PUNK')).toBe(true);
      expect(isValidSKU('MEEBIT')).toBe(true);
    });

    it('should return false for invalid SKUs', () => {
      expect(isValidSKU('INVALID')).toBe(false);
      expect(isValidSKU('ape')).toBe(false);
      expect(isValidSKU('Punk')).toBe(false);
      expect(isValidSKU('')).toBe(false);
      expect(isValidSKU('OTHER')).toBe(false);
    });
  });

  describe('validateSKU', () => {
    it('should return SKU for valid values', () => {
      expect(validateSKU('APE')).toBe('APE');
      expect(validateSKU('PUNK')).toBe('PUNK');
      expect(validateSKU('MEEBIT')).toBe('MEEBIT');
    });

    it('should throw error for invalid SKU', () => {
      expect(() => validateSKU('INVALID')).toThrow('Invalid SKU: INVALID');
      expect(() => validateSKU('ape')).toThrow('Invalid SKU: ape');
      expect(() => validateSKU('')).toThrow('Invalid SKU:');
    });

    it('should include valid SKUs in error message', () => {
      try {
        validateSKU('INVALID');
        fail('Should have thrown error');
      } catch (error) {
        expect((error as Error).message).toContain('APE');
        expect((error as Error).message).toContain('PUNK');
        expect((error as Error).message).toContain('MEEBIT');
      }
    });
  });
});
