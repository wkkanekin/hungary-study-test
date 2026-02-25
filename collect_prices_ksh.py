import csv
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from urllib.request import urlopen, Request


KSH_CSV_URL = "https://www.ksh.hu/stadat_files/ara/en/ara0044.csv"
CSV_ENCODING = "cp1250"  # KSHのCSVは中欧系エンコーディング（UTF-8ではない）


def load_basket(path: str) -> Tuple[str, str, List[Dict[str, Any]]]:
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    source = str(data.get("source", "unknown"))
    currency = str(data.get("currency", "HUF"))

    items = data.get("items", [])
    if not isinstance(items, list) or not items:
        raise ValueError("basket.json: items が空です")

    # ksh_code 必須
    for it in items:
        if "ksh_code" not in it:
            raise ValueError("basket.json: 各itemに ksh_code が必要です")

    return source, currency, items


def fetch_ksh_csv() -> str:
    # GitHub Actions等でも落ちないようにUA付与
    req = Request(
        KSH_CSV_URL,
        headers={
            "User-Agent": "Mozilla/5.0 (compatible; price-bot/1.0; +https://hungarystudy.org)"
        },
        method="GET",
    )
    with urlopen(req, timeout=60) as r:
        raw = r.read()
    # cp1250でデコード
    return raw.decode(CSV_ENCODING, errors="replace")


def parse_int(value: str) -> Optional[int]:
    """
    KSH CSVは '1 710' のようにスペース区切りの数値がある
    """
    if value is None:
        return None
    s = str(value).strip()
    if not s or s.lower() == "na":
        return None
    s = s.replace("\u00A0", " ")
    s = re.sub(r"\s+", "", s)
    if not s.isdigit():
        return None
    return int(s)


def find_latest_month_column(header: List[str], rows: List[Dict[str, str]], codes: List[str]) -> Optional[str]:
    """
    最新月列を推定：
    - 'Code','Denomination'以外の列（例: '2026 January'）を右端から見て
    - 対象codesのうち、少なくとも1つが数値として埋まっている最初の列を採用
    """
    month_cols = [h for h in header if h not in ("Code", "Denomination")]
    if not month_cols:
        return None

    # code->row辞書
    row_map = {str(r.get("Code", "")).strip(): r for r in rows}

    for col in reversed(month_cols):
        for c in codes:
            r = row_map.get(c)
            if not r:
                continue
            v = parse_int(r.get(col, ""))
            if v is not None:
                return col

    return None


def build_prices_json(basket_path: str, out_path: str) -> None:
    source, currency, basket_items = load_basket(basket_path)
    updated_at = datetime.now(timezone.utc).isoformat()

    csv_text = fetch_ksh_csv()

    # CSVは先頭行にタイトル行があり、2行目がヘッダ
    # なのでcsv.readerで読み、最初の行は捨ててからDictReader
    lines = csv_text.splitlines()
    if len(lines) < 2:
        raise RuntimeError("KSH CSV が想定より短いです")

    # 1行目（タイトル）を捨てる
    lines2 = lines[1:]

    reader = csv.DictReader(lines2, delimiter=";")
    header = reader.fieldnames or []
    rows: List[Dict[str, str]] = list(reader)

    # 対象コード
    codes = [str(it["ksh_code"]).strip() for it in basket_items]

    latest_col = find_latest_month_column(header, rows, codes)
    if not latest_col:
        raise RuntimeError("最新月の列を特定できませんでした")

    # code->row
    row_map = {str(r.get("Code", "")).strip(): r for r in rows}

    out_items: List[Dict[str, Any]] = []
    for it in basket_items:
        code = str(it["ksh_code"]).strip()
        r = row_map.get(code)

        item_out: Dict[str, Any] = {
            "id": it.get("id", code),
            "name": it.get("name", ""),
            "ksh_code": code,
            "unit_label": it.get("unit_label", "Ft"),
            "note": it.get("note", ""),
            "price_huf": None,
            "status": "error",
            "fetched_at": updated_at,
        }

        if not r:
            item_out["status"] = "not_found_code"
            out_items.append(item_out)
            continue

        v = parse_int(r.get(latest_col, ""))
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