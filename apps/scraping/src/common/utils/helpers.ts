/**
 * Parse price string to number
 * Examples: "$29.99", "29.99", "$1,234.56"
 */
export function parsePrice(price: string | number | undefined): number | null {
	if (price === undefined || price === null) return null;
	if (typeof price === 'number') return price;

	const cleaned = price.toString().replace(/[$,]/g, '');
	const parsed = parseFloat(cleaned);

	return isNaN(parsed) ? null : parsed;
}

/**
 * Parse rating string to number
 * Examples: "4.5 out of 5 stars", "4.5", "4.5 stars"
 */
export function parseRating(
	rating: string | number | undefined,
): number | null {
	if (rating === undefined || rating === null) return null;
	if (typeof rating === 'number') return rating;

	const match = rating.toString().match(/(\d+\.?\d*)/);
	if (!match) return null;

	const parsed = parseFloat(match[1]);
	return parsed >= 0 && parsed <= 5 ? parsed : null;
}

/**
 * Parse review count string to number
 * Examples: "1,234 reviews", "1234", "1.2K"
 */
export function parseReviewCount(
	count: string | number | undefined,
): number | null {
	if (count === undefined || count === null) return null;
	if (typeof count === 'number') return count;

	const str = count.toString();

	// Handle K, M suffixes
	if (str.includes('K')) {
		return Math.round(parseFloat(str.replace(/[^0-9.]/g, '')) * 1000);
	}
	if (str.includes('M')) {
		return Math.round(parseFloat(str.replace(/[^0-9.]/g, '')) * 1000000);
	}

	// Remove commas and parse
	const cleaned = str.replace(/[^0-9]/g, '');
	const parsed = parseInt(cleaned, 10);

	return isNaN(parsed) ? null : parsed;
}

/**
 * Extract ASIN from Amazon URL
 */
export function extractAsin(url: string): string | null {
	if (!url) return null;

	// Pattern: /dp/ASIN or /product/ASIN or /gp/product/ASIN
	const match = url.match(/\/(dp|product|gp\/product)\/([A-Z0-9]{10})/i);
	return match ? match[2] : null;
}

/**
 * Add Amazon affiliate tag to URL
 */
export function addAffiliateTag(url: string, tag: string): string {
	if (!url || !tag) return url;

	const urlObj = new URL(url);
	urlObj.searchParams.set('tag', tag);
	return urlObj.toString();
}

/**
 * Check if product is available based on availability string
 */
export function isAvailable(
	availability: string | boolean | undefined,
): boolean {
	if (!availability) return false;

	if (typeof availability === 'boolean') {
		return availability;
	}

	const lower = availability.toLowerCase();
	return (
		lower.includes('in stock') ||
		lower.includes('available') ||
		lower.includes('ships within')
	);
}

/**
 * Calculate discount percentage
 */
export function calculateDiscount(
	originalPrice: number,
	currentPrice: number,
): number {
	if (!originalPrice || !currentPrice || originalPrice <= currentPrice) {
		return 0;
	}

	return Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
}

/**
 * Clean and normalize text
 */
export function cleanText(text: string | undefined): string | undefined {
	if (!text) return undefined;

	return text.trim().replace(/\s+/g, ' ').replace(/\n+/g, ' ');
}

/**
 * Generate Amazon search URL
 */
export function generateAmazonSearchUrl(query: string, filters?: any): string {
	const baseUrl = 'https://www.amazon.com/s';
	const params = new URLSearchParams();

	params.set('k', query);

	if (filters?.minPrice) params.set('low-price', filters.minPrice.toString());
	if (filters?.maxPrice) params.set('high-price', filters.maxPrice.toString());
	if (filters?.minRating)
		params.set('rh', `p_72:${Math.floor(filters.minRating * 100)}-`);

	return `${baseUrl}?${params.toString()}`;
}
