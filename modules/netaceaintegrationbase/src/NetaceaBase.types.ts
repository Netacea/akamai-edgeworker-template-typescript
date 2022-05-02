import {
  KinesisIngestConfigArgs
} from '@netacea/kinesisingest'
import {
  NetaceaIngestType,
  NetaceaLogVersion,
  NetaceaMitigationType
} from './NetaceaBase.enums'
export interface MakeRequestArgs {
  host: string
  path: string
  headers: {[key: string]: string}
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: any
  timeout?: number
}

export interface MakeRequestResponse {
  status: number
  headers: {[key: string]: string}
  body?: any
}

export interface NetaceaBaseArgs {
  apiKey: string
  secretKey?: string
  captchaSiteKey?: string
  captchaSecretKey?: string
  timeout?: number
  retries?: number
  ingestServiceUrl?: string
  mitigationServiceUrl?: string
  mitigationType?: NetaceaMitigationType
  ingestType?: NetaceaIngestType
  kinesis?: KinesisIngestConfigArgs
  logVersion?: NetaceaLogVersion
  mitataCookieExpirySeconds?: number
}

export interface InjectHeaders {
  'x-netacea-match': string
  'x-netacea-mitigate': string
  'x-netacea-captcha': string
  'x-netacea-event-id'?: string
}

export interface ComposeResultResponse {
  body?: string
  apiCallStatus: number
  setCookie: string[]
  sessionStatus: string
  mitigation: string
  mitigated: boolean
  injectHeaders?: InjectHeaders
}

export interface IngestArgs {
  ip: string
  userAgent: string
  status: string
  method: string
  path: string
  protocol: string
  referer: string
  bytesSent: string | number
  requestTime: string | number
  mitataCookie?: string
  sessionStatus?: string
  integrationType?: string
  integrationVersion?: string
}

export interface WebLog {
  Request: string
  TimeLocal: string
  RealIp: string
  UserAgent: string
  Status: string
  RequestTime: string
  BytesSent: string
  Referer: string
  NetaceaUserIdCookie: string
  NetaceaMitigationApplied: string
  IntegrationType?: string
  IntegrationVersion?: string
}

export interface V2WebLog {
  '@timestamp': string
  bc_type?: string
  bytes_sent: number
  client: string
  // domain_name keys will be nullable for now
  // we don't use them on the integrations
  domain_name?: string
  domain_name_orig?: string
  hour: number
  integration_type?: string
  integration_version?: string
  method: string
  minute: number
  path: string
  protocol: string
  query?: string
  referrer?: string
  request: string
  request_time: number
  status: string
  user_agent: string
  user_id?: string
}

export interface NetaceaResponseBase {
  setCookie?: string[]
  sessionStatus: string
}

export interface MitigateResponse<T = any> extends NetaceaResponseBase {
  response?: T
}

export interface InjectResponse<T = any> extends MitigateResponse<T> {
  injectHeaders: InjectHeaders | undefined
  response?: T | undefined
}

export type NetaceaMitigationResponse<T> = MitigateResponse<T> | InjectResponse<T> | undefined
