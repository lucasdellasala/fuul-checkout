# Fuul Checkout

Production-ready NestJS checkout service with layered architecture, optimistic concurrency, and idempotency support.

## Requirements

- Node.js 20+
- npm or yarn

## Quick Start

```bash
npm install
npm run start:dev
npm test
npm run test:e2e
```

## Architecture

This project follows a **layered architecture** with clear separation of concerns:

### Domain Layer (`src/domain`)
- **Pure TypeScript** - no framework dependencies
- Contains business logic: entities (`Cart`), value objects (`Money`, `SKU`), domain services (`PromotionsEngine`)
- Framework-agnostic and fully testable in isolation
- Defines ports (interfaces) for external dependencies: `CartRepositoryPort`, `PriceProviderPort`

### Application Layer (`src/application`)
- **NestJS services** that orchestrate domain operations
- Implements use cases: `CheckoutService` coordinates cart operations
- Depends on domain layer, not infrastructure
- Handles idempotency and coordinates between domain and infrastructure

### Infrastructure Layer (`src/infrastructure`)
- **NestJS controllers, modules, and adapters**
- Implements domain ports: `InMemoryCartRepository`, `ExternalTokenPriceService`
- Handles HTTP requests/responses, DTOs, mappers
- Framework-specific concerns (NestJS, Express)

**Dependency Flow**: Domain ← Application ← Infrastructure

## Key Design Decisions

### Promotions Evaluation: On `getTotal()`, Not `scan()`

Promotions are calculated only when `getTotal()` is called, not during `scan()`. This design choice has several benefits:

1. **Performance**: `scan()` operations remain fast - they only add items to the cart without complex calculations
2. **Price Freshness**: Promotions are evaluated with the latest prices at checkout time
3. **Flexibility**: Promotions can depend on the complete cart state (e.g., total quantity across all items)
4. **Separation of Concerns**: Cart modification (`scan`) is separate from pricing calculation (`getTotal`)

**Caching Strategy** (Future Enhancement):
- Cache promotion results per cart snapshot hash
- Invalidate cache when cart items change
- Cache key: `cartId:version:priceHash`
- TTL: Short-lived (e.g., 30 seconds) to balance performance and freshness

### Idempotency Strategy

**Implementation**:
- Clients provide `Idempotency-Key` header in `POST /carts/:id/items` requests
- Service creates a fingerprint from `sku + quantity` to detect request changes
- In-memory store maps: `idempotencyKey → { cartVersion, fingerprint }`

**Conflict Behavior**:
- **Same key + same fingerprint**: Returns cached result (same cart version) - request is duplicate
- **Same key + different fingerprint**: Returns `409 Conflict` with code `IDEMPOTENCY_KEY_CONFLICT` - client attempted to reuse key with different request

**Why This Works**:
- Idempotency check happens **before** cart modification
- Prevents duplicate charges and ensures safe retries
- Fingerprint ensures request content matches previous use of the key

**Future Enhancement**: Move to distributed store (Redis) for multi-instance deployments

### Optimistic Concurrency Control

**Current Implementation**:
- Each `Cart` maintains a `version` number that increments on every `addItem()`
- `CartRepositoryPort.save(cart, expectedVersion)` throws `CartVersionConflictError` if versions don't match
- Controller implements single retry on version conflicts

**Database Mapping** (Production):
- **Row Version**: Use database column (e.g., `version INT` or `rowversion` in SQL Server)
- **ETag Pattern**: Use `ETag` header for HTTP-level versioning
- **Update Query**: `UPDATE carts SET ..., version = version + 1 WHERE id = ? AND version = ?`
- **Conflict Detection**: If `affectedRows === 0`, version mismatch occurred

**Example SQL**:
```sql
UPDATE carts 
SET items = ?, version = version + 1 
WHERE id = ? AND version = ?
-- Returns 0 rows if version mismatch
```

**Benefits**:
- No distributed locks required
- High throughput under normal load
- Automatic conflict detection

**Trade-offs**:
- Clients may need to retry on conflicts
- Under high contention, multiple retries may be needed

### Price Refresh Strategy

**Current Behavior**: `getTotal()` **always** fetches fresh prices from `PriceProviderPort`

**Rationale**:
- Prices can change frequently (crypto volatility)
- Users should see current prices at checkout
- Prevents stale pricing issues

**Implications**:
- **Consistency**: Each `getTotal()` call may show different prices if prices changed
- **Freshness**: Always shows latest prices
- **Performance**: Additional API call on every total calculation

