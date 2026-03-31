import { NormalizedProduct } from '../interfaces';
import { PaginationResponseDto } from './pagination.dto';

export class ApiResponse<T> {
	success: boolean;
	code: number;
	msg?: string;
	data: T | null;

	constructor(
		success: boolean,
		code: number,
		data: T | null = null,
		msg?: string,
	) {
		this.success = success;
		this.code = code;
		this.data = data;
		this.msg = msg;
	}

	static success<T>(data: T, code: number = 200, msg?: string): ApiResponse<T> {
		return new ApiResponse(true, code, data, msg);
	}

	static error<T>(
		code: number,
		msg: string,
		data: T | null = null,
	): ApiResponse<T> {
		return new ApiResponse(false, code, data, msg);
	}
}

export class SearchResponseDto extends PaginationResponseDto {
	products: NormalizedProduct[];
	source: 'cached' | 'realtime' | 'hybrid';
	query: string;
	executionTime: number;
}

export class AiQueryResponseDto {
	message: string;
	products: NormalizedProduct[];
	intent: any;
	suggestions?: string[];
}

export class HealthResponseDto {
	status: string;
	uptime: number;
	timestamp: string;
	environment: string;
	services: {
		database?: string;
		search?: string;
		mcp?: string;
		apify?: string;
	};
}
