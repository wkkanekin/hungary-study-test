import csv
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from urllib.request import urlopen, Request


KSH_CSV_URL = "https://www.ksh.hu/stadat_files/ara/en/ara0044.csv"
CSV_ENCODING = "cp1250"


MONTH_MAP = {
    "january": 1,
    "february": 2,
    "march": 3,
    "april": 4,
    "may": 5,
    "june": 6,
    "july": 7,
    "august": 8,
    "september": 9,
    "october": 10,
    "november": 11,
    "december": 12,
}


def load_basket(path: str) -> Tuple[str, str, List[Dict[str, Any]]]:
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    source = str(data.get("source", "unknown"))
    currency = str(data.get("currency", "HUF"))

    items = data.get("items", [])
    if not isinstance(items, list) or not items:
        raise ValueError("basket.json: items が空です")

    for it in items:
        mc = it.get("ksh_match_contains")
        if not isinstance(mc, list) or not mc:
            raise ValueError("basket.json: 各itemに ksh_match_contains (配列) が必要です")

    return source, currency, items


def fetch_ksh_csv() -> str:
    req = Request(
        KSH_CSV_URL,
        headers={"User-Agent": "Mozilla/5.0 (compatible; price-bot/1.0; +https://hungarystudy.org)"},
        method="GET",
    )
    with urlopen(req, timeout=60) as r:
        raw = r.read()
    return raw.decode(CSV_ENCODING, errors="replace")


def parse_int(value: str) -> Optional[int]:
    if value is None:
        return None
    s = str(value).strip()
    if not s:
        return None
    s = s.replace("\u00A0", " ")
    s = re.sub(r"\s+", "", s)
    if not s.isdigit():
        return None
    return int(s)


def normalize_text(s: str) -> str:
    s = (s or "").lower()
    s = s.replace("\u00A0", " ")
    s = re.sub(r"\s+", " ", s).strip()
    return s


def pick_latest_month_column(header: List[str], rows: List[Dict[str, str]]) -> str:
    """
    例: "2026 January" のような列名を年月で比較して最大を選ぶ。
    比較対象にできる月列が無い場合は右端走査にフォールバック。
    """
    month_cols: List[Tuple[Tuple[int, int], str]] = []

    for h in header:
        if h in ("Code", "Denomination"):
            continue
        m = re.match(r"^\s*(\d{4})\s+([A-Za-z]+)\s*$", str(h))
        if not m:
            continue
        year = int(m.group(1))
        mon_name = m.group(2).lower()
        if mon_name not in MONTH_MAP:
            continue
        month = MONTH_MAP[mon_name]
        month_cols.append(((year, month), h))

    # 月列が取れた場合：最新年月の列を採用
    if month_cols:
        month_cols.sort(key=lambda x: x[0])
        # 最新列でも全行NAの可能性があるので、古い方へ落ちながら“値が存在する列”を探す
        for (_, col) in reversed(month_cols):
            for r in rows:
                v = parse_int(r.get(col, ""))
                if v is not None:
                    return col
        # ここまで来たら全列空なので最後の列名を返す（エラーよりマシ）
        return month_cols[-1][1]

    # フォールバック：右端から値が入っている列
    fallback_cols = [h for h in header if h not in ("Code", "Denomination")]
    if not fallback_cols:
        raise RuntimeError("KSH CSV: 月次列が見つかりません")

    for col in reversed(fallback_cols):
        for r in rows:
            v = parse_int(r.get(col, ""))
            if v is not None:
                return col

    raise RuntimeError("KSH CSV: 最新月列を特定できませんでした")


def match_row_by_contains(rows: List[Dict[str, str]], contains: List[str]) -> Optional[Dict[str, str]]:
    """
    Denominationに contains の全トークンが含まれる行を返す（最初に一致した行）
    """
    tokens = [normalize_text(t) for t in contains if str(t).strip()]
    if not tokens:
        return None

    for r in rows:
        denom = normalize_text(r.get("Denomination", ""))
        if not denom:
            continue
        ok = True
        for t in tokens:
            if t not in denom:
                ok = False
                break
        if ok:
            return r

    return None


def derive_unit_from_denomination(denom: str) -> str:
    """
    KSHのDenomination表記から単位を抽出して、それを“統計データに合わせた形”で返す。
    例:
      - "... kg"              -> "Ft/kg"
      - "... litre" / "... l" -> "Ft/litre"
      - "... 10 pieces"       -> "Ft/10 pieces"
      - "... 125–150 g"       -> "Ft/125–150 g"
    """
    d = denom or ""
    dl = d.lower()

    # 10 pieces / 12 pieces など
    m = re.search(r"\b(\d+)\s*pieces\b", dl)
    if m:
        return f"Ft/{m.group(1)} pieces"

    # kg
    if re.search(r"\bkg\b", dl):
        return "Ft/kg"

    # litre / liter / l
    if "litre" in dl or "liter" in dl or re.search(r"\bl\b", dl):
        # “l”だけは誤検出しやすいので、milk/oil等の文脈がないときはlitre優先
        return "Ft/litre"

    # g 範囲（125–150 g 等）をそのまま
    m = re.search(r"\b(\d+\s*[–\-]\s*\d+\s*g)\b", d)
    if m:
        unit = re.sub(r"\s+", " ", m.group(1)).strip()
        return f"Ft/{unit}"
    m = re.search(r"\b(\d+\s*g)\b", d)
    if m:
        unit = re.sub(r"\s+", " ", m.group(1)).strip()
        return f"Ft/{unit}"

    # それ以外は不明（KSHの行の単位が読み取れない）
    return "Ft"


def build_prices_json(basket_path: str, out_path: str) -> None:
    source, currency, basket_items = load_basket(basket_path)
    updated_at = datetime.now(timezone.utc).isoformat()

    csv_text = fetch_ksh_csv()

    # 1行目がタイトル行で、2行目がヘッダの形式が多いので、1行目を捨ててDictReader
    lines = csv_text.splitlines()
    if len(lines) < 2:
        raise RuntimeError("KSH CSV が想定より短いです")

    lines2 = lines[1:]
    reader = csv.DictReader(lines2, delimiter=";")
    header = reader.fieldnames or []
    rows: List[Dict[str, str]] = list(reader)

    latest_col = pick_latest_month_column(header, rows)

    out_items: List[Dict[str, Any]] = []

    for it in basket_items:
        contains = it.get("ksh_match_contains", [])
        row = match_row_by_contains(rows, contains)

        item_out: Dict[str, Any] = {
            "id": it.get("id", ""),
            "label_ja": it.get("label_ja", ""),
            "ksh_match_contains": contains,
            "ksh_code": None,
            "ksh_denomination": None,
            "ksh_unit": None,
            "note": "KSH平均価格（全国）",
            "price_huf": None,
            "status": "error",
            "fetched_at": updated_at,
        }

        if not row:
            item_out["status"] = "not_found_denomination"
            out_items.append(item_out)
            continue

        denom = str(row.get("Denomination", "")).strip()
        item_out["ksh_code"] = str(row.get("Code", "")).strip() or None
        item_out["ksh_denomination"] = denom or None
        item_out["ksh_unit"] = derive_unit_from_denomination(denom)

        v = parse_int(row.get(latest_col, ""))
        if v is None:
            item_out["status"] = "not_found_value"
            out_items.append(item_out)
            continue

        item_out["price_huf"] = v
        item_out["status"] = "ok"
        out_items.append(item_out)

    payload: Dict[str, Any] = {
        "source": source,
        "currency": currency,
        "updated_at": updated_at,
        "ksh_table": "1.2.1.8 / ara0044",
        "ksh_latest_month": latest_col,
        "items": out_items,
    }

    Path(out_path).write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote: {out_path} (latest: {latest_col})")


if __name__ == "__main__":
    basket_path = sys.argv[1] if len(sys.argv) > 1 else "basket.json"
    out_path = sys.argv[2] if len(sys.argv) > 2 else "prices.json"
    build_prices_json(basket_path, out_path)