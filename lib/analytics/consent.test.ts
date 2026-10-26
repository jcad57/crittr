import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { firebaseConsentFromTracking } from "./consent.ts";

describe("firebaseConsentFromTracking", () => {
  it("grants ad personalization only when ATT+UMP allow it", () => {
    assert.deepEqual(
      firebaseConsentFromTracking({
        canRequestAds: true,
        personalizedAds: true,
      }),
      {
        analytics_storage: true,
        ad_storage: true,
        ad_user_data: true,
        ad_personalization: true,
      },
    );
  });

  it("keeps analytics on when ads are non-personalized", () => {
    assert.deepEqual(
      firebaseConsentFromTracking({
        canRequestAds: true,
        personalizedAds: false,
      }),
      {
        analytics_storage: true,
        ad_storage: true,
        ad_user_data: false,
        ad_personalization: false,
      },
    );
  });

  it("turns advertising storage off when UMP forbids ads", () => {
    assert.deepEqual(
      firebaseConsentFromTracking({
        canRequestAds: false,
        personalizedAds: false,
      }),
      {
        analytics_storage: true,
        ad_storage: false,
        ad_user_data: false,
        ad_personalization: false,
      },
    );
  });
});
