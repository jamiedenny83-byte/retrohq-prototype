# Dashboard periods and stock platforms

Pull retrohq-test-8.3 and refresh the existing RetroHQ app/browser profile.

1. HQ Today now separates Current inventory (live stock) from Sales performance. Click Today, 7 days, 30 days and All saved sales. Revenue and items sold should follow the selected sale-date period. If there are no sales in that range, show zero. Current stock/value/capital remain the current snapshot.
2. Open Sales: totals, sold-item rows, search results and receipts use the same selected period. The shipping queue continues to show every outstanding order. All saved sales exposes older records.
3. Stock health groups games and consoles by platform, not by item type. Each tile explicitly shows its game and console counts. A Game Boy Color game belongs in that platform tile, counted as a game. Correcting its category should update that breakdown immediately and after reload.
4. A current platform correction takes precedence over older identity metadata. Common spelling/name variants group together. Only available games/consoles contribute; sold, held and unrelated accessories/toys are excluded.
5. Click a platform tile. Inventory should contain exactly the platform's current games/consoles. Search/category filters work within that selection. Show all platforms clears it and remains available while searching.

Controlled validation:109 Node tests pass; browser checks cover every date range, unchanged stock, category correction, exact tile navigation, Sales rows/receipts/search and reload. Live operator acceptance remains next. This release does not change marketplace writes, OAuth, pricing providers or the identification/completeness form.
