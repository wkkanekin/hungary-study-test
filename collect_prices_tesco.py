import json
import re
import sys
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

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


def normalize_int_huf(s: str) -> Optional[int]:
    s = s.replace("\u00A0", " ").strip()
    s = re.sub(r"\s+", "", s)
    if not s.isdigit():
        return None
    return int(s)


def extract_unit_price(text: str) -> Optional[Tuple[int, str]]:
    """
    例: "1084 Ft/kg" / "399 Ft/l" / "97 Ft/db"
    """
    m = re.search(r"(\d[\d\s\u00A0]{1,12})\s*Ft\s*/\s*(kg|l|db)\b", text, flags=re.IGNORECASE)
    if not m:
        return None
    price = normalize_int_huf(m.group(1))
    if price is None:
        return None
    unit = m.group(2).lower()
    return price, f"Ft/{unit}"


def extract_pack_price(text: str) -> Optional[int]:
    """
    ページ内の "xxxx Ft" の最初のまともな値を拾う（0 Ftは除外）
    """
    for m in re.finditer(r"(\d[\d\s\u00A0]{1,12})\s*Ft\b", text, flags=re.IGNORECASE):
        price = normalize_int_huf(m.group(1))
        if price is None:
            continue
        if price <= 0:
            continue
        return price
    return None


def collect_one(page, item: BasketItem, timeout_ms: int = 30000) -> Dict[str, Any]:
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
        page.goto(item.url, wait_until="domcontentloaded", timeout=timeout_ms)
        # 価格がJSで描画される可能性があるので少し待つ
        page.wait_for_timeout(1200)

        # bodyのテキストを取る（DOMが多少変わっても耐える）
        text = page.inner_text("body")

        unit_price = extract_unit_price(text)
        pack_price = extract_pack_price(text)

        if item.prefer_unit_price and unit_price is not None:
            result["price_huf"] = unit_price[0]
            result["unit_label"] = unit_price[1]
            result["status"] = "ok"
            return result

        if pack_price is not None:
            result["price_huf"] = pack_price
            result["unit_label"] = "Ft"
            result["status"] = "ok"
            return result

        # pack price取れず、unit priceだけ取れた場合の保険
        if unit_price is not None:
            result["price_huf"] = unit_price[0]
            result["unit_label"] = unit_price[1]
            result["status"] = "ok"
            return result

        result["status"] = "not_found"
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
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            user_agent=(
                "Mozilla/5.0 (X11; Linux x86_64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/121.0.0.0 Safari/537.36"
            )
        )
        page = context.new_page()

        for it in items:
            r = collect_one(page, it)
            results.append(r)
            # 負荷配慮（最小限）
            time.sleep(1.5)

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