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


def _normalize_int(s: str) -> Optional[int]:
    # "2 999" / "2 999" / "2999" -> 2999
    s = s.replace("\u00A0", " ")
    s = re.sub(r"\s+", "", s).strip()
    if not s.isdigit():
        return None
    return int(s)


def _extract_unit_price_any(text: str) -> Optional[Tuple[int, str]]:
    """
    例: "1084 Ft/kg" / "2999 Ft/litre" / "2999 Ft/l" / "97 Ft/db"
    Tescoは英語ページだと litre など表記が混ざる可能性があるので広めに取る
    """
    patterns = [
        r"(\d[\d\s\u00A0]{1,12})\s*Ft\s*/\s*(kg|l|db)\b",
        r"(\d[\d\s\u00A0]{1,12})\s*Ft\s*/\s*(litre|liter)\b",
    ]
    for pat in patterns:
        m = re.search(pat, text, flags=re.IGNORECASE)
        if not m:
            continue
        price = _normalize_int(m.group(1))
        if price is None:
            continue
        unit = m.group(2).lower()
        if unit in ("litre", "liter"):
            unit = "l"
        return price, f"Ft/{unit}"
    return None


def _extract_pack_price_any(text: str) -> Optional[int]:
    """
    ページ内の "xxxx Ft" を拾う（basketの 0 Ft などノイズもあるので、最初に出た値が怪しい時は候補を増やす）
    """
    candidates: List[int] = []
    for m in re.finditer(r"(\d[\d\s\u00A0]{1,12})\s*Ft\b", text, flags=re.IGNORECASE):
        price = _normalize_int(m.group(1))
        if price is None:
            continue
        if price <= 0:
            continue
        candidates.append(price)

    if not candidates:
        return None

    # 0 Ftや極端に小さい値（例: 1 Ft）が混ざることがあるので、妥当そうな最小を返す
    # （クラブカード価格等が別に出てくるが、今回は「通常価格」を優先するため最初の有力候補）
    return candidates[0]


def _maybe_accept_cookies(page) -> None:
    """
    Tescoの同意UIを閉じる（テキスト/role両方で雑に対応）
    失敗しても落とさない
    """
    try:
        # まず短時間待つ（同意UIが出る場合）
        page.wait_for_timeout(800)

        # ボタン文言候補（英/ハンガリー語）
        candidates = [
            "Accept all",
            "Reject all",
            "Összes elfogadása",
            "Összes cookie elfogadása",
            "Elfogadom",
            "Elutasítom",
            "Mindent elfogad",
            "Mindent elutasít",
        ]

        # role=button で探す
        for label in candidates:
            loc = page.get_by_role("button", name=label)
            if loc.count() > 0:
                loc.first.click(timeout=2000)
                page.wait_for_timeout(600)
                return

        # テキストで探す（roleに載らない場合）
        for label in candidates:
            loc2 = page.locator(f"text={label}")
            if loc2.count() > 0:
                loc2.first.click(timeout=2000)
                page.wait_for_timeout(600)
                return
    except Exception:
        return


def _fetch_and_extract(page, url: str, prefer_unit: bool) -> Tuple[Optional[int], str]:
    """
    1 URL につき:
    - 同意UIを処理
    - bodyテキスト + HTMLを解析して価格抽出
    """
    page.goto(url, wait_until="domcontentloaded", timeout=35000)
    _maybe_accept_cookies(page)

    # 価格が描画されるのを少し待つ
    page.wait_for_timeout(1200)

    # 1) bodyテキスト
    try:
        body_text = page.inner_text("body")
    except Exception:
        body_text = ""

    # 2) HTML（inner_textに出ない値がある場合に備える）
    try:
        html = page.content()
    except Exception:
        html = ""

    # 解析対象を合成（順序は body_text 優先）
    combined = body_text + "\n" + html

    # ユニット価格（Ft/kg等）
    unit = _extract_unit_price_any(combined)
    pack = _extract_pack_price_any(combined)

    if prefer_unit and unit is not None:
        return unit[0], unit[1]

    if pack is not None:
        return pack, "Ft"

    if unit is not None:
        return unit[0], unit[1]

    return None, ""


def _swap_lang_to_en(url: str) -> str:
    # hu-HU -> en-HU のフォールバック
    return url.replace("/hu-HU/", "/en-HU/")


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
        # 1回目：指定URL
        price, unit_label = _fetch_and_extract(page, item.url, item.prefer_unit_price)

        # 2回目：言語フォールバック（hu-HUが死ぬ場合）
        if price is None and "/hu-HU/" in item.url:
            fallback = _swap_lang_to_en(item.url)
            price, unit_label = _fetch_and_extract(page, fallback, item.prefer_unit_price)

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
            # 負荷配慮（最小限）
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