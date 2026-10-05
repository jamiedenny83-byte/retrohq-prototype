# RetroHQ Test 7.4 — Start Here

## 1. Kill the previous RetroHQ server

```bash
pkill -f "server.py" 2>/dev/null || true
fuser -k 8006/tcp 2>/dev/null || true
```

## 2. Load the PriceCharting GENERAL API token

Keep the real token private and replace the placeholder below inside Codespaces only.

```bash
export PRICECHARTING_API_TOKEN="YOUR_GENERAL_API_TOKEN_HERE"
```

## 3. Check that it loaded without displaying it

```bash
if [ -n "$PRICECHARTING_API_TOKEN" ]; then echo "✓ PriceCharting token loaded"; else echo "✗ Token missing"; fi
```

## 4. Start RetroHQ

```bash
python3 server.py
```

Expected terminal line:

```text
RetroHQ Test 7.4 — CeX Selection + Decision Maths: http://localhost:8006
```

Open forwarded **port 8006** and hard refresh with **Ctrl + Shift + R**.

## First regression tests

1. **Original Xbox / Unboxed** — identity remains Original Xbox; CeX Unboxed is the relevant record; Retail / Cash / Voucher stay separate.
2. **PS3 Slim Red** — confirm the exact Scarlet Red / storage / Slim or Super Slim candidate; generic conflicting PS3 records must not enter valuation.
3. **Game Boy Advance System / Indigo** — confirm Indigo hardware; CeX cards must not overlap; Unboxed must not be labelled Boxed; selecting a CeX record must persist that exact record.

## Decision-maths check

With a £70 RetroHQ market value and Condition = Good:

- Condition-adjusted value: **£59.50**
- Target buy rate: **45%**
- Recommended maximum buy: **£26.78**
- Blank Asking Price: **Not entered**
- Expected Margin with no asking price: **—**
