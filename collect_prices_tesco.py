import json
import re
import sys
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

import requests
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError


@dataclass
class BasketItem:
    id: str
    name: str
    url: str
    note: str
    prefer_unit_price: bool


def load_basket(path: str) -> Tuple[str, str, List[BasketItem]]:
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)

    source = str(data.get("source", "unknown"))
    currency = str(data.get("currency", "HUF"))

    raw_items = data.get("items", [])
    if not isinstance(raw_items, list) or not raw_items:
        raise ValueError("basket.json: items が空です")

    items: List[BasketItem] = []
    for it in raw_items:
        items.append(
            BasketItem(
                id=str(it["id"]),
                name=str(it["name"]),
                url=str(it["url"]),
                note=str(it.get("note", "")),
                prefer_unit_price=bool(it.get("prefer_unit_price", False)),
            )
        )

    return source, currency, items


def extract_product_id(url: str) -> Optional[str]:
    m = re.search(r"/products/(\d+)", url)
    return m.group(1) if m else None


def build_api_url_from_page_url(page_url: str, product_id: str) -> str:
    """
    Tesco groceries の商品ページは国/言語で分かれるが、
    APIは概ね以下形で商品JSONを返す（ここを組み立てる）。
    例: https://bevasarlas.tesco.hu/groceries/en-HU/products/2004009639931
    -> https://bevasarlas.tesco.hu/groceries/en-HU/products/2004009639931
       （ページ）を開いて、XHRのJSONレスポンスURLを捕まえる方が確実

    なのでこの関数は補助。基本は Playwright でXHRを捕まえる。
    """
    # フォールバックとして、ページURL自体を返す（ここからXHR捕まえる）
    return page_url


def normalize_huf(value: Any) -> Optional[int]:
    # TescoのJSONは pence/cents 的な minor unit じゃなく、そのまま数値HUFの場合が多いが、
    # 念のため int へ
    try:
        if value is None:
            return None
        if isinstance(value, (int, float)):
            if value <= 0:
                return None
            return int(round(value))
        if isinstance(value, str):
            s = value.strip()
            s = s.replace("\u00A0", " ")
            s = re.sub(r"\s+", "", s)
            if s.isdigit():
                n = int(s)
                return n if n > 0 else None
        return None
    except Exception:
        return None


def pick_price_from_product_json(obj: Dict[str, Any], prefer_unit_price: bool) -> Tuple[Optional[int], str]:
    """
    Tescoの商品JSONは構造が変わり得るので、複数候補から価格を拾う。
    目標:
      - 通常価格（HUF）
      - unit price（Ft/kg など）があれば prefer_unit_price=True のとき優先
    """
    # 候補パスを幅広く探索する
    # unit price系
    unit_candidates = []

    # pack price系
    price_candidates = []

    # よくある: obj['price']['value']
    def dig(d: Any, path: List[str]) -> Any:
        cur = d
        for k in path:
            if not isinstance(cur, dict) or k not in cur:
                return None
            cur = cur[k]
        return cur

    # pack price候補
    possible_price_paths = [
        ["price", "value"],
        ["price", "amount"],
        ["prices", "price"],
        ["prices", "current", "value"],
        ["prices", "current", "price"],
        ["product", "price", "value"],
        ["product", "prices", "price"],
    ]
    for p in possible_price_paths:
        v = dig(obj, p)
        n = normalize_huf(v)
        if n is not None:
            price_candidates.append(n)

    # unit price候補（値 + 単位）
    possible_unit_paths = [
        (["unitPrice", "value"], ["unitPrice", "unit"]),
        (["unit_price", "value"], ["unit_price", "unit"]),
        (["prices", "unitPrice", "value"], ["prices", "unitPrice", "unit"]),
        (["product", "unitPrice", "value"], ["product", "unitPrice", "unit"]),
    ]
    for pv, pu in possible_unit_paths:
        v = dig(obj, pv)
        u = dig(obj, pu)
        n = normalize_huf(v)
        if n is not None and isinstance(u, str) and u:
            unit_candidates.append((n, u))

    # どうしても取れない時のために全探索（高コストだが月1なのでOK）
    def walk(x: Any):
        if isinstance(x, dict):
            for k, v in x.items():
                yield k, v
                yield from walk(v)
        elif isinstance(x, list):
            for v in x:
                yield from walk(v)

    # unit price文字列（"Ft/kg"など）がどこかに埋まってる場合
    # pack price数値が散らばってる場合
    for k, v in walk(obj):
        if isinstance(v, str):
            # "1084 Ft/kg" 的な表記
            m = re.search(r"(\d[\d\s\u00A0]{1,12})\s*Ft\s*/\s*(kg|l|db|litre|liter)\b", v, flags=re.IGNORECASE)
            if m:
                n = normalize_huf(m.group(1))
                if n is not None:
                    unit = m.group(2).lower()
                    if unit in ("litre", "liter"):
                        unit = "l"
                    unit_candidates.append((n, f"Ft/{unit}"))
        else:
            # 数値っぽい
            if k.lower() in ("price", "value", "amount", "currentprice", "unitprice"):
                n = normalize_huf(v)
                if n is not None:
                    # unitpriceかどうかは判別できないので一旦pack側へ
                    price_candidates.append(n)

    # unit優先
    if prefer_unit_price and unit_candidates:
        # いちばん小さいのを採用（変な候補を避ける）
        unit_candidates.sort(key=lambda t: t[0])
        val, unit = unit_candidates[0]
        # unitが "kg" だけ等の場合があるので整形
        if unit in ("kg", "l", "db"):
            unit = f"Ft/{unit}"
        return val, unit

    # pack price
    if price_candidates:
        # 価格候補が複数あれば、最小を採用（割引/通常が混在でも変なのを避ける）
        price_candidates.sort()
        return price_candidates[0], "Ft"

    # unitしかない場合
    if unit_candidates:
        unit_candidates.sort(key=lambda t: t[0])
        val, unit = unit_candidates[0]
        if unit in ("kg", "l", "db"):
            unit = f"Ft/{unit}"
        return val, unit

    return None, ""


