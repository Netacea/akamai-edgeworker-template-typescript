export const COOKIEDELIMITER: string = '_/@#/'
export const mitigationTypes: {
  none: string
  block: string
  captcha: string
  allow: string
  captchaPass: string
} = {
  none: '',
  block: 'block',
  captcha: 'captcha',
  allow: 'allow',
  captchaPass: 'captchapass'
}
export const netaceaHeaders: {
  match: string
  mitigate: string
  captcha: string
  mitata: string
  mitataExpiry: string
  mitataCaptcha: string
  mitataCaptchaExpiry: string
  eventId: string
} = {
  match: 'x-netacea-match',
  mitigate: 'x-netacea-mitigate',
  captcha: 'x-netacea-captcha',
  mitata: 'x-netacea-mitata-value',
  mitataExpiry: 'x-netacea-mitata-expiry',
  mitataCaptcha: 'x-netacea-mitatacaptcha-value',
  mitataCaptchaExpiry: 'x-netacea-mitatacaptcha-expiry',
  eventId: 'x-netacea-event-id'
}

export const matchMap: {[key: string]: string | undefined} = {
  0: '',
  1: 'ua_',
  2: 'ip_',
  3: 'visitor_',
  4: 'datacenter_',
  5: 'sev_'
}

export const mitigateMap: {[key: number]: string | undefined} = {
  0: '',
  1: 'blocked',
  2: 'allow',
  3: 'hardblocked',
  4: 'block'
}

export const captchaMap: {[key: number]: string | undefined} = {
  0: '',
  1: 'captcha_serve',
  2: 'captcha_pass',
  3: 'captcha_fail',
  4: 'captcha_cookiepass',
  5: 'captcha_cookiefail'
}

export const bestMitigationMap: {[key: number]: string} = {
  0: mitigationTypes.none,
  1: mitigationTypes.block,
  2: mitigationTypes.none,
  3: mitigationTypes.block,
  4: mitigationTypes.block
}

export const bestMitigationCaptchaMap: {[key: number]: string | undefined} = {
  1: mitigationTypes.captcha,
  2: mitigationTypes.captchaPass,
  3: mitigationTypes.captcha,
  4: mitigationTypes.allow,
  5: mitigationTypes.captcha
}
