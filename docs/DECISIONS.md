# RetroHQ decision record

## 2026-10-11 — confirmed roadmap
- 8.4: automatic capture of eBay sale details, inventory matching, prices, available fee evidence, stock updates and fulfilment review. Read-only Sandbox seller calls; explicit review before stock changes. Sources: issues #50 and #51, confirmed by the user in the development chat.
- 8.5: complete item history, stock ageing, processing priorities, bulk-buy profitability and inventory accuracy.
- 8.6+: reassess read-only listing visibility and other marketplace integrations.
- Listing creation/publishing/crosslisting is parked. RetroHQ must work with orders from listings created by any tool, using Fulfillment order SKU/listing identity rather than relying on Inventory API coverage.
- CeX prerequisite is satisfied by the user's successful Silent Hill 2 PS2 test. Preserve game identity, UK retail/cash/voucher evidence and hardware matching.
- Keep the existing Codespace and port 8006 to preserve the working eBay callback origin. A branch change does not require creating another Codespace.
- Requested branch name: `current`, only if safe. Defer rename while its effect on the existing checkout is unverified: `retrohq-test-8.3` is the head of draft PR #47, which GitHub closes on head-branch rename. Do not perform a destructive rename merely to change the display name.
- Durable continuity belongs in the repository: handover, decisions, work log and milestone acceptance notes. Summarise chats; never publish secrets or private transcripts.

## Evidence and limitations
- The referenced chats expose recent user messages but assistant replies resolve only to content-reference placeholders. They are not a recoverable source of the complete earlier plan.
- GitHub issues #50/#51 contain the actual staged plan and take precedence over guesses about unavailable notes.
- No running Codespace checkout, uncommitted changes or live secrets have been inspected from this local development session.