def fetch_product_json_via_xhr(page, product_page_url: str) -> Optional[Dict[str, Any]]:
    """
    商品ページを開くと、内部で商品JSONを取りに行く。
    そのJSONレスポンスを捕まえてパースする。
    """
    captured: Dict[str, Any] = {"json": None}

    def on_response(response):
        try:
            url = response.url
            # それっぽいJSONだけ拾う（広め）
            if "product" in url.lower() and "json" in (response.headers.get("content-type", "")).lower():
                data = response.json()
                if isinstance(data, dict):
                    captured["json"] = data
        except Exception:
            pass

    page.on("response", on_response)

    page.goto(product_page_url, wait_until="domcontentloaded", timeout=35000)
    page.wait_for_timeout(2500)

    return captured["json"]


def collect_one(page, item: BasketItem) -> Dict[str, Any]:
    now_iso = datetime.now(timezone.utc).isoformat()

    result: Dict[str, Any] = {
        "id": item.id,
        "name": item.name,
        "url": item.url,
        "note": item.note,
        "price_huf": None,
        "unit_label": "",
        "status": "error",
        "fetched_at": now_iso,
    }

    try:
        pj = fetch_product_json_via_xhr(page, item.url)

        # フォールバック：言語切替
        if pj is None and "/hu-HU/" in item.url:
            pj = fetch_product_json_via_xhr(page, item.url.replace("/hu-HU/", "/en-HU/"))

        if pj is None:
            result["status"] = "not_found"
            return result

        price, unit_label = pick_price_from_product_json(pj, item.prefer_unit_price)
        if price is None:
            result["status"] = "not_found"
            return result

        result["price_huf"] = int(price)
        result["unit_label"] = unit_label
        result["status"] = "ok"
        return result

    except PlaywrightTimeoutError:
        result["status"] = "timeout"
        return result
    except Exception as e:
        result["status"] = f"exception:{type(e).__name__}"
        return result


def collect_prices(basket_path: str, out_path: str) -> None:
    source, currency, items = load_basket(basket_path)
    updated_at = datetime.now(timezone.utc).isoformat()

    results: List[Dict[str, Any]] = []

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=[
                "--no-sandbox",
                "--disable-dev-shm-usage",
                "--disable-blink-features=AutomationControlled",
            ],
        )
        context = browser.new_context(
            user_agent=(
                "Mozilla/5.0 (X11; Linux x86_64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/121.0.0.0 Safari/537.36"
            ),
            locale="en-US",
        )
        page = context.new_page()

        for it in items:
            r = collect_one(page, it)
            results.append(r)
            time.sleep(1.2)

        context.close()
        browser.close()

    payload: Dict[str, Any] = {
        "source": source,
        "currency": currency,
        "updated_at": updated_at,
        "items": results,
    }

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)

    print(f"Wrote: {out_path}")


if __name__ == "__main__":
    basket_path = sys.argv[1] if len(sys.argv) > 1 else "basket.json"
    out_path = sys.argv[2] if len(sys.argv) > 2 else "prices.json"
    collect_prices(basket_path, out_path)