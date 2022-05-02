export enum NetaceaIngestType {
  ORIGIN = 'ORIGIN',
  HTTP = 'HTTP',
  KINESIS = 'KINESIS'
}

export enum NetaceaLogVersion {
  V1 = 'V1',
  V2 = 'V2'
}

export enum NetaceaMitigationType {
  /**
   * Run Netacea with mitigation mode enabled.
   * This will serve Captcha pages and Forbidden pages when instructed to do so
   */
  MITIGATE = 'MITIGATE',

  /**
   * Run Netacea with Inject mode enabled.
   * The end-user will only receive a cookie.
   * The origin server will receive 3 headers,
   *
   * 'x-netacea-match' indicating what was matched (nothing(0), ua(1), ip(2), etc...)
   *
   * 'x-netacea-mitigate' indicating what action would've be taken (nothing (0), block(1), allow(2), etc...)
   *
   * 'x-netacea-captcha' indicating what captcha action would've been taken
   */
  INJECT = 'INJECT',

  /**
   * Run Netacea with Ingest only mode
   * No cookies will be set for the end user.
   * No mitigations will be applied.
   *
   * **It's recommended to start in this mode!**
   */
  INGEST = 'INGEST'
}
