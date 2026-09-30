# RetroHQ Live Workflow Test 4 — Live Market Data

First live provider: PriceCharting.

## Run
The API token is NOT included in this ZIP. In the same terminal session:

```bash
export PRICECHARTING_API_TOKEN='YOUR_TOKEN'
python3 server.py
```

Open port 8006 and hard refresh. Header should show **LIVE WORKFLOW TEST 4 · LIVE DATA**.

## Behaviour
- Buy Check description or barcode calls PriceCharting server-side.
- PriceCharting prices are displayed as **USD reference evidence**.
- RetroHQ does **not** pretend these are UK prices and does not populate RetroHQ UK Market Value from PriceCharting alone.
- eBay UK and CeX UK remain independent provider slots.
- PriceCharting rate limit is protected server-side (max 1 call/second).
- No API token is sent to the browser or stored in this ZIP.
