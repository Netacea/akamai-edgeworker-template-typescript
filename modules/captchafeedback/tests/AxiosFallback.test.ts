import axios from 'axios'
import * as sinon from 'sinon'
import * as tape from 'tape'
import Netacea, { UpdateCaptchaArgs } from '../src'
tape('Axios default used if makeRequest not provided', async (t: tape.Test) => {
  t.plan(1)
  const sand = sinon.createSandbox()
  const axiosStub = sand.stub(axios, 'post').returns({
    // @ts-ignore
    status: 200,
    headers: {}
  })
  const netacea = new Netacea({
    apiKey: 'apiKey'
  })
  const updateCaptcha: UpdateCaptchaArgs = {
    clientIp: 'clientIp',
    cookieHeader: 'cookies',
    eventId: 'eventId',
    result: true,
    userAgent: 'userAgent'
  }
  await netacea.updateCaptcha(updateCaptcha)
  t.equal(axiosStub.callCount, 1, 'Expects axios post to be called once')
  sand.restore()
})

tape('Axios throws error if not installed', async (t: tape.Test) => {
  t.plan(2)
  const sand = sinon.createSandbox()
  const netacea = new Netacea({
    apiKey: 'apiKey'
  })
  const consoleSpy = sand.spy(console, 'error')
  // @ts-ignore
  netacea.getAxios = () => {
    throw new Error('Axios is not installed')
  }
  const updateCaptcha: UpdateCaptchaArgs = {
    clientIp: 'clientIp',
    cookieHeader: 'cookies',
    eventId: 'eventId',
    result: true,
    userAgent: 'userAgent'
  }
  const result = await netacea.updateCaptcha(updateCaptcha)
  t.deepEqual(result, { cookies: [] }, 'Expects empty captcha response')
  t.equals(consoleSpy.callCount, 1, 'Expects console.error to be called once')
  sand.restore()
})
