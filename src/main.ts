// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference types="akamai-edgeworkers"/>

export async function onClientRequest (request: EW.IngressClientRequest): Promise<void> {
  request.addHeader('X-Netacea-Edgeworker', 'EdgeworkerHeader')
}
