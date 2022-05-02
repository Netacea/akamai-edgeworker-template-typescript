import { createHmac, randomBytes } from 'crypto'
import {
  COOKIEDELIMITER
} from './dictionary'
import { Buffer } from 'buffer'

// Using clientIP has no advantage when setting cookies in Ingest Only mode.
// We therefore use a dummy value in place of the IP.
// This brings its own advantage in that if the integration is switched
// from INGEST to MITIGATE, then the INGEST cookie will be treated as expired
// & a new MITIGATE cookie will be set
export const ingestIgnoredIpValue = 'ignored'

const BASE_62_CHARSET = '1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

export interface MitataCookie {
  signature: string
  expiry: string
  userId: string
  ipHash: string
  mitigationType: string
  match: number
  mitigate: number
  captcha: number
}

export interface CheckCookieResponse {
  mitata: MitataCookie | undefined
  requiresReissue: boolean
  isExpired: boolean
  shouldExpire: boolean
  isSameIP: boolean
  isPrimaryHashValid: boolean
  match: number
  mitigate: number
  captcha: number
}

const mitataCookieRegExp: RegExp = /^(.*)_\/@#\/(.*)_\/@#\/(.*)_\/@#\/(.*)_\/@#\/((\d)(\d)(\d))$/

export function matchMitataCookie (netaceaCookie: string | undefined): MitataCookie | undefined {
  if (netaceaCookie === undefined) {
    return undefined
  }
  const matches = netaceaCookie.match(mitataCookieRegExp)
  if (matches !== null && matches !== undefined) {
    const [, signature, expiry, userId, ipHash, mitigationType, match, mitigate, captcha] = matches
    return {
      signature,
      expiry,
      userId,
      ipHash,
      mitigationType,
      match: parseInt(match),
      mitigate: parseInt(mitigate),
      captcha: parseInt(captcha)
    }
  }
  return undefined
}

export function generateId (length: number = 16, charset: string[] = BASE_62_CHARSET): string {
  const randomBytesBuffer = randomBytes(length - 1)

  const randomString = Array.from(randomBytesBuffer)
    .map(byte => charset[byte % charset.length])
    .join('')

  return `c${randomString}`
}

export function createMitataCookie (
  clientIP: string,
  userId: string | undefined,
  expiryTime: number,
  saltKey: string,
  mitCode = '000'
): string {
  if (userId === undefined) {
    userId = generateId()
  }

  const ipHash = hexSha256(clientIP + '|' + String(expiryTime), saltKey)

  const originCookieValue = [
    expiryTime,
    userId,
    ipHash,
    mitCode
  ].join(COOKIEDELIMITER)

  const value = hexSha256(originCookieValue, saltKey)
  const cookieValue = `${value}${COOKIEDELIMITER}${originCookieValue}`
  return cookieValue
}

export function hexSha256 (value: string, saltKey: string): string {
  const hash = createHmac('sha256', saltKey)
  hash.update(value)
  return Buffer.from(hash.digest('hex')).toString('base64')
}

export function checkMitataCookie (
  netaceaCookie: string | undefined,
  clientIP: string,
  secretKey: string
): CheckCookieResponse {
  const defaultInvalidResponse: CheckCookieResponse = {
    mitata: undefined,
    requiresReissue: false,
    isExpired: false,
    shouldExpire: false,
    isSameIP: false,
    isPrimaryHashValid: false,
    captcha: 0,
    match: 0,
    mitigate: 0
  }
  if (typeof netaceaCookie !== 'string' || netaceaCookie === '') {
    return defaultInvalidResponse
  }
  const mitata = matchMitataCookie(netaceaCookie)
  if (mitata !== undefined) {
    // Check cookie signature
    const mitSvcStringValue = [
      mitata.expiry, mitata.userId, mitata.ipHash, mitata.mitigationType
    ].join(COOKIEDELIMITER)

    const currentUnixTime = Math.floor(Date.now() / 1000)
    const isExpired = parseInt(mitata.expiry) < currentUnixTime
    // serve, fail, cookiefail
    const shouldExpire = [1, 3, 5].includes(mitata.captcha)

    const currentIPHash = hexSha256(clientIP + '|' + mitata.expiry, secretKey)
    const isSameIP = mitata.ipHash === currentIPHash

    const valid = mitata.signature === hexSha256(mitSvcStringValue, secretKey)

    return {
      mitata,
      requiresReissue: isExpired || !isSameIP,
      isExpired,
      shouldExpire,
      isSameIP,
      isPrimaryHashValid: valid,
      match: mitata.match,
      mitigate: mitata.mitigate,
      captcha: mitata.captcha
    }
  }
  return defaultInvalidResponse
}
