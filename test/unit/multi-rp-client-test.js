'use strict'

const test = require('tape')
const sinon = require('sinon')

const OIDCRelyingParty = require('@solid/oidc-rp')
const MultiRpClient = require('../../src/index')
const ClientStore = require('../../src/client-store')

const storeBasePath = './test/store/'
const storeOptions = { path: storeBasePath }

test('setup', t => {
  const store = new ClientStore(storeOptions)
  store.backend.createCollection('clients')
    .then(() => {
      t.end()
    })
    .catch(err => {
      console.log(err)
      t.fail(err)
    })
})

test('MultiRpClient constructor test', t => {
  const localIssuer = 'https://oidc.example.com'
  const localConfig = {
    issuer: localIssuer
  }
  const options = {
    path: storeBasePath,
    localConfig
  }
  const multiClient = new MultiRpClient(options)
  t.equal(multiClient.store.backend.path, storeBasePath)
  t.equal(multiClient.localConfig, localConfig)
  t.equal(multiClient.localIssuer, localIssuer)
  t.end()
})

test('MultiRpClient.registrationConfigFor() test', t => {
  const issuer = 'https://oidc.example.com'
  const localConfig = {
    issuer: issuer,
    redirect_uri: 'https://localhost:8443/rp'
  }
  const multiClient = new MultiRpClient({ localConfig })
  const regConfig = multiClient.registrationConfigFor(issuer)
  t.ok(regConfig.client_name)
  // Check for other claims here...
  t.equal(regConfig.issuer, issuer)
  t.deepEqual(regConfig.redirect_uris,
    ['https://localhost:8443/rp/https%3A%2F%2Foidc.example.com'])
  t.end()
})

test.skip('MultiRpClient.clientForIssuer() - client exists in store test', t => {
  const issuer = 'https://oidc.example.com'
  const getStub = sinon.stub(store, 'get', (issuer) => {
    return Promise.resolve(new OIDCRelyingParty({ provider: { url: issuer } }))
  })
  const client = new OIDCRelyingParty({ provider: { url: issuer } })
  let multiClient
  store.put(client)
    .then(() => {
      multiClient = new MultiRpClient({ store: storeOptions })
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
  const localRedirectUri = 'https://oidc.example.com/rp'
  const localConfig = {
    redirect_uri: localRedirectUri
  }
  const multiClient = new MultiRpClient({ store: storeOptions, localConfig })
  const otherIssuer = 'https://issuer.com'
  const issuerRedirectUri = multiClient.redirectUriForIssuer(otherIssuer)
  t.equal(issuerRedirectUri, 'https://oidc.example.com/rp/https%3A%2F%2Fissuer.com')
  t.end()
})
