import type {
  AxiosStatic
} from 'axios'
export type MakeRequest = (args: MakeRequestArgs) => Promise<MakeRequestResponse>

export interface CaptchaFeedbackArgs {
  /**
   * API Key provided by Netacea
   */
  apiKey: string
  /**
   * OPTIONAL - Mitigation Service URL provided by Netacea
   */
  mitigationServiceUrl?: string
  /**
   * Overridable HTTP implementation
   * If this is not provided - AXIOS shoulld be installed as a peer dependency.
   * Error thrown if this is not provided and AXIOS is not installed.
   * Install axios with `npm i axios --save`
   */
  makeRequest?: MakeRequest
}
export interface UpdateCaptchaArgs {
  /**
   * Incoming clients IP Address
   */
  clientIp: string
  /**
   * Event ID that Netacea provided on the `x-netacea-event-id` header
   * This should be the eventID in realtion to the event when a user was served captcha
   */
  eventId: string
  /**
   * The entire `cookie` header received from the client
   */
  cookieHeader: string
  /**
   * Client's user-agent header
   */
  userAgent: string
  /**
   * Result of the captcha
   * Captcha Passed = true
   * Captcha Failed = false
   */
  result: boolean
}

export interface UpdateCaptchaResponse {
  /**
   * The cookies object should be set as a set-cookie header in your origin server's response
   * There will be a `_mitata` cookie and an optional `_mitatacaptcha` cookie set in this response.
   * They follow the standard set-cookie header format.
   */
  cookies: string[]
}

export interface MakeRequestArgs {
  /**
   * The URL so send the request to. This includes the path.
   */
  url: string
  /**
   * HTTP Method
   */
  method: 'POST'
  /**
   * Key, value of header values.
   * These all need to be sent with the request.
   */
  headers: {[key: string]: string}
  /**
   * Request body to send with the request
   */
  body: {
    result: boolean
    eventId: string
  }
}

export interface MakeRequestResponse {
  status: number
  headers: {[key: string]: string}
}

export default class CaptchaFeedback {
  private readonly apiKey: string
  private readonly mitigationServiceUrl: string
  private readonly makeRequest?: MakeRequest
  private axios: AxiosStatic | undefined
  constructor ({
    apiKey,
    mitigationServiceUrl = 'https://mitigations.netacea.net',
    makeRequest
  }: CaptchaFeedbackArgs) {
    if (apiKey === null || apiKey === undefined) {
      throw new Error('Netacea: apiKey is a required parameter')
    }
    this.apiKey = apiKey
    this.mitigationServiceUrl = mitigationServiceUrl
    this.makeRequest = makeRequest
  }

  public async updateCaptcha ({
    clientIp,
    eventId,
    cookieHeader,
    result,
    userAgent
  }: UpdateCaptchaArgs): Promise<UpdateCaptchaResponse> {
    try {
      const response = await this.makeOutboundCall({
        body: {
          eventId,
          result
        },
        headers: {
          'content-type': 'application/json; charset=utf-8',
          'x-netacea-api-key': this.apiKey,
          'x-netacea-client-ip': clientIp,
          'user-agent': userAgent,
          'cookie': cookieHeader
        },
        method: 'POST',
        url: `${this.mitigationServiceUrl}/UpdateCaptcha`
      })
      if (response.status !== 200) {
        throw new Error(`Netacea: Non-200 status code returned from XHR call. Code was ${response.status}`)
      }
      const mitata = response.headers['x-netacea-mitata-value']
      const mitataExpiry = response.headers['x-netacea-mitata-expiry']
      const mitataCaptcha = response.headers['x-netacea-mitatacaptcha-value']
      const mitataCaptchaExpiry = response.headers['x-netacea-mitatacaptcha-expiry']
      return {
        cookies: [
          `_mitata=${mitata}; Max-Age=${mitataExpiry}; Path=/;`,
          `_mitatacaptcha=${mitataCaptcha}; Max-Age=${mitataCaptchaExpiry}; Path=/;`
        ]
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e)
      return {
        cookies: []
      }
    }
  }

  private async getAxios (): Promise<AxiosStatic> {
    return await import('axios') as unknown as AxiosStatic
  }

  private async makeAxiosRequest ({
    body,
    headers,
    method,
    url
  }: MakeRequestArgs): Promise<MakeRequestResponse> {
    if (this.axios === undefined) {
      try {
        // try to lazyload axios
        this.axios = await this.getAxios()
      } catch {
        // Throw error as axios req wasn't met by `peerDependencies` and makeRequest was not implemented
        throw new Error(['Netacea: Axios must be installed `(npm i axios --save)`',
          'or makeRequest must be provided to override the default of axios being used.'].join(' '))
      }
    }
    if (method === 'POST') {
      const response = await this.axios.post(url, body, {
        headers
      })
      return {
        status: response.status,
        headers: response.headers
      }
    }
    throw new Error('Netacea: method not supported')
  }

  private async makeOutboundCall (args: MakeRequestArgs): Promise<MakeRequestResponse> {
    if (this.makeRequest !== undefined) {
      return await this.makeRequest(args)
    }
    return await this.makeAxiosRequest(args)
  }
}
