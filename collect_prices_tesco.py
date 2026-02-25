import json
import re
import sys
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError


@dataclass
class BasketItem:
    id: str
    name: str
    url: str
    note: str
    prefer_unit_price: bool


DEBUG_DIR = Path("debug_prices")


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


def detect_block_or_consent(text: str) -> Optional[str]:
    t = (text or "").lower()
    # ざっくり検知（多言語あり得る）
    keywords = [
        "access denied",
        "forbidden",
        "robot",
        "captcha",
        "are you a robot",
        "unusual traffic",
        "security check",
        "consent",
        "cookie",
        "we value your privacy",
        "gdpr",
        "turn on javascript",
        "enable javascript",
        "akamai",
        "cloudflare",
    ]
    for k in keywords:
        if k in t:
            # cookie/consent と block を分けたいならここで拡張
            return k
    return None


def extract_unit_price_from_any(text: str) -> Optional[Tuple[int, str]]:
    """
    例: "1084 Ft/kg" / "399 Ft/l" / "97 Ft/db"
    HTMLでもTEXTでも拾えるようにする
    """
    m = re.search(r"(\d[\d\s\u00A0]{1,12})\s*Ft\s*/\s*(kg|l|db)\b", text, flags=re.IGNORECASE)
    if not m:
        return None
    price = normalize_int_huf(m.group(1))
    if price is None:
        return None
    unit = m.group(2).lower()
    return price, f"Ft/{unit}"


def extract_pack_price_from_any(text: str) -> Optional[int]:
    """
    例: "1 299 Ft" を拾う（0 Ftは除外）
    """
    for m in re.finditer(r"(\d[\d\s\u00A0]{1,12})\s*Ft\b", text, flags=re.IGNORECASE):
        price = normalize_int_huf(m.group(1))
        if price is None:
            continue
        if price <= 0:
            continue
        return price
    return None


def extract_from_jsonld(html: str) -> Optional[Tuple[int, str]]:
    """
    JSON-LD内の offers.price を拾う。
    典型例:
      <script type="application/ld+json">{... "offers":{"price":"1299","priceCurrency":"HUF"} ...}</script>
    """
    # scriptタグを全部抜く（軽量に正規表現）
    scripts = re.findall(
        r'<script[^>]+type=["\']application/ld\+json["\'][^>]*>(.*?)</script>',
        html,
        flags=re.IGNORECASE | re.DOTALL,
    )
    for raw in scripts:
        raw = raw.strip()
        if not raw:
            continue
        try:
            data = json.loads(raw)
        except Exception:
            continue

        # JSON-LDは配列のこともある
        candidates = data if isinstance(data, list) else [data]
        for obj in candidates:
            if not isinstance(obj, dict):
                continue
            offers = obj.get("offers")
            if isinstance(offers, list) and offers:
                offers = offers[0]
            if not isinstance(offers, dict):
                continue

            price = offers.get("price")
            currency = offers.get("priceCurrency") or "HUF"
            if price is None:
                continue

            # "1299" / 1299 / "1 299" など
            p = str(price)
            p = p.replace("\u00A0", " ")
            p = re.sub(r"[^\d\s]", "", p)
            p = re.sub(r"\s+", "", p)
            if p.isdigit():
                return int(p), f"Ft ({currency})"

    return None


def safe_write_debug(item_id: str, html: str, screenshot_bytes: Optional[bytes]) -> None:
    DEBUG_DIR.mkdir(parents=True, exist_ok=True)
    (DEBUG_DIR / f"{item_id}.html").write_text(html or "", encoding="utf-8")
    if screenshot_bytes:
        (DEBUG_DIR / f"{item_id}.png").write_bytes(screenshot_bytes)


def try_click_cookie_buttons(page) -> None:
    """
    Cookie同意が出る場合に押して先へ進める（出なければ無視）
    """
    selectors = [
        'button:has-text("Accept all")',
        'button:has-text("Accept All")',
        'button:has-text("I agree")',
        'button:has-text("Agree")',
        'button:has-text("Elfogadom")',
        'button:has-text("Összes elfogadása")',
        'button:has-text("Accept")',
    ]
    for sel in selectors:
        try:
            loc = page.locator(sel)
            if loc.count() > 0 and loc.first.is_visible():
                loc.first.click(timeout=1500)
                page.wait_for_timeout(800)
                return
        except Exception:
            pass


def collect_one(page, item: BasketItem, timeout_ms: int = 45000) -> Dict[str, Any]:
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

    html = ""
    shot = None

    try:
        page.goto(item.url, wait_until="networkidle", timeout=timeout_ms)
        page.wait_for_timeout(1200)

        # cookie同意が出てるなら押す
        try_click_cookie_buttons(page)

        # もう少し待つ（価格が遅延描画のケース）
        page.wait_for_timeout(1200)

        # text と html を両方確保
        body_text = ""
        try:
            body_text = page.inner_text("body")
        except Exception:
            body_text = ""

        html = page.content()

        # ブロック/同意検知
        flag = detect_block_or_consent(body_text) or detect_block_or_consent(html)
        if flag:
            # デバッグ保存
            try:
                shot = page.screenshot(full_page=True)
            except Exception:
                shot = None
            safe_write_debug(item.id, html, shot)
            result["status"] = f"blocked_or_consent:{flag}"
            return result

        # 1) JSON-LD（最優先）
        j = extract_from_jsonld(html)
        if j is not None and not item.prefer_unit_price:
            result["price_huf"] = int(j[0])
            result["unit_label"] = "Ft"
            result["status"] = "ok"
            return result

        # 2) unit price（Ft/kg等）
        unit_price = extract_unit_price_from_any(body_text) or extract_unit_price_from_any(html)
        pack_price = extract_pack_price_from_any(body_text) or extract_pack_price_from_any(html)

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

        # packが取れず unitだけ取れた保険
        if unit_price is not None:
            result["price_huf"] = unit_price[0]
            result["unit_label"] = unit_price[1]
            result["status"] = "ok"
            return result

        # それでもダメなら debug 保存
        try:
            shot = page.screenshot(full_page=True)
        except Exception:
            shot = None
        safe_write_debug(item.id, html, shot)

        result["status"] = "not_found"
        return result

    except PlaywrightTimeoutError:
        # debug保存（可能なら）
        try:
            html = page.content()
        except Exception:
            html = ""
        try:
            shot = page.screenshot(full_page=True)
        except Exception:
            shot = None
        safe_write_debug(item.id, html, shot)

        result["status"] = "timeout"
        return result

    except Exception as e:
        try:
            html = page.content()
        except Exception:
            html = ""
        try:
            shot = page.screenshot(full_page=True)
        except Exception:
            shot = None
        safe_write_debug(item.id, html, shot)

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
                "--disable-blink-features=AutomationControlled",
                "--no-sandbox",
            ],
        )
        context = browser.new_context(
            locale="hu-HU",
            timezone_id="Europe/Budapest",
            viewport={"width": 1280, "height": 900},
            user_agent=(
                "Mozilla/5.0 (X11; Linux x86_64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/121.0.0.0 Safari/537.36"
            ),
            extra_http_headers={
                "Accept-Language": "hu-HU,hu;q=0.9,en-US;q=0.8,en;q=0.7,ja;q=0.6",
            },
        )
        page = context.new_page()

        for it in items:
            r = collect_one(page, it)
            results.append(r)
            # 負荷配慮
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
    print(f"Debug dir: {DEBUG_DIR.resolve()}")


if __name__ == "__main__":
    basket_path = sys.argv[1] if len(sys.argv) > 1 else "basket.json"
    out_path = sys.argv[2] if len(sys.argv) > 2 else "prices.json"
    collect_prices(basket_path, out_path)