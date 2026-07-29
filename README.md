# RetroHQ Clickable Prototype

RetroHQ is a responsive clickable prototype for a collectable reseller operating system. It includes workflows for:

- Quick acquisitions
- Trade-ins
- Purchases from other resellers
- Buying trips
- Inventory management
- Processing queues
- Sales, fees and profit
- Business reporting
- Subscription feature flags

## Test it locally

No installation is required.

1. Download and unzip this project.
2. Open `index.html` in Chrome, Edge, Safari or Firefox.
3. Try adding items, processing stock and recording a sale.

The prototype stores changes only in the current browser session. Refreshing the page resets the demonstration data.

## Publish to GitHub without programming knowledge

### Method A: GitHub website

1. Sign in at GitHub.
2. Select **New repository**.
3. Name it `retrohq-prototype`.
4. Choose **Private** while testing, or **Public** if you want anyone to see it.
5. Select **Create repository**.
6. On the repository page, select **uploading an existing file**.
7. Drag `index.html`, `styles.css`, `app.js`, and `README.md` into the upload area.
8. Enter `Initial RetroHQ clickable prototype` in the commit message.
9. Select **Commit changes**.

### Method B: GitHub Desktop

1. Install GitHub Desktop and sign in.
2. Select **File → Add local repository**.
3. Select this unzipped project folder.
4. If prompted, choose **Create a repository here**.
5. Enter the summary `Initial RetroHQ clickable prototype`.
6. Select **Commit to main**.
7. Select **Publish repository**.
8. Keep the repository private while testing if preferred.

### Method C: Command line

```bash
git init
git add .
git commit -m "Initial RetroHQ clickable prototype"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/retrohq-prototype.git
git push -u origin main
```

Replace `YOUR-USERNAME` with your GitHub username or organisation.

## Put the prototype online with GitHub Pages

1. Open the repository on GitHub.
2. Select **Settings**.
3. Select **Pages** under **Code and automation**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select the `main` branch and `/ (root)` folder.
6. Select **Save**.
7. GitHub will display the website address after deployment.

For a private commercial application later, we will move from GitHub Pages to Vercel and connect a Supabase database.

## What to test

- Can you add a game or collectable quickly?
- Does the trade-in workflow match the retail shop process?
- Are “Other Reseller” and “Trade In” easy to locate?
- Can you find an item quickly on mobile?
- Is the processing queue understandable?
- Are sales fees and profit clear?
- Which fields feel unnecessary?
- Which actions take too many taps?

## Next technical rebuild

After the workflow is approved, the next version will convert this interface into:

- Next.js
- React
- TypeScript
- Tailwind CSS
- Supabase/PostgreSQL
- Secure authentication
- Persistent data
- Barcode and product lookup services
- Subscription feature controls

The current prototype is intentionally dependency-free so it can be tested immediately.
