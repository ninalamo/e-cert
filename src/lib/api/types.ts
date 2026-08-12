export interface PaginationMeta {
  limit: number;
  offset: number;
  total: number;
  has_more: boolean;
}

export interface ApiResponse<T> {
  data: T;
  meta?: PaginationMeta;
}

export interface ApiError {
  status: "error";
  message: string;
  errors?: Record<string, string[]>;
}

export interface BulkResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  email?: string;
}

export interface BulkResponse<T> {
  results: BulkResult<T>[];
}
