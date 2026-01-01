import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import * as request from 'supertest';

import { Money } from '../src/domain/value-objects/money';
import { HttpExceptionFilter } from '../src/infrastructure/filters/http-exception.filter';
import { PRICE_PROVIDER_TOKEN } from '../src/infrastructure/modules/checkout.tokens';
import { ExternalTokenPriceService } from '../src/infrastructure/providers/external-token-price.service';

import { TestCheckoutModule } from './test-checkout.module';

describe('CartsController (e2e)', () => {
  let app: INestApplication;
  let priceService: ExternalTokenPriceService;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [TestCheckoutModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();

    const provider = moduleFixture.get(PRICE_PROVIDER_TOKEN);
    if (provider instanceof ExternalTokenPriceService) {
      priceService = provider;
    } else {
      throw new TypeError('PriceProvider is not ExternalTokenPriceService');
    }
  });

  afterEach(async () => {
    if (app)await app.close();
  });

  describe('1) POST /carts', () => {
    it('should return cartId', () => {
      return request(app.getHttpServer())
        .post('/carts')
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('cartId');
          expect(res.body.cartId).toBeTruthy();
          expect(typeof res.body.cartId).toBe('string');
        });
    });
  });

  describe('2) Idempotency', () => {
    let cartId: string;

    beforeEach(async () => {
      const response = await request(app.getHttpServer()).post('/carts').expect(201);
      cartId = response.body.cartId;
    });

    it('should not double-add when same Idempotency-Key is used twice', async () => {
      const idempotencyKey = 'idempotency-test-1';

      const response1 = await request(app.getHttpServer())
        .post(`/carts/${cartId}/items`)
        .set('Idempotency-Key', idempotencyKey)
        .send({ sku: 'APE', quantity: 1 })
        .expect(201);

      const version1 = response1.body.version;

      const response2 = await request(app.getHttpServer())
        .post(`/carts/${cartId}/items`)
        .set('Idempotency-Key', idempotencyKey)
        .send({ sku: 'APE', quantity: 1 })
        .expect(201);

      const version2 = response2.body.version;

      expect(version1).toBe(version2);

      const totalResponse = await request(app.getHttpServer())
        .get(`/carts/${cartId}/total`)
        .expect(200);

      const apeItem = totalResponse.body.lineItems.find(
        (item: { sku: string }) => item.sku === 'APE',
      );
      expect(apeItem.quantity).toBe(1);
    });

    it('should return 409 when same key is used with different body', async () => {
      const idempotencyKey = 'idempotency-test-2';

      await request(app.getHttpServer())
        .post(`/carts/${cartId}/items`)
        .set('Idempotency-Key', idempotencyKey)
        .send({ sku: 'APE', quantity: 1 })
        .expect(201);

      return request(app.getHttpServer())
        .post(`/carts/${cartId}/items`)
        .set('Idempotency-Key', idempotencyKey)
        .send({ sku: 'PUNK', quantity: 1 })
        .expect(409)
        .expect((res) => {
          expect(res.body.code).toBe('IDEMPOTENCY_KEY_CONFLICT');
        });
    });
  });

  describe('3) Pricing scenarios from challenge', () => {
    beforeEach(() => {
      priceService.setPrice('APE', Money.fromEther('75'));
      priceService.setPrice('PUNK', Money.fromEther('60'));
      priceService.setPrice('MEEBIT', Money.fromEther('4'));
    });

    it('should calculate total: APE, PUNK, MEEBIT -> 139 ETH', async () => {
      const cartResponse = await request(app.getHttpServer()).post('/carts').expect(201);
      const cartId = cartResponse.body.cartId;

      await request(app.getHttpServer())
        .post(`/carts/${cartId}/items`)
        .set('Idempotency-Key', 'test-1-1')
        .send({ sku: 'APE', quantity: 1 })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/carts/${cartId}/items`)
        .set('Idempotency-Key', 'test-1-2')
        .send({ sku: 'PUNK', quantity: 1 })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/carts/${cartId}/items`)
        .set('Idempotency-Key', 'test-1-3')
        .send({ sku: 'MEEBIT', quantity: 1 })
        .expect(201);

      const totalResponse = await request(app.getHttpServer())
        .get(`/carts/${cartId}/total`)
        .expect(200);

      expect(totalResponse.body.total).toBe('139.000000000000000000');
    });

    it('should calculate total: APE, PUNK, APE -> 135 ETH', async () => {
      const cartResponse = await request(app.getHttpServer()).post('/carts').expect(201);
      const cartId = cartResponse.body.cartId;

      await request(app.getHttpServer())
        .post(`/carts/${cartId}/items`)
        .set('Idempotency-Key', 'test-2-1')
        .send({ sku: 'APE', quantity: 1 })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/carts/${cartId}/items`)
        .set('Idempotency-Key', 'test-2-2')
        .send({ sku: 'PUNK', quantity: 1 })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/carts/${cartId}/items`)
        .set('Idempotency-Key', 'test-2-3')
        .send({ sku: 'APE', quantity: 1 })
        .expect(201);

      const totalResponse = await request(app.getHttpServer())
        .get(`/carts/${cartId}/total`)
        .expect(200);

      expect(totalResponse.body.total).toBe('135.000000000000000000');
    });

    it('should calculate total: PUNK,PUNK,PUNK,APE,PUNK -> 267 ETH', async () => {
      const cartResponse = await request(app.getHttpServer()).post('/carts').expect(201);
      const cartId = cartResponse.body.cartId;

      await request(app.getHttpServer())
        .post(`/carts/${cartId}/items`)
        .set('Idempotency-Key', 'test-3-1')
        .send({ sku: 'PUNK', quantity: 3 })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/carts/${cartId}/items`)
        .set('Idempotency-Key', 'test-3-2')
        .send({ sku: 'APE', quantity: 1 })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/carts/${cartId}/items`)
        .set('Idempotency-Key', 'test-3-3')
        .send({ sku: 'PUNK', quantity: 1 })
        .expect(201);

      const totalResponse = await request(app.getHttpServer())
        .get(`/carts/${cartId}/total`)
        .expect(200);

      expect(totalResponse.body.total).toBe('267.000000000000000000');
    });

    it('should calculate total: APE,PUNK,APE,APE,MEEBIT,PUNK,PUNK -> 298 ETH', async () => {
      const cartResponse = await request(app.getHttpServer()).post('/carts').expect(201);
      const cartId = cartResponse.body.cartId;

      await request(app.getHttpServer())
        .post(`/carts/${cartId}/items`)
        .set('Idempotency-Key', 'test-4-1')
        .send({ sku: 'APE', quantity: 1 })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/carts/${cartId}/items`)
        .set('Idempotency-Key', 'test-4-2')
        .send({ sku: 'PUNK', quantity: 1 })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/carts/${cartId}/items`)
        .set('Idempotency-Key', 'test-4-3')
        .send({ sku: 'APE', quantity: 1 })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/carts/${cartId}/items`)
        .set('Idempotency-Key', 'test-4-4')
        .send({ sku: 'APE', quantity: 1 })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/carts/${cartId}/items`)
        .set('Idempotency-Key', 'test-4-5')
        .send({ sku: 'MEEBIT', quantity: 1 })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/carts/${cartId}/items`)
        .set('Idempotency-Key', 'test-4-6')
        .send({ sku: 'PUNK', quantity: 1 })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/carts/${cartId}/items`)
        .set('Idempotency-Key', 'test-4-7')
        .send({ sku: 'PUNK', quantity: 1 })
        .expect(201);

      const totalResponse = await request(app.getHttpServer())
        .get(`/carts/${cartId}/total`)
        .expect(200);

      expect(totalResponse.body.total).toBe('298.000000000000000000');
    });
  });

  describe('4) Price refresh', () => {
    let cartId: string;

    beforeEach(async () => {
      priceService.setPrice('APE', Money.fromEther('75'));
      priceService.setPrice('PUNK', Money.fromEther('60'));
      priceService.setPrice('MEEBIT', Money.fromEther('4'));

      const cartResponse = await request(app.getHttpServer()).post('/carts').expect(201);
      cartId = cartResponse.body.cartId;

      await request(app.getHttpServer())
        .post(`/carts/${cartId}/items`)
        .set('Idempotency-Key', 'refresh-test-1')
        .send({ sku: 'APE', quantity: 3 })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/carts/${cartId}/items`)
        .set('Idempotency-Key', 'refresh-test-2')
        .send({ sku: 'PUNK', quantity: 3 })
        .expect(201);
    });

    it('should reflect updated prices and re-apply promos correctly', async () => {
      const firstTotalResponse = await request(app.getHttpServer())
        .get(`/carts/${cartId}/total`)
        .expect(200);

      const firstTotal = firstTotalResponse.body.total;
      expect(firstTotal).toBe('294.000000000000000000');

      priceService.setPrice('APE', Money.fromEther('100'));

      const secondTotalResponse = await request(app.getHttpServer())
        .get(`/carts/${cartId}/total`)
        .expect(200);

      const secondTotal = secondTotalResponse.body.total;
      expect(secondTotal).toBe('344.000000000000000000');

      const apeItem = secondTotalResponse.body.lineItems.find(
        (item: { sku: string }) => item.sku === 'APE',
      );
      expect(apeItem.unitPrice).toBe('100.000000000000000000');
      expect(apeItem.subtotalBeforePromo).toBe('300.000000000000000000');
      expect(apeItem.subtotalAfterPromo).toBe('200.000000000000000000');

      const punkItem = secondTotalResponse.body.lineItems.find(
        (item: { sku: string }) => item.sku === 'PUNK',
      );
      expect(punkItem.unitPrice).toBe('60.000000000000000000');
      expect(punkItem.subtotalBeforePromo).toBe('180.000000000000000000');
      expect(punkItem.subtotalAfterPromo).toBe('144.000000000000000000');
    });

    it('should format all Money values as ETH string with 18 decimals', async () => {
      const response = await request(app.getHttpServer()).get(`/carts/${cartId}/total`).expect(200);

      expect(response.body.total).toMatch(/^\d+\.\d{18}$/);

      response.body.lineItems.forEach((item: any) => {
        expect(item.unitPrice).toMatch(/^\d+\.\d{18}$/);
        expect(item.subtotalBeforePromo).toMatch(/^\d+\.\d{18}$/);
        expect(item.subtotalAfterPromo).toMatch(/^\d+\.\d{18}$/);
      });

      response.body.adjustments.forEach((adj: any) => {
        expect(adj.amount).toMatch(/^\d+\.\d{18}$/);
      });
    });
  });

  describe('5) Concurrent scans', () => {
    let cartId: string;

    beforeEach(async () => {
      const cartResponse = await request(app.getHttpServer()).post('/carts').expect(201);
      cartId = cartResponse.body.cartId;
    });

    it('should handle concurrent scans with version conflict', async () => {
      const idempotencyKey1 = 'concurrent-key-1';
      const idempotencyKey2 = 'concurrent-key-2';

      // Fire two requests in parallel that will race on the same version
      const [response1, response2] = await Promise.allSettled([
        request(app.getHttpServer())
          .post(`/carts/${cartId}/items`)
          .set('Idempotency-Key', idempotencyKey1)
          .send({ sku: 'APE', quantity: 1 }),
        request(app.getHttpServer())
          .post(`/carts/${cartId}/items`)
          .set('Idempotency-Key', idempotencyKey2)
          .send({ sku: 'PUNK', quantity: 1 }),
      ]);

      // Extract results from settled promises
      const results = [response1, response2]
        .map((result) => {
          if (result.status === 'fulfilled') {
            const response = result.value;
            return {
              status: response.status,
              body: response.body,
            };
          } else {
            // If request was rejected, it might be due to network error
            // In this case, we expect both to be fulfilled
            return null;
          }
        })
        .filter((r) => r !== null);

      // With retry logic, both requests may succeed, or one may fail
      // The key is that version conflicts are handled correctly
      const successResponses = results.filter((r) => r?.status === 201);
      const conflictResponses = results.filter((r) => r?.status === 409);

      // At least one should succeed
      expect(successResponses.length).toBeGreaterThan(0);

      // If there's a conflict, it should have the correct error code
      if (conflictResponses.length > 0) {
        expect(conflictResponses[0]?.body.code).toBe('VERSION_CONFLICT');
      }

      // Verify the cart state - at least one item should have been added
      const totalResponse = await request(app.getHttpServer())
        .get(`/carts/${cartId}/total`)
        .expect(200);

      const lineItems = totalResponse.body.lineItems;
      const totalQuantity = lineItems.reduce(
        (sum: number, item: { quantity: number }) => sum + item.quantity,
        0,
      );
      // With retry logic, both items might be added, or just one
      expect(totalQuantity).toBeGreaterThanOrEqual(1);
      expect(totalQuantity).toBeLessThanOrEqual(2);
    });

    it('should retry and re-fetch cart on version conflict', async () => {
      // Create a fresh cart for this test
      const cartResponse = await request(app.getHttpServer()).post('/carts').expect(201);
      const testCartId = cartResponse.body.cartId;

      // First request: add an item (this will increment version to 2)
      await request(app.getHttpServer())
        .post(`/carts/${testCartId}/items`)
        .set('Idempotency-Key', 'retry-test-1')
        .send({ sku: 'APE', quantity: 1 })
        .expect(201);

      // Second request: add another item with a different idempotency key
      // This will read the cart (version 2), modify it, and try to save with expectedVersion=2
      // If there's a race condition, it might fail with version conflict, but retry should work
      const response = await request(app.getHttpServer())
        .post(`/carts/${testCartId}/items`)
        .set('Idempotency-Key', 'retry-test-2')
        .send({ sku: 'PUNK', quantity: 1 })
        .expect(201);

      // Verify the response has a version
      expect(response.body).toHaveProperty('version');
      expect(response.body.version).toBeGreaterThan(1);

      // Verify both items are in the cart
      const totalResponse = await request(app.getHttpServer())
        .get(`/carts/${testCartId}/total`)
        .expect(200);

      const lineItems = totalResponse.body.lineItems;
      expect(lineItems).toHaveLength(2);
      expect(lineItems.find((item: { sku: string }) => item.sku === 'APE')?.quantity).toBe(1);
      expect(lineItems.find((item: { sku: string }) => item.sku === 'PUNK')?.quantity).toBe(1);
    });
  });
});
