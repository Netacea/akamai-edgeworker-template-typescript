import * as tape from 'tape'
import NetaceaBase, {
  MakeRequestArgs,
  MakeRequestResponse,
  MitigateResponse,
  NetaceaMitigationType,
  NetaceaResponseBase
} from '../src'
import { COOKIEDELIMITER } from '../src/dictionary'

import {
  generateId,
  createMitataCookie,
  checkMitataCookie,
  hexSha256,
  ingestIgnoredIpValue
} from '../src/mitataCookie'

class Base extends NetaceaBase {
  async makeRequest (args: MakeRequestArgs): Promise<MakeRequestResponse> {
    return await Promise.reject(new Error('Method not implemented.'))
  }

  // eslint-disable-next-line
  mitigate (...args: any[]): Promise<MitigateResponse<any>> {
    throw new Error('Method not implemented.')
  }

  // eslint-disable-next-line
  ingest (...args: any[]): Promise<any> {
    throw new Error('Method not implemented.')
  }

  // eslint-disable-next-line
  inject (...args: any[]): Promise<any> {
    throw new Error('Method not implemented.')
  }

  public callReadCookie (cookieName: string, cookies?: string | null | undefined): string | undefined {
    return this.readCookie(cookieName, cookies)
  }

  public callUserId (length?: number): string {
    return generateId(length)
  }

  public callWorkerCookie (
    clientIP: string,
    userId: string,
    expiryTime: number,
    saltKey: string
  ): string {
    return createMitataCookie(clientIP, userId, expiryTime, saltKey)
  }

  public callSetIngestOnlyMitataCookie (
    userId: string | undefined
  ): NetaceaResponseBase {
    return this.setIngestOnlyMitataCookie(userId)
  }

  getCookieHeader (args: any): string | null {
    throw new Error('Method not implemented.')
  }
}

tape('NetaceaBase :: Reads cookie strings correctly', (t: tape.Test) => {
  t.plan(6)
  const cookies = {
    _mitata: 'abc',
    _mitatacaptcha: 'def',
    randomcookie: 'value'
  }
  let cookieString = ''
  for (const [key, value] of Object.entries(cookies)) {
    cookieString += `${key}=${value}; `
  }
  const worker = new Base({
    mitigationType: NetaceaMitigationType.MITIGATE,
    apiKey: ''
  })
  const mitata = worker.callReadCookie('_mitata', cookieString)
  const mitataCaptcha = worker.callReadCookie('_mitatacaptcha', cookieString)
  const randomCookie = worker.callReadCookie('randomcookie', cookieString)
  const nonExistentCookie = worker.callReadCookie('thisdoesnotexist', cookieString)
  const nullCookieString = worker.callReadCookie('abc', null)
  const undefinedCookieString = worker.callReadCookie('abc', undefined)

  t.equals(mitata, cookies._mitata, 'mitata is correct')
  t.equals(mitataCaptcha, cookies._mitatacaptcha, 'mitata is correct')
  t.equals(randomCookie, cookies.randomcookie, 'randomcookie is correct')
  t.equals(nonExistentCookie, undefined, 'non existent cookie returns undefined')
  t.equals(nullCookieString, undefined, 'non existent cookie string returns undefined')
  t.equals(undefinedCookieString, undefined, 'non existent cookie string returns undefined')
})

tape('Netaceabase :: generateId', (t: tape.Test) => {
  t.plan(3)

  const worker = new Base({
    apiKey: '',
    mitigationType: NetaceaMitigationType.INGEST
  })

  const numberOfUserIds = 100
  const userIds = Array(numberOfUserIds).fill(0).map(() => worker.callUserId())

  const userIdLengths = Array.from(new Set(userIds.map(id => id.length)))
  const userIdPrefixes = Array.from(new Set(userIds.map(id => id[0])))

  t.equal(userIds.length, numberOfUserIds, `${numberOfUserIds} user IDs created for test`)
  t.deepEqual(userIdLengths, [16], 'all user IDs are 16 chars long')
  t.deepEqual(userIdPrefixes, ['c'], 'all ids are prefixed with c')
})

tape('mitata cookie :: createMitataCookie', (t: tape.Test) => {
  t.plan(5)

  const worker = new Base({
    apiKey: '',
    mitigationType: NetaceaMitigationType.INGEST
  })

  const expectedClientIP = '1.2.3.4'
  const userId = worker.callUserId()
  const expectedExpiry = 60
  const result = worker.callWorkerCookie(expectedClientIP, userId, expectedExpiry, 'saltKey')

  const [, expiry, id, ipHash, ingestValue] = result.split(COOKIEDELIMITER)

  const expectedIpHash = hexSha256(expectedClientIP + '|' + expiry, 'saltKey')
  t.equals(ipHash, expectedIpHash, 'correct IP + timestamp hash')

  t.equals(parseInt(expiry), expectedExpiry, 'returns expected expiry')
  t.equals(id, userId, 'returns expected userId')
  t.equals(ingestValue, '000', 'returns expected ingestValue')
  t.true(result, 'cookie is returned')
})

