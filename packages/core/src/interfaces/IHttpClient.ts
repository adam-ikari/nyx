export interface HttpResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
}

export interface IHttpClient {
  post(url: string, body: string, headers?: Record<string, string>): Promise<HttpResponse>;
  postStream(url: string, body: string, headers?: Record<string, string>): AsyncIterable<string>;
}
