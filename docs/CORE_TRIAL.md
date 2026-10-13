# Buying and inventory trial

Use the existing Codespace, browser profile and app address. eBay is not required to record purchases. This is still a single-browser prototype, so keep your existing stock record alongside this initial five-item trial.

## Practise recovery first
1. Open Backup and practice tools, then Try offline sales demo.
2. Export demo backup and keep the downloaded JSON file.
3. Make a sample sale or acquire another fictional item.
4. Select Restore backup, choose the file and review its item/sales/account counts.
5. Tick the replacement acknowledgement and select Restore this backup. Check inventory, then reload and check again.
6. Restore replaces the whole workspace; it does not merge. Download pre-restore copy retrieves the previous workspace if you need to undo. Restore that downloaded file through the same preview process.

## Five real items
1. Return to saved workspace. Export an inventory backup before starting.
2. Use Acquisitions / Quick Capture to record title, purchase cost, condition, Area and Shelf. A valuation may be left pending; eBay is not needed. Use CeX evidence where appropriate, checking identity and completeness.
3. Open each item in Inventory and check cost/location. Record testing or repair work and processing costs; progress to Ready to list only when physically ready.
4. Reload the app and verify all five records remain. Export another backup and store it outside the browser.
5. Report any confusing screens or discrepancies before adding more stock.

## Restore boundaries
- Only RetroHQ JSON backups up to 5 MB. New files identify demo versus saved workspace; older v1 files infer this from their contents. Backups with broken IDs or inconsistent imported-sale history are rejected.
- The restore preview shows counts, not a complete financial audit. Restoring an older backup rolls back stock and sales recorded after its date; reconcile physical stock before resuming sales or eBay sync.
- The pre-restore copy is local, keeps only the most recent attempted restore's preceding workspace, and does not protect against clearing browser data or device loss. Download regular backups.
- Conservative text validation rejects markup, backticks and double quotation marks in ordinary text fields. If rejected, keep the file and ask for review; do not manually remove sales history or overwrite current stock to force restoration.
- Server-held OAuth credentials, Codespace identity and CeX configuration are not exported or restored. This does not add shared/team storage or validate an actual eBay paid order.