// eslint-disable-next-line max-lines-per-function
tape('mitata cookie :: setIngestOnlyMitataCookie', (t: tape.Test) => {
  t.plan(2)

  const worker = new Base({
    apiKey: '',
    secretKey: 'secret',
    mitigationType: NetaceaMitigationType.INGEST
  })

  t.test('will return a new cookie with the same userId when a userId arg is passed', (t: tape.Test) => {
    t.plan(9)
    const dateUnixTime = Math.floor(Date.now() / 1000)
    const expectedUserId = worker.callUserId()
    const result = worker.callSetIngestOnlyMitataCookie(expectedUserId)

    if (result.setCookie !== undefined) {
      const [cookie, maxAge, cookiePath] = result.setCookie[0].split('; ')
      const [mitata, expiry, userId, ipHash, ingestValue] = cookie.split(COOKIEDELIMITER)

      const expectedIpHash = hexSha256(ingestIgnoredIpValue + '|' + expiry, 'secret')
      t.equals(ipHash, expectedIpHash, 'correct IP + timestamp hash')

      t.true(mitata.includes('_mitata='), '_mitata cookie is set')
      t.equals(expiry, (dateUnixTime + 60 * 60).toString(), 'expiry is set correctly')
      t.true(userId.startsWith('c'), 'userId is is prefixed with c')
      t.equals(userId.length, 16, 'userId length is correct')
      t.equals(userId, expectedUserId, 'userId is correct')
      t.equals(ingestValue, '000', 'ingestValue is 000')
      t.equals(maxAge, 'Max-Age=86400', 'sets cookie max age to 1 day (in seconds)')
      t.equals(cookiePath, 'Path=/', 'sets cookie path correctly')
    }
  })

  t.test('will return cookie when userId is undefined', (t: tape.Test) => {
    t.plan(8)
    const dateUnixTime = Math.floor(Date.now() / 1000)

    const result = worker.callSetIngestOnlyMitataCookie(undefined)

    if (result.setCookie !== undefined) {
      const [cookie, maxAge, cookiePath] = result.setCookie[0].split('; ')
      const [mitata, expiry, userId, ipHash, ingestValue] = cookie.split(COOKIEDELIMITER)

      const expectedIpHash = hexSha256(ingestIgnoredIpValue + '|' + expiry, 'secret')
      t.equals(ipHash, expectedIpHash, 'correct IP + timestamp hash')

      t.true(mitata.includes('_mitata='), '_mitata cookie is set')
      t.equals(expiry, (dateUnixTime + 60 * 60).toString(), 'expiry is set correctly')
      t.true(userId.startsWith('c'), 'userId is is prefixed with c')
      t.equals(userId.length, 16, 'userId length is correct')
      t.equals(ingestValue, '000', 'ingestValue is 000')
      t.equals(maxAge, 'Max-Age=86400', 'sets cookie max age to 1 day (in seconds)')
      t.equals(cookiePath, 'Path=/', 'sets cookie path correctly')
    }
  })
})

tape('mitata cookie :: checkMitataCookie from same client IP', (t: tape.Test) => {
  const clientIP = '1.2.3.4'
  const userId = 'expected-user-id'
  const expiry = Math.floor(Date.now() / 1000)
  const secretKey = 'secret1234'
  const code = '000'

  const mitata = createMitataCookie(clientIP, userId, expiry, secretKey, code)
  const cookieChecks = checkMitataCookie(mitata, clientIP, secretKey)
  t.true(cookieChecks.isPrimaryHashValid, 'cookie is valid')
  t.false(cookieChecks.isExpired, 'cookie is not expired')
  t.true(cookieChecks.isSameIP, 'cookie is from same IP')
  t.end()
})

tape('mitata cookie :: checkMitataCookie from new client IP', (t: tape.Test) => {
  const clientIP = '1.2.3.4'
  const userId = 'expected-user-id'
  const expiry = Math.floor(Date.now() / 1000)
  const secretKey = 'secret1234'
  const code = '000'

  const mitata = createMitataCookie(clientIP, userId, expiry, secretKey, code)
  const cookieChecks = checkMitataCookie(mitata, '4.3.2.1', secretKey)
  t.true(cookieChecks.isPrimaryHashValid, 'cookie is valid')
  t.false(cookieChecks.isExpired, 'cookie is not expired')
  t.false(cookieChecks.isSameIP, 'cookie is NOT from same IP')
  t.end()
})
