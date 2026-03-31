import { hexToU8a, u8aToHex } from '@polkadot/util';
import { decodeAddress, encodeAddress } from '@polkadot/util-crypto';

/**
 * Convert hex value to decimal number
 */
export function convertHexToDecimal(hexValue: string | number): number {
	if (typeof hexValue === 'number') {
		return hexValue;
	}

	if (!hexValue || typeof hexValue !== 'string') {
		return 0;
	}

	try {
		// Remove 0x prefix if present and convert to decimal
		const cleanHex = hexValue.startsWith('0x') ? hexValue.slice(2) : hexValue;
		return parseInt(cleanHex, 16);
	} catch (error) {
		console.warn(
			`Failed to convert hex to decimal ${hexValue}: ${error.message}`,
		);
		return 0; // Return 0 if conversion fails
	}
}

/**
 * Convert hex string to UTF-8 string
 */
export function convertHexToString(hexValue: string): string {
	if (!hexValue || typeof hexValue !== 'string') {
		return hexValue;
	}

	try {
		// Remove 0x prefix if present
		const cleanHex = hexValue.startsWith('0x') ? hexValue.slice(2) : hexValue;

		// Convert hex to bytes, then to string
		const bytes = hexToU8a(`0x${cleanHex}`);
		return new TextDecoder().decode(bytes);
	} catch (error) {
		console.warn(`Failed to convert hex to string ${hexValue}: ${error.message}`);
		return hexValue; // Return original if conversion fails
	}
}

/**
 * Convert various raw field representations to a 0x-prefixed hex string.
 *   - Nested list [[1, 2, 3, ...]] or flat list [1, 2, 3, ...] of bytes
 *   - Hex string without 0x prefix (64 chars = 32-byte AccountId)
 *   - Already 0x-prefixed hex string
 */
export function bytesToHex(value: unknown): string | null {
	if (Array.isArray(value)) {
		let arr: unknown[] = value;
		// Handle nested list [[1, 2, 3, ...]]
		if (arr.length === 1 && Array.isArray(arr[0])) {
			arr = arr[0] as unknown[];
		}
		if (arr.every((b) => typeof b === 'number')) {
			return '0x' + Buffer.from(arr as number[]).toString('hex');
		}
	}
	if (typeof value === 'string') {
		if (value.startsWith('0x')) return value;
		// 64-char hex string = 32-byte pubkey without 0x prefix
		if (/^[0-9a-fA-F]{64}$/.test(value)) return '0x' + value;
	}
	return null;
}

/**
 * Safely convert value to BigInt
 */
export function safeBigInt(value: unknown): bigint | null {
	try {
		if (typeof value === 'bigint') {
			return value;
		}
		if (typeof value === 'number') {
			return BigInt(value);
		}
		if (typeof value === 'string' && value.trim().length > 0) {
			return BigInt(value.trim());
		}
		return null;
	} catch {
		return null;
	}
}

/**
 * Normalize account address to hex format
 */
export function normalizeAccountHex(value: unknown): string | null {
	if (typeof value !== 'string' || value.trim().length === 0) {
		return null;
	}

	const normalized = value.trim();
	if (normalized.startsWith('0x')) {
		return normalized.toLowerCase();
	}

	try {
		return u8aToHex(decodeAddress(normalized)).toLowerCase();
	} catch {
		try {
			return u8aToHex(hexToU8a(normalized)).toLowerCase();
		} catch {
			return null;
		}
	}
}
