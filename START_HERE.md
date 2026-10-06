# RetroHQ Test 8 — Counter Flow

Test 8 is built from the working Test 7.4 baseline. Test 7.4 remains untouched as the rollback point.

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
RetroHQ Test 8 — Counter Flow: http://localhost:8006
```

Open forwarded **port 8006** and hard refresh with **Ctrl + Shift + R**.

## What Test 8 is testing

The normal Buy Check target is now:

**Type / scan → press Enter → answer**

RetroHQ should only interrupt when the product identity is genuinely ambiguous.

Condition is reduced to **Excellent / Good / Poor**.

For console CeX evidence:

- **Poor → Discounted**
- **Good or Excellent + Box unticked → Unboxed**
- **Good or Excellent + Box ticked → Boxed**
- **Controller** and **Cables** are recorded separately and missing essentials are flagged.

The CeX catalogue match and PriceCharting evidence should normally happen in the background. Use **Why this value?** only when you want to inspect the evidence.

## First regression tests

1. **PS3 Slim 320GB Scarlet Red** — type it and press Enter. A clearly dominant identity should auto-lock; close alternatives should still ask one question.
2. Mark the same console **Poor** — CeX comparison should automatically switch to **Discounted** and refresh the UK value.
3. Mark it **Good**, leave Box unticked — CeX comparison should be **Unboxed**.
4. Tick **Box** — CeX comparison should automatically switch to **Boxed**.
5. Toggle **Controller** and **Cables** — the data should be retained and missing essentials should be visible without inventing a replacement cost.
6. Check the maximum-buy maths: it should be **45% of the displayed UK Market Value** by default, with no second condition discount.
7. Search an ambiguous item such as **Xbox** — RetroHQ should still ask which generation rather than guessing.
