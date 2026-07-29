# RetroHQ Clickable Prototype — Version 2.0

This revision preserves the fast dashboard and adds the workflows requested in the Sprint 1 review.

## Included in Version 2

- Quick acquisition saves and returns to the page you started from
- Multi-item acquisitions and bundles
- Complete trade-in workflow with customer reference and multiple items
- Other-reseller and sourcing-trip workflows
- Automatic prototype market values with eBay sold, CeX and PriceCharting evidence
- Reseller-controlled offer percentage
- Automatic suggested offers with manual override
- Manager PIN approval for offers above the staff limit
- Override and outlier reporting
- Condition at acquisition plus a condition history
- Cleaning, testing, repair, photos and pricing stages
- Inventory rows open an Item Workspace
- “Next stage” language throughout processing
- HQ Score balancing margin and expected sales velocity
- “What should I do next?” prototype
- Existing-stock import centre placeholder for Excel, CSV and EPOS

> Market values are simulated in this prototype. Live eBay, CeX and PriceCharting data requires approved APIs, licences or permitted integration methods.

## Test locally

1. Extract the ZIP.
2. Open `index.html` in Chrome, Edge, Safari or Firefox.
3. Changes last only for the current browser session; refreshing resets the demonstration data.
4. The prototype manager PIN is `2468`.

# Publish to GitHub without overwriting Version 1

## Recommended: tag Version 1, then use a Version 2 branch

This keeps one repository with a complete history.

### Step 1 — Protect the existing prototype

On GitHub, open your existing `retrohq-prototype` repository.

1. Select **Releases** on the repository page.
2. Select **Draft a new release**.
3. Choose **Create new tag**.
4. Enter `v1.0-prototype`.
5. Release title: `RetroHQ Prototype Version 1`.
6. Select **Publish release**.

That tag permanently points to the original prototype, even after newer files are uploaded.

### Step 2 — Create a Version 2 branch

1. Return to the repository’s **Code** page.
2. Open the branch selector currently showing `main`.
3. Type `prototype-v2`.
4. Select **Create branch: prototype-v2 from main**.
5. Confirm the branch selector now shows `prototype-v2`.

### Step 3 — Upload Version 2 to that branch

1. Select **Add file → Upload files**.
2. Upload the extracted Version 2 files:
   - `index.html`
   - `styles.css`
   - `app.js`
   - `README.md`
3. GitHub will warn that files with the same names will be replaced **on this branch only**. Version 1 remains preserved by the tag and in `main`.
4. Commit message: `Add RetroHQ prototype version 2`.
5. Select **Commit changes**.

### Step 4 — Test Version 2 with GitHub Pages

GitHub Pages normally publishes one selected branch at a time.

1. Open **Settings → Pages**.
2. Under **Build and deployment**, select `prototype-v2` and `/ (root)`.
3. Select **Save**.
4. Test the site at the Pages address.

To return the public test site to Version 1, change the Pages branch back to `main`.

### Step 5 — Promote Version 2 after approval

Once testing is complete:

1. Open **Pull requests**.
2. Select **New pull request**.
3. Base branch: `main`.
4. Compare branch: `prototype-v2`.
5. Create the pull request and select **Merge pull request**.
6. Create a new release tag named `v2.0-prototype`.

You can then retrieve either version at any time from **Releases** or **Tags**.

## Even simpler alternative: separate repository

Create a new repository named `retrohq-prototype-v2` and upload these files there. This is easier initially, but using tags and branches in one repository gives a cleaner long-term product history.

## Suggested test cases

1. Open Quick Acquisition from Dashboard, save an item and confirm you remain on Dashboard.
2. Create a trade-in bundle containing three items.
3. Change the market values and confirm suggested offers update.
4. Enter an offer above the default percentage and use manager PIN `2468`.
5. Check Reports for the override/outlier.
6. Open an item from Inventory.
7. Update its condition and verify the history.
8. Move it from Needs Cleaning using **Next stage**.
9. Record a fast, lower-margin sale and compare its HQ Score.
10. Test the layout on a mobile browser.
