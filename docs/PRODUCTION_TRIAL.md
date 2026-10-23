# Production read and resale opportunity trial

This test build adds **Production eBay** and **Resale opportunities** alongside the existing acquisition, inventory, operations and Sandbox workflows. Production seller acceptance is still pending. Connection setup is supplied separately to the operator; keep credentials and private operational configuration out of this public repository.

## Update and open

Use the existing Codespace, working branch and private application port. Export a private inventory backup first. Preserve any checkout edits and follow [START_HERE.md](../START_HERE.md) to update without resetting files. Restart the existing server and refresh the same browser address. The header reads **PRODUCTION READ / OPERATIONS**. Existing acquisition, operations and offline demo testing do not require a production connection.

## Production listing and order trial

After the operator has configured the separate production connection privately:

1. Open **Production eBay**, check the connection status, then **Sync now**. This is a manual, read-only snapshot of active listings and recently modified orders. No listing, price, order, refund or purchase writes are implemented.
2. Compare several listings with Seller Hub: listing identity, exact variation, price, currency and remaining quantity. **Link stock** selects existing physical units, preserving purchase costs and storage location. Mirrored listings never create zero-cost owned stock. Confirm platform, edition, condition and accessories yourself.
3. A later complete sync can import a paid GBP order once when physical links are exact and unambiguous. **Match physical stock** also supports a sold listing that is no longer active. Select exactly the required number of distinct available units. Titles never automatically match stock.
4. Sync again and reload. The same order must remain imported once. Production and Sandbox histories are separate.
5. Open **Actual costs** for each imported unit. Enter all real marketplace fees, postage, packaging, additional promotion and buyer postage received, including explicit zero. Order-level evidence is not duplicated across multi-unit or multi-line allocations. Missing costs or order changes keep profit unconfirmed.
6. Changed revenue/fee evidence requires review and cost reconfirmation. Quantity, identity, cancellation and refund conflicts require Seller Hub verification. A refund never puts stock back on the shelf. Record a physical return only after all allocated units are received. The original sale history and duplicate-protection ledger remain.
7. Missing listings mean **verify on eBay**, never delete/restock automatically. Quantity differences are visible. A partial snapshot pauses automatic allocation; failed reads or saves retain the previous persisted workspace. Older orders and full financial/return reconciliation still require external checks.

## Resale opportunity trial

Production market access must be available before live offer searches work. If unavailable, the app reports that limitation and supports **Add an offer manually** using a genuine eBay UK fixed-price offer. No simulated deals are inserted. Vinted access is not configured.

1. Select Games, Consoles or Accessories, search an exact item/platform, then review an offer.
2. Enter exact platform/revision, condition/grade, edition/completeness and accessories. **Find CeX record** returns candidates, not confirmed matches. Read the category/platform: a broad game search may return a modern remake first. Select the exact record and **Check cash quote**. Only direct CeX cash evidence is used; retail, voucher and indicative rate-derived figures never become the payout.
3. Enter purchase price, inbound postage, buyer/checkout fees, delivery/travel to CeX, repairs/replacements and risk allowance. Missing provider postage stays unknown. Use zero only when checked. Verify the actual checkout total and current availability.
4. Confirm identity and current offer details, set minimum profit (default £2 for lower-margin reseller trades), then save. Incomplete research remains in the watchlist. Only complete, sufficiently profitable offers with purchase and cash evidence checked within 24 hours enter the **Top 10 per category**.

Potential profit equals checked CeX cash minus every entered landed cost. It is a sourcing estimate, not a guaranteed payout or completed transaction. Refresh stale evidence and verify acceptance, grade, completeness and final charges before buying. No automated purchases are implemented.

## Backups, recovery and limits

Inventory, production mirror, duplicate ledger, research watchlist and settings are saved together in the same browser/site workspace. They are not shared phone/laptop server storage. Keep regular private exports. Restore rejects malformed or contradictory production records and revenue allocations. Do not commit private backups or customer data.

The pre-production rollback branch is `retrohq-rollback-before-production-read`. Export current data before a deliberate code-recovery operation; code rollback does not reverse business data, and older app versions do not understand the production ledger. Preserve a matching pre-update backup for old-code trials. Never reset away local edits.

Still pending: real production seller/listing/order acceptance, approved market-search acceptance, original paid Sandbox acceptance, shared durable storage and full financial/return reconciliation. Listing creation, crosslisting, automatic purchases and Vinted remain future work. Existing branch, Codespace and Sandbox configuration are preserved.
