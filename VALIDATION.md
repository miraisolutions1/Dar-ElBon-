# Validation record

Validated in the current cloud workspace on 2 October 2026. This records local execution, not a public deployment or restoration in a new cloud task.

| Check                                                 | Result                                                            |
| ----------------------------------------------------- | ----------------------------------------------------------------- |
| Frozen dependency installation: `npm ci`              | Passed                                                            |
| TypeScript and frontend bundle: `npm run build`       | Passed                                                            |
| API integration tests: `npm test`                     | 10 passed; 0 failed or skipped                                    |
| Chromium browser tests: `npm run test:e2e`            | 3 passed; 0 failed or skipped                                     |
| Dependency advisories: `npm audit --audit-level=high` | 0 known vulnerabilities reported at execution                     |
| Database backup and isolated restore                  | Integrity check `ok`; product and admin records retained          |
| Repeated admin initialization                         | Existing account and password preserved                           |
| Server restart                                        | Health and catalog endpoints passed; storefront/admin HTML served |
| Unauthenticated admin API                             | HTTP 401                                                          |
| Render startup command, isolated local smoke check    | Passed: HTTPS origin, secure session, restart persistence         |

API coverage includes role separation, session logout and password rotation, login rate limits, cross-origin mutation rejection, server-side prices and shipping, idempotency, transactional stock deductions, stock rollback on failure, cancellation, gram inventory, upload byte validation, persistent data, live-mode prerequisites, and stale-edit/changed-price conflicts.

Browser coverage includes a full purchase and admin fulfillment update, cart persistence, mobile filtering and cart interaction, product price edits, homepage content edits, admin mobile navigation, and horizontal-overflow checks at 390px.

Browser tests use an isolated temporary database and synthetic accounts/orders. Their screenshots demonstrate the rendered implementation; they are not screenshots of actual customer transactions.

The Render startup command was executed against an isolated temporary database with `RENDER_EXTERNAL_URL` as the HTTPS origin. Login, Secure/HttpOnly/SameSite cookies, a preview order, image upload, cross-origin rejection, graceful restart, and retention of the account, order and image all passed. The local private credential file remained unchanged. The first ad hoc smoke attempt used the wrong upload URL and returned 404; correcting the check to the existing `/api/admin/upload` route produced the passing result. This validates the startup command locally; no Render account, remote disk, or public URL has been provisioned or verified.

The initial store remains in preview mode. Product prices, weights, inventory, shipping policies, contact information and generated media require business review before actual sales. Payment-provider, shipping-provider and messaging integrations have not been implemented or claimed as tested.
