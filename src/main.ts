// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference types="akamai-edgeworkers"/>

export async function onClientRequest (request: EW.MutableRequest & EW.HasRespondWith): Promise<void> {
  request.addHeader('X-Netacea-Edgeworker', 'EdgeworkerHeader')
}
