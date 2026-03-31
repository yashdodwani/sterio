import { SetMetadata } from '@nestjs/common';

export const REQUIRE_PAYMENT_METADATA_KEY = 'require_payment';

/**
 * Mark endpoint/class as paywalled.
 * - @RequirePayment() on method: require payment only for this endpoint.
 * - @RequirePayment() on controller: require payment for all controller routes.
 */
export const RequirePayment = () =>
	SetMetadata(REQUIRE_PAYMENT_METADATA_KEY, true);
