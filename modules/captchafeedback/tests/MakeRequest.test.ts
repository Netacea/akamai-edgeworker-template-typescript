import axios from 'axios'
import * as sinon from 'sinon'
import * as tape from 'tape'
import Netacea, { UpdateCaptchaArgs } from '../src'
tape('makeRequest :: called if provided', async (t: tape.Test) => {
  t.plan(10)
  const sand = sinon.createSandbox()
  const axiosStub = sand.spy(axios, 'post')
  const apiKey = 'apikey'
  const url = 'fake-test-url'
  const clientIp = 'clientIp'
  const userAgent = 'useragent'
  const eventId = 'eventid'
  const cookieHeader = 'cookies'
  const result = true
  const makeRequestStub = sinon.stub().returns({
    // @ts-ignore
    status: 200,
    headers: {}
  })
  const netacea = new Netacea({
    apiKey,
    mitigationServiceUrl: url,
    makeRequest: makeRequestStub
  })
  const updateCaptcha: UpdateCaptchaArgs = {
    clientIp,
    cookieHeader,
    eventId,
    result,
    userAgent
  }
  await netacea.updateCaptcha(updateCaptcha)
  t.equal(makeRequestStub.firstCall.args[0].url, `${url}/UpdateCaptcha`, 'Expects correct URL')
  t.equal(makeRequestStub.firstCall.args[0].headers['x-netacea-api-key'], apiKey, 'Expects correct apiKey')
  t.equal(makeRequestStub.firstCall.args[0].headers['x-netacea-client-ip'], clientIp, 'Expects correct clientIp')
  t.equal(makeRequestStub.firstCall.args[0].headers['x-netacea-api-key'], apiKey, 'Expects correct apiKey')
  t.equal(makeRequestStub.firstCall.args[0].headers['user-agent'], userAgent, 'Expects correct useragent')
  t.equal(makeRequestStub.firstCall.args[0].headers.cookie, cookieHeader, 'Expects correct cookie string')
  t.equal(makeRequestStub.firstCall.args[0].body.eventId, eventId, 'Expects correct eventId')
  t.equal(makeRequestStub.firstCall.args[0].body.result, result, 'Expects correct result')
  t.equal(axiosStub.callCount, 0, 'Expects axios post to not be called')
  t.equal(makeRequestStub.callCount, 1, 'Expects makeRequest be called once')
  sand.restore()
})

tape('makeRequest :: logs error if non-200 status code', async (t: tape.Test) => {
  t.plan(2)
  const sand = sinon.createSandbox()
  const consoleSpy = sand.spy(console, 'error')
  const makeRequestStub = sinon.stub().returns({
    // @ts-ignore
    status: 403,
    headers: {}
  })
  const netacea = new Netacea({
    apiKey: 'apiKey',
    makeRequest: makeRequestStub
  })
  const updateCaptcha: UpdateCaptchaArgs = {
    clientIp: 'clientIp',
    cookieHeader: 'cookies',
    eventId: 'eventId',
    result: true,
    userAgent: 'userAgent'
  }
  await netacea.updateCaptcha(updateCaptcha)
  t.equals(makeRequestStub.callCount, 1, 'Expects makeRequest be called once')
  t.ok(
    consoleSpy.firstCall.args[0].message.includes('Non-200 status code returned'),
    'Expects error to be logged to be called'
  )
  sand.restore()
})
