# Sales cleanup and identification test

Pull the existing retrohq-test-8.3 branch and refresh the same RetroHQ browser profile/app address.

1. Open Sales. The Sandbox orders section should be gone; production sales, fees, receipts and the dispatch queue remain.
2. Mark a paid order shipped on eBay, then run Sales → Import eBay sales with a range containing that order. Once eBay reports FULFILLED, the existing record becomes Dispatched and leaves Pick, pack and dispatch. Revenue and receipt counts must stay unchanged. Shipment changes arrive on import; there is no background production polling. Regular inventory fetch also reads orders modified in the last 30 days.
3. On HQ Today click Identify item for an imported record. It should open Identify existing item, not Processing. Search and choose the exact catalogue result, or confirm the product/platform/edition manually if there is no catalogue match. Games and consoles need an exact platform/model.
4. Cancel first: the task and stock must be unchanged. Reopen, check the details and tick the confirmation box, then Confirm identity. The task should clear without another stock unit appearing. Listing/SKU, purchase/preparation costs, existing value and any sale must remain unchanged. Identification alone does not create a CeX valuation.
5. Refresh. The confirmed identity remains saved. For an unidentified item opened through Inventory, Identify this item offers the same screen.

Manual confirmation is recorded separately from a catalogue selection; changing selected catalogue fields switches to manual confirmation. An item still needing a valuation gets a separate Value item task. Dispatched/completed sales do not clutter the current-stock identification queue. Sandbox settings and isolated offline practice are retained.

Validation:107 Node tests and controlled browser shipping/identification/practice checks pass. Real-account shipment and operator identification acceptance remain next.
