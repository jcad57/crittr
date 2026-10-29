const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadTS } = require('./load-typescript.cjs');
const releases = { UNKNOWN: 0, SIMULATOR: 1, ENTERPRISE: 2, DEVELOPMENT: 3, AD_HOC: 4, APP_STORE: 5 };
function fixture(environment, release = releases.APP_STORE, timeout = false) {
  return loadTS('lib/iap/purchaseEnvironment.ts', {
    'expo-application': {
      ApplicationReleaseType: releases,
      getAppleStoreEnvironmentAsync: async () => { if (environment instanceof Error) throw environment; return environment; },
      getIosApplicationReleaseTypeAsync: async () => release,
    },
    'react-native': { Platform: { OS: 'ios' } },
    '@/lib/iap/withTimeout': { withTimeout: promise => timeout ? Promise.resolve(undefined) : promise },
  });
}
test('StoreKit distinguishes TestFlight and live App Store builds even with identical signing', async () => {
  for (const environment of ['production', 'sandbox', 'xcode']) {
    const api = fixture(environment);
    assert.equal(await api.getPurchaseEnvironment(), environment);
    const copy = api.purchaseEnvironmentCopy(environment);
    assert.match(copy.title, environment === 'production' ? /Live purchases/ : /Test|Testing/);
    assert.match(copy.message, environment === 'production' ? /real payments/ : /won’t charge/);
  }
});
test('a simulator without an app transaction is labeled testing, while an unknown App Store build is never guessed live', async () => {
  assert.equal(await fixture(null, releases.SIMULATOR).getPurchaseEnvironment(), 'simulator');
  assert.equal(await fixture(null, releases.DEVELOPMENT).getPurchaseEnvironment(), 'sandbox');
  assert.equal(await fixture(null).getPurchaseEnvironment(), 'unknown');
  assert.equal(await fixture(new Error('offline')).getPurchaseEnvironment(), 'unknown');
  assert.equal(await fixture('sandbox', releases.APP_STORE, true).getPurchaseEnvironment(), 'unknown');
  assert.match(fixture(null).purchaseEnvironmentCopy('unknown').message, /couldn’t confirm/);
});
