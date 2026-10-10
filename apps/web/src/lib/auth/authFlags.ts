/**
 * Sign-in flags. Client-safe constants, OFF by default (release-safety rule).
 *
 * LOGIN_REQUIRES_ACCOUNT: /login checks the number before sending the OTP and
 * refuses numbers with no vsite account, so no SMS is spent on them.
 *
 * Ships OFF because the check reads `profiles.phone_number`, and on 2026-10-05
 * 25 owners with live stores had no phone stored there (the signup redirect
 * race lost it). Turn it on only after scripts/backfill-profile-phones.mjs has
 * filled them and the dry run reports zero owners without a phone.
 *
 * A constant, not an env var: a missing variable must not silently change who
 * can sign in.
 */
export const LOGIN_REQUIRES_ACCOUNT: boolean = false;
