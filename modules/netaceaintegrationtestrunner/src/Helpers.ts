import { checkMitataCookie, CheckCookieResponse } from '@netacea/netaceaintegrationbase'

export const defaultApiKey = 'apiKey'
export const defaultSecretKey = 'secret'
export const defaultClientIP = '255.255.255.255'

export function checkMitataCookieSet (
  cookieSet: string | undefined,
  clientIP: string = defaultClientIP,
  secretKey: string = defaultSecretKey
): CheckCookieResponse {
  const matchedCookie = cookieSet?.match(/^(?:_mitata=)([^;]+)(?:;.*)?$/)
  return checkMitataCookie(matchedCookie?.[1], clientIP, secretKey)
}
