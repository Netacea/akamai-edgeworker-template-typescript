import hmacSHA256 from 'crypto-js/hmac-sha256'
import hex from 'crypto-js/enc-hex'
import { Buffer } from 'buffer'

type Algorithm = 'sha256'
type Encoder = 'hex'

class HMac {
  algorithm: Algorithm
  key: any
  plainText = ''
  constructor (algorithm: Algorithm, key: any = '') {
    this.algorithm = algorithm
    this.key = key
  }

  update (plainText: string, encoding?: string): HMac {
    this.plainText = plainText
    return this
  }

  digest (encoding?: Encoder): string {
    if (this.algorithm === 'sha256' || encoding !== 'hex') {
      const { message, key } = { message: this.plainText, key: this.key }
      return hmacSHA256(message, key).toString(hex)
    }
    throw new Error(`algorithm and encoding pair not supported ${String(this.algorithm)} ${String(encoding)}`)
  }
}

export const createHmac = (algorithm: Algorithm, key: any, options?: any): any => {
  return new HMac(algorithm, key)
}
export const randomBytes = (size: number): Buffer => {
  let randomBytes = new Uint8Array(size).fill(255)
  randomBytes = randomBytes.map(val => val * Math.random())
  return Buffer.from(randomBytes)
}

export default {
  createHmac,
  randomBytes
}
