'use strict'

const test = require('tape')
const OIDCRelyingParty = require('oidc-rp')
const { ClientStore, MultiRpClient } = require('../../src/index')
const sinon = require('sinon')

test('MultiRpClient constructor test', t => {
  let store = new ClientStore()
  let localIssuer = 'https://oidc.example.com'
  let localConfig = {
    issuer: localIssuer
  }
  let options = { store, localConfig }
  let multiClient = new MultiRpClient(options)
  t.equal(multiClient.store, store)
  t.equal(multiClient.localConfig, localConfig)
  t.equal(multiClient.localIssuer, localIssuer)
  t.end()
})

test('MultiRpClient.registrationConfigFor() test', t => {
  let issuer = 'https://oidc.example.com'
  let localConfig = {
    issuer: issuer,
    redirect_uri: 'https://localhost:8443/rp'
  }
  let multiClient = new MultiRpClient({ localConfig })
  let regConfig = multiClient.registrationConfigFor(issuer)
  t.ok(regConfig.client_name)
  // Check for other claims here...
  t.equal(regConfig.issuer, issuer)
  t.deepEqual(regConfig.redirect_uris,
    [ 'https://localhost:8443/rp/https%3A%2F%2Foidc.example.com' ])
  t.end()
})

test('MultiRpClient.clientForIssuer() - client exists in store test', t => {
  let issuer = 'https://oidc.example.com'
  let store = new ClientStore()
  let getStub = sinon.stub(store, 'get', (issuer) => {
    return Promise.resolve(new OIDCRelyingParty({ provider: { url: issuer }}))
  })
  let client = new OIDCRelyingParty({ provider: { url: issuer }})
  let multiClient
  store.put(client)
    .then(() => {
      multiClient = new MultiRpClient({ store })
      return multiClient.clientForIssuer(issuer)
    })
    .then(retrievedClient => {
      t.equal(retrievedClient.issuer, client.issuer,
        'If client config exists in store, clientForIssuer() should retrieve it')
      t.ok(getStub.calledWith(issuer))
      getStub.restore()
      t.end()
    })
    .catch(err => {
      console.log(err)
      t.fail(err)
    })
})

test('MultiRpClient.redirectUriForIssuer() test', t => {
  let localRedirectUri = 'https://oidc.example.com/rp'
  let localConfig = {
    redirect_uri: localRedirectUri
  }
  let multiClient = new MultiRpClient({ localConfig })
  let otherIssuer = 'https://issuer.com'
  let issuerRedirectUri = multiClient.redirectUriForIssuer(otherIssuer)
  t.equal(issuerRedirectUri, 'https://oidc.example.com/rp/https%3A%2F%2Fissuer.com')
  t.end()
})
