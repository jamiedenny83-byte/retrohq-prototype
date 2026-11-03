# eBay toy search repair — 3 November 2026

Reported: toy identification returned no matches even after shortening the search.

Reproduced in code: the old listing-link whitelist rejected legitimate eBay tracking characters (including colons) and ebay.com item links. Returned listings could therefore disappear before the identification dialog displayed them. This is a confirmed code defect; the user's private raw response has not been inspected.

The shared Browse adapter, category overview and item-detail reader now validate the HTTPS eBay host and listing identity, then produce a clean UK item link. Tracking parameters are removed; a nonzero variation identity is retained. Foreign hosts, credentials, unexpected ports and mismatched listing IDs remain rejected.

Toy identification shows returned/displayed counts, with explicit warnings for excluded links or identities. A genuine empty search makes at most one broader request using the first two words. Broader suggestions are labelled; authentication/provider errors and filtered results never trigger retries. Users still select a reference and confirm the physical item. No candidate automatically changes owned stock, costs, valuations or seller listing links.

Validation: six focused Python regressions cover tracked/.com/mobile links, variants, unsafe URLs, full Browse-to-search-to-detail integration, filtering counts and bounded retries. Full regression suites and a controlled browser check cover empty/filtered/success states, escaped query text, explicit confirmation, preserved stock details, game catalogue search, HQ Market and phone width. Actual live toy-search acceptance must still be checked in the existing Codespace; these tests do not use the seller's private credentials.

Upload to the existing retrohq-test-8.3 branch only. Rollback checkpoint: 5bd5a283d0989d40d8f144407b6a4349d2426e55. Keep the existing Codespace and private port 8006. OAuth configuration and CeX functionality are unchanged.

To test after pulling and restarting: identify the Homer toy, choose eBay UK and search. Expect returned/displayed counts and selectable results when live UK listings exist. If it remains empty, report the counts and any broader query shown; do not share secrets.
