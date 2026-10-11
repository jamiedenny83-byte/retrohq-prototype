# RetroHQ Test 8.4 — use your existing Codespace

The working GitHub branch is still **`retrohq-test-8.3`**. The app build is **8.4**. There is no need to create a new Codespace or change eBay's callback URL.

1. Reopen the same Codespace used for the successful CeX and eBay tests.
2. Check `git status --short --branch`. Preserve any local edits; do not reset them.
3. If the checkout is clean and on `retrohq-test-8.3`, run:

```bash
git fetch origin
git pull --ff-only origin retrohq-test-8.3
```

4. Stop the previous server with Ctrl+C in its terminal, then restart:

```bash
export EBAY_ENV=sandbox
python3 server.py
```

5. Open the same **private port 8006** browser URL. Refresh and check the **Test 8.4** header.
6. In Settings, verify the retained seller connection. The displayed callback URL should be unchanged. Then follow the [8.4 Sandbox acceptance checks](docs/TEST_8_4_NOTES.md).

If the branch differs, there are local changes, or the pull cannot fast-forward, inspect the checkout before proceeding. Do not create a replacement Codespace or force a reset.

## Existing configuration stays in place

Keep `EBAY_CLIENT_ID`, `EBAY_CLIENT_SECRET`, `EBAY_RUNAME`, `RETROHQ_ADMIN_PIN`, `EBAY_ENV=sandbox`, PriceCharting configuration and optional separate market-data credentials as already tested. Do not paste their values into chat or commit them.

The eBay callback remains `/ebay/oauth/callback` on the existing Codespace HTTPS origin. The Sandbox refresh token remains at `~/.config/retrohq/ebay_seller_sandbox.json`, outside the repository. This update does not change the OAuth scopes or token handling. Keep port 8006 private.

## Using the import

In an item's **Listing** tab, link the exact existing eBay SKU/custom label or listing ID. In **Sales**, enter the administrator PIN and **Fetch / resync orders**. Review matched or unmatched lines and confirm physical stock allocation. Details are captured from eBay automatically; no sale needs to be retyped. Fees are evidence, and actual per-item costs must be confirmed before net profit is shown as confirmed.

Keep using this browser profile and Codespace address. Export a private inventory backup before clearing browser data. Stock restoration is an explicit physical-return decision; a refund by itself does not put an item back on the shelf.

## Continuity and rollback

Read [HANDOVER.md](docs/HANDOVER.md) for the next development chat. Read [TEST_8_4_NOTES.md](docs/TEST_8_4_NOTES.md) before rollback. The preserved code branches are `retrohq-rollback-8.3-verified` and `retrohq-rollback-before-8.4`. A code rollback does not roll back business data.
