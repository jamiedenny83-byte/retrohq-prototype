# Manager access for Trade Accounts

Set a repository-enabled Codespaces secret named `RETROHQ_MANAGER_PASSWORD` with a strong password of at least 12 characters. Restart the existing Codespace to load the secret, then start RetroHQ on its existing private port. The Trade Accounts page has **Manager sign in**. A sign-in lasts 15 minutes and can be ended with **Manager sign out**.

Open an account and choose **Edit account / correct credit**. Update the name, email or phone, or enter the corrected balance. Give a reason for every edit. RetroHQ adds a dated ledger entry with the credit difference and retains the preceding transactions. Credit issued reports trade-in credit and outstanding credit includes manager corrections.

This is a shared manager password for the current browser workspace. The server verifies the password and session, while trade accounts and ledger entries live in browser storage and workspace backups. This provides a gate on the normal edit workflow. Shared staff identities and a server-owned ledger would require a separate deployment.

From **Acquisitions → Trade in**, enter each item and its agreed amount. Select an account for store credit or mixed payment. Store Credit applies the configured bonus. For Mixed, the cash and credit parts must equal the sum of the agreed item amounts. RetroHQ saves the stock and any credit together.

The same manager sign-in is available in **Inventory**. Open an unsold item and choose **Remove from stock**, then enter a reason. The record remains in the workspace for audit and can be restored from **Inventory → Removed stock**. While a linked copy is removed, RetroHQ pauses new stock imports for that eBay listing variation. Manage availability of the listing itself on eBay.
