// Core Product Interface (Normalized)
export interface NormalizedProduct {
	asin: string;
	title: string;
	description?: string;
	brand?: string;
	category?: string;
	price?: number;
	originalPrice?: number;
	discountPercent?: number;
	rating?: number;
	reviewCount?: number;
	available: boolean;
	images: string[];
	productUrl: string;
	seller?: string;
	fulfillment?: string;
	features?: string[];
	specifications?: Record<string, any>;
	lastUpdated: Date;
}

// Raw Product from Apify/Scraper
export interface RawAmazonProduct {
	asin?: string;
	url?: string;
	title?: string;
	description?: string;
	brand?: string;
	price?: string | number;
	listPrice?: string | number;
	discount?: string | number;
	rating?: string | number;
	reviewsCount?: string | number;
	availability?: string;
	images?: string[];
	seller?: string;
	isPrime?: boolean;
	[key: string]: any;
}

// Shopping Intent from AI
export interface ShoppingIntent {
	productCategory?: string;
	keywords: string[];
	brandPreference?: string[];
	minPrice?: number;
	maxPrice?: number;
	features?: string[];
	ratingMin?: number;
	comparison?: boolean;
	urgency?: 'low' | 'medium' | 'high';
}

// Search Filters
export interface SearchFilters {
	category?: string;
	brand?: string;
	minPrice?: number;
	maxPrice?: number;
	minRating?: number;
	maxRating?: number;
	minReviewCount?: number;
	available?: boolean;
	fulfillment?: string;
	color?: string;
	size?: string;
	// Advanced filters
	brands?: string[];
	categories?: string[];
	freeShipping?: boolean;
	prime?: boolean;
	onSale?: boolean;
	features?: string[];
	condition?: 'new' | 'used' | 'refurbished';
	sortBy?:
		| 'price_asc'
		| 'price_desc'
		| 'rating'
		| 'newest'
		| 'popular'
		| 'relevance';
}

// Search Result
export interface SearchResult {
	products: NormalizedProduct[];
	total: number;
	page: number;
	limit: number;
	totalPage: number;
	source: 'cached' | 'realtime' | 'hybrid';
	query: string;
	executionTime: number;
}

// Browser Use Cloud API Response Structure
export interface BrowserUseSearchResponse {
	success: boolean;
	data: any[];
	timestamp: string;
	source: string;
}

// Sync Job Status
export interface SyncJobStatus {
	id: string;
	status: 'pending' | 'running' | 'success' | 'failed';
	type: 'full' | 'price_refresh' | 'manual';
	startedAt?: Date;
	completedAt?: Date;
	productsProcessed?: number;
	errors?: string[];
}
