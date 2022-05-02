/**
 * Concise description of an HTTP request which
 * should map closely to the HTTP specification & therefore be
 * easy to mock in any worker.
 */
export interface HttpRequest {
  url: string
  method: 'POST' | 'GET'
  body: string
  headers: { [key: string]: string[] }
}

/**
 * Concise description of an HTTP response which
 * should map closely to the HTTP specification & therefore be
 * easy to mock in any worker.
 */
export interface HttpResponse {
  status: number
  body?: string
  headers: { [key: string]: string[] }
}

// We should move toward this being more generic.
// Eventually, ClientRequest = HttpRequest
export interface ClientRequest {
  protocol: 'HTTP/1.0' | 'HTTP/1.1'
  url: string
  userAgent: string
  method: 'GET' | 'POST' | 'PUT' | 'OPTIONS'
  cookieHeader?: string
  ipAddress: string
  body?: string
  headers?: { [key: string]: string }
}

export type ClientResponse = HttpResponse

export type MitigationRequest = HttpRequest
export type MitigationResponse = HttpResponse

/**
 * High level interface for describing a Mitigation Service Response.
 * This is easier for using in test assertion but hard for use in mocks.
 */
export interface MitigationServiceResponse {
  match?: string
  mitigate?: string
  captcha?: string
  mitataExpiry?: string
  mitataCaptcha?: string
  mitataCaptchaExpiry?: string
  status: number
  body?: string
  eventId?: string
}

export type IngestRequest = HttpRequest
export type IngestResponse = HttpResponse

export interface IntegrationTestScenario {
  comment: string
  expectedSessionStatus: string
  workerArgs?: { [key: string]: any }
  mitigationServiceResponse?: MitigationServiceResponse | Error
  ingestResponse?: Error
  clientRequest: ClientRequest
  /**
   * Blocked request won't contact the origin so originResponse may be undefined
   */
  originResponse: HttpResponse | undefined
  expectedClientResponse: HttpResponse
}

export interface ExpectedStatusCodes {
  blocked: number
  captcha: number
}
