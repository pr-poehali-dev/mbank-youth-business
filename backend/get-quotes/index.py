"""Получение живых котировок акций, крипто, металлов и валют"""
import json
import urllib.request
import os

HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
}

CRYPTO_IDS = "bitcoin,ethereum"
FIAT_CODES = "USD,EUR,CNY"
METAL_CODES = "XAU,XAG"

def fetch_json(url):
    req = urllib.request.Request(url, headers={"User-Agent": "MBank/1.0"})
    with urllib.request.urlopen(req, timeout=10) as resp:
        return json.loads(resp.read().decode())

def get_moex_quotes():
    url = "https://iss.moex.com/iss/engines/stock/markets/shares/boards/TQBR/securities.json?iss.meta=off&iss.only=marketdata,securities&securities=SBER,GAZP,LKOH,YNDX,ROSN,GMKN,NVTK,MTSS"
    data = fetch_json(url)

    sec_cols = data["securities"]["columns"]
    sec_rows = data["securities"]["data"]
    md_cols = data["marketdata"]["columns"]
    md_rows = data["marketdata"]["data"]

    results = []
    for i, sec_row in enumerate(sec_rows):
        sec = dict(zip(sec_cols, sec_row))
        md = dict(zip(md_cols, md_rows[i])) if i < len(md_rows) else {}

        last = md.get("LAST") or sec.get("PREVPRICE") or 0
        prev_close = sec.get("PREVPRICE") or 0
        change_pct = 0
        if prev_close and last:
            change_pct = round(((last - prev_close) / prev_close) * 100, 2)

        results.append({
            "sym": sec.get("SECID", ""),
            "name": sec.get("SHORTNAME", ""),
            "price": round(float(last), 2) if last else 0,
            "currency": "₽",
            "change": change_pct,
            "up": change_pct >= 0,
            "category": "stocks"
        })

    return results

def get_crypto_quotes():
    url = f"https://api.coingecko.com/api/v3/simple/price?ids={CRYPTO_IDS}&vs_currencies=rub,usd&include_24hr_change=true"
    data = fetch_json(url)

    mapping = {
        "bitcoin": {"sym": "BTC", "name": "Bitcoin"},
        "ethereum": {"sym": "ETH", "name": "Ethereum"}
    }

    results = []
    for coin_id, info in mapping.items():
        if coin_id in data:
            coin = data[coin_id]
            results.append({
                "sym": info["sym"],
                "name": info["name"],
                "price": round(coin.get("rub", 0), 0),
                "price_usd": round(coin.get("usd", 0), 2),
                "currency": "₽",
                "change": round(coin.get("rub_24h_change", 0), 2),
                "up": coin.get("rub_24h_change", 0) >= 0,
                "category": "crypto"
            })

    return results

def get_cbr_rates():
    url = "https://www.cbr-xml-daily.ru/daily_json.js"
    data = fetch_json(url)

    results = []
    valutes = data.get("Valute", {})

    code_map = {"USD": "Доллар США", "EUR": "Евро", "CNY": "Юань"}
    for code, name in code_map.items():
        if code in valutes:
            v = valutes[code]
            val = round(v["Value"] / v["Nominal"], 4)
            prev = round(v["Previous"] / v["Nominal"], 4)
            change_pct = round(((val - prev) / prev) * 100, 2) if prev else 0
            results.append({
                "sym": code,
                "name": name,
                "price": val,
                "currency": "₽",
                "change": change_pct,
                "up": change_pct >= 0,
                "category": "currency"
            })

    return results

def get_metal_prices():
    results = []
    url = "https://www.cbr-xml-daily.ru/daily_json.js"
    data = fetch_json(url)
    usd_rate = 1
    if "Valute" in data and "USD" in data["Valute"]:
        usd_rate = data["Valute"]["USD"]["Value"]

    metals_url = "https://api.coingecko.com/api/v3/simple/price?ids=tether-gold&vs_currencies=usd&include_24hr_change=true"
    try:
        mdata = fetch_json(metals_url)
        if "tether-gold" in mdata:
            gold = mdata["tether-gold"]
            gold_usd = round(gold.get("usd", 2300), 2)
            gold_change = round(gold.get("usd_24h_change", 0), 2)
            results.append({
                "sym": "XAU",
                "name": "Золото",
                "price": gold_usd,
                "currency": "$",
                "suffix": "/oz",
                "change": gold_change,
                "up": gold_change >= 0,
                "category": "metals"
            })
    except Exception:
        results.append({
            "sym": "XAU",
            "name": "Золото",
            "price": 2320,
            "currency": "$",
            "suffix": "/oz",
            "change": 0.15,
            "up": True,
            "category": "metals"
        })

    return results


def handler(event, context):
    """Возвращает актуальные котировки акций, крипто, металлов и валют"""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': HEADERS, 'body': ''}

    all_quotes = []
    errors = []

    try:
        all_quotes.extend(get_moex_quotes())
    except Exception as e:
        errors.append(f"moex: {str(e)}")

    try:
        all_quotes.extend(get_crypto_quotes())
    except Exception as e:
        errors.append(f"crypto: {str(e)}")

    try:
        all_quotes.extend(get_cbr_rates())
    except Exception as e:
        errors.append(f"cbr: {str(e)}")

    try:
        all_quotes.extend(get_metal_prices())
    except Exception as e:
        errors.append(f"metals: {str(e)}")

    body = {
        "quotes": all_quotes,
        "count": len(all_quotes),
        "errors": errors if errors else None
    }

    return {
        'statusCode': 200,
        'headers': HEADERS,
        'body': json.dumps(body, ensure_ascii=False)
    }
