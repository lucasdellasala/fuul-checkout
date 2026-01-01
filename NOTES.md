# Architecture & Tradeoffs

- **Hexagonal layering**: domain (pure TS) ← application (NestJS services) ← infrastructure (controllers/adapters). Domain contains entities (`Cart`), value objects (`Money`, `SKU`), promotions (`PromotionsEngine` + generic promos), and ports (`CartRepositoryPort`, `PriceProviderPort`).
- **Promotions**: data-driven config (`src/domain/promotions/promotions.config.ts`) plus generic implementations (`NForMPromotion`, `BulkDiscountPromotion`) built via `PromotionsFactory`. CheckoutModule and tests consume the same config to avoid drift.
- **Pricing evaluation**: executed only in `CheckoutService.getTotal()`, keeping `scan()` fast and reusing fresh prices on every call. Money formatted via `MoneyMapper` to 18-decimal ETH strings.
- **Idempotency & concurrency**: in-memory `IdempotencyStore` gates `scan()` before mutation; conflicts mapped to `409` with stable codes. Optimistic concurrency via cart versioning and conflict retry in controller.
- **Price source**: mocked `ExternalTokenPriceService` (in-memory map) with setters for tests; no real network calls.

# Challenge discrepancy

- The challenge’s numeric example “APE, PUNK, APE = 210 ETH” contradicts the 2-for-1 definition (and its own 3-for-2 illustration). This project follows the stated rule: that scenario totals 135 ETH.

# Known Simplifications

- Persistence is in-memory only; swap by implementing `CartRepositoryPort`.
- Idempotency store is in-memory (no TTL/eviction); replace with Redis/db for multi-instance.
- Promotions are "one per SKU" and prioritized; stacking/combining promos is not implemented.
- Price cache/locking is omitted; each `getTotal()` fetches current prices from the provider.

# Testing Overview

- **E2E**: `test/carts.e2e-spec.ts` covers pricing scenarios, idempotency, concurrency, formatting.
- **Unit**: `src/application/checkout.service.spec.ts`, `src/domain/services/promotions-engine.spec.ts` cover service orchestration and promo math.
- Gaps: no tests for invalid DTO payloads, no repository adapter tests, no serialization edge cases. Add as needed when extending.