**Future Enhancements**:
- **Price Caching**: Cache prices with short TTL (e.g., 5-10 seconds)
- **Price Timestamps**: Include `priceTimestamp` in response (already implemented)
- **Price Versioning**: Track price versions to detect changes
- **Stale-While-Revalidate**: Return cached prices while fetching fresh ones in background

## Domain Models

### Money Value Object
- Uses **wei** (1 ETH = 10^18 wei) stored as `bigint` for precision
- Avoids floating-point errors in financial calculations
- Provides `fromEther()` and `toEther()` for conversion

### Cart Entity
- Tracks items by SKU with quantities
- Maintains version for optimistic locking
- Creates immutable snapshots for pricing calculations

### Promotions Engine
- **Policy**: One promotion per SKU, selected by highest priority (DESC), then by promotion id (ASC) for ties
- **Generic, config-driven promos**:
  - `N_FOR_M` (NxM like 2x1, 3x2): final units charged = `floor(q/n)*m + (q % n)`
  - `BULK_PERCENT`: percent off when quantity >= threshold
- **Current config** (`src/domain/promotions/promotions.config.ts`):
  - APE 2x1 → `kind: 'N_FOR_M', n: 2, m: 1` (id `APE_2_FOR_1`)
  - PUNK 20% off 3+ → `kind: 'BULK_PERCENT', minQty: 3, percentOff: 0.2` (id `PUNK_BULK_20_OFF`)
  - MEEBIT: No promotion
- **Clarification**: The challenge lists a scenario “APE, PUNK, APE = 210 ETH”, which conflicts with the 2-for-1 rule (and its own 3-for-2 example). We follow the rule: that scenario totals 135 ETH (pay 1 APE + 1 PUNK).

## API Endpoints

- `POST /carts` - Create new cart
- `POST /carts/:id/items` - Add item (requires `Idempotency-Key` header)
- `GET /carts/:id/total` - Get pricing breakdown with promotions

**Error Codes**:
- `VERSION_CONFLICT` (409) - Optimistic concurrency conflict
- `IDEMPOTENCY_KEY_CONFLICT` (409) - Idempotency key reused with different request
- `NOT_FOUND` (404) - Cart not found

## Promotions Wiring

- Configured once in `src/domain/promotions/promotions.config.ts` and instantiated via `PromotionsFactory` (`src/domain/services/promotions-factory.ts`).
- `CheckoutModule` builds `PromotionsEngine` with `factory.build(promotionsConfig)`; tests reuse the same config/factory to stay in sync.
- Public APIs remain unchanged (`CheckoutService.getTotal`, DTOs, controllers); only the promo wiring is data-driven now.

## Future Improvements

1. **Persistent Repository**
   - Replace in-memory store with database (PostgreSQL, MongoDB)
   - Implement proper transaction handling
   - Add database migrations

2. **Distributed Idempotency Store**
   - Move from in-memory to Redis or database
   - Support multi-instance deployments
   - Add TTL for automatic cleanup

3. **Rate Limiting**
   - Implement per-cart rate limits
   - Protect against abuse
   - Use sliding window or token bucket algorithm

4. **Authentication & Authorization**
   - Add JWT-based authentication
   - Implement cart ownership checks
   - Add role-based access control

5. **Price Caching**
   - Cache prices with short TTL
   - Implement stale-while-revalidate pattern
   - Add price change notifications

6. **Monitoring & Observability**
   - Add structured logging
   - Implement distributed tracing
   - Add metrics (Prometheus, Datadog)

7. **Event Sourcing** (Optional)
   - Store cart events instead of state
   - Enable audit trails
   - Support time-travel debugging

## Testing

```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e

# Coverage
npm run test:cov
```

## Project Structure

```
fuul-checkout/
├── src/
│   ├── domain/              # Pure TypeScript domain layer
│   │   ├── entities/        # Cart
│   │   ├── value-objects/   # Money, SKU
│   │   ├── services/        # PromotionsEngine
│   │   └── interfaces/      # Ports (CartRepositoryPort, PriceProviderPort)
│   ├── application/         # NestJS services
│   │   └── checkout.service.ts
│   └── infrastructure/      # Controllers, adapters
│       ├── controllers/     # HTTP endpoints
│       ├── persistence/     # Repository implementations
│       └── providers/      # External service adapters
└── test/                    # E2E tests
```
