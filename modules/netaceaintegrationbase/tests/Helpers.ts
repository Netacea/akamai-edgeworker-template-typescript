import { createMitataCookie, checkMitataCookie, CheckCookieResponse } from '@netacea/netaceaintegrationbase'

export function checkMitataCookieSet (
  cookieSet: string | undefined,
  clientIP: string,
  secretKey: string
): CheckCookieResponse {
  const matchedCookie = cookieSet?.match(/^(?:_mitata=)([^;]+)(?:;.*)?$/)
  return checkMitataCookie(matchedCookie?.[1], clientIP, secretKey)
}

const defaultUserId = 'c123456789012345'
const defaultClientIP = '255.255.255.255'
export const defaultSecret = 'secret'
export const buildMitata = ({
  clientIP = defaultClientIP,
  userId = defaultUserId,
  expiry = Math.floor(Date.now() / 1000) + 60,
  type = '000',
  secret = defaultSecret
}: {
  clientIP?: string
  userId?: string
  expiry?: number
  type?: string
  secret?: string
}): string => {
  return createMitataCookie(clientIP, userId, expiry, secret, type)
}

export const mitataCookieValues = {
  valid: buildMitata({
    type: '000'
  }),
  captcha: {
    userAgent: buildMitata({
      userId: 'uid-captcha-user-agent',
      type: '111',
      expiry: 1000
    }),
    ip: buildMitata({
      userId: 'uid-captcha-ip',
      type: '211',
      expiry: 1000
    }),
    captchaPost: {
      userAgent: buildMitata({
        userId: 'uid-captcha-post-user-agent',
        type: '112'
      }),
      ip: buildMitata({
        userId: 'uid-captcha-post-ip',
        type: '212'
      })
    }
  },
  block: {
    userAgent: buildMitata({
      type: '130',
      expiry: 1000
    }),
    ip: buildMitata({
      type: '230',
      expiry: 1000
    })
  },
  trust: {
    userAgent: buildMitata({
      type: '120'
    }),
    ip: buildMitata({
      type: '220'
    })
  }
}
