import json
import re
import urllib.request
from datetime import datetime, timezone

UNIVERSITIES = [
    {
        "name": "Budapest University of Technology and Economics",
        "city": "Budapest",
        "the_url": "https://www.timeshighereducation.com/world-university-rankings/budapest-university-technology-and-economics"
    },
    {
        "name": "Corvinus University of Budapest",
        "city": "Budapest",
        "the_url": "https://www.timeshighereducation.com/world-university-rankings/corvinus-university-budapest"
    },
    {
        "name": "Eötvös Loránd University",
        "city": "Budapest",
        "the_url": "https://www.timeshighereducation.com/world-university-rankings/eotvos-lorand-university"
    },
    {
        "name": "Semmelweis University",
        "city": "Budapest",
        "the_url": "https://www.timeshighereducation.com/world-university-rankings/semmelweis-university"
    },
    {
        "name": "Hungarian University of Fine Arts",
        "city": "Budapest",
        "the_url": None
    },
    {
        "name": "Hungarian University of Sports Science",
        "city": "Budapest",
        "the_url": None
    },
    {
        "name": "Hungarian Dance University",
        "city": "Budapest",
        "the_url": None
    },
    {
        "name": "Liszt Ferenc Academy of Music",
        "city": "Budapest",
        "the_url": None
    },
    {
        "name": "Moholy-Nagy University of Art and Design",
        "city": "Budapest",
        "the_url": None
    },
    {
        "name": "Óbuda University",
        "city": "Budapest",
        "the_url": "https://www.timeshighereducation.com/world-university-rankings/obuda-university"
    },
    {
        "name": "Pázmány Péter Catholic University",
        "city": "Budapest",
        "the_url": None
    },
    {
        "name": "Károli Gáspár University of the Reformed Church in Hungary",
        "city": "Budapest",
        "the_url": None
    },
    {
        "name": "Ludovika University of Public Service",
        "city": "Budapest",
        "the_url": None
    },
    {
        "name": "John Wesley Theological College",
        "city": "Budapest",
        "the_url": None
    },
    {
        "name": "Dharma Gate Buddhist College",
        "city": "Budapest",
        "the_url": None
    },
    {
        "name": "Budapest Metropolitan University",
        "city": "Budapest",
        "the_url": "https://www.timeshighereducation.com/world-university-rankings/budapest-metropolitan-university"
    },
    {
        "name": "Budapest University of Economics and Business",
        "city": "Budapest",
        "the_url": "https://www.timeshighereducation.com/world-university-rankings/budapest-business-school"
    },
    {
        "name": "University of Veterinary Medicine Budapest",
        "city": "Budapest",
        "the_url": None
    },
    {
        "name": "MFA Balassi Preparatory Programme",
        "city": "Budapest",
        "the_url": None
    },
    {
        "name": "University of Debrecen",
        "city": "Debrecen",
        "the_url": "https://www.timeshighereducation.com/world-university-rankings/university-debrecen"
    },
    {
        "name": "University of Szeged",
        "city": "Szeged",
        "the_url": "https://www.timeshighereducation.com/world-university-rankings/university-szeged"
    },
    {
        "name": "University of Pécs",
        "city": "Pécs",
        "the_url": "https://www.timeshighereducation.com/world-university-rankings/university-pecs"
    },
    {
        "name": "University of Miskolc",
        "city": "Miskolc",
        "the_url": "https://www.timeshighereducation.com/world-university-rankings/university-miskolc"
    },
    {
        "name": "University of Sopron",
        "city": "Sopron",
        "the_url": None
    },
    {
        "name": "Széchenyi István University",
        "city": "Győr",
        "the_url": None
    },
    {
        "name": "University of Pannonia",
        "city": "Veszprém",
        "the_url": None
    },
    {
        "name": "University of Nyíregyháza",
        "city": "Nyíregyháza",
        "the_url": None
    },
    {
        "name": "University of Dunaújváros",
        "city": "Dunaújváros",
        "the_url": None
    },
    {
        "name": "John von Neumann University",
        "city": "Kecskemét",
        "the_url": None
    },
    {
        "name": "Hungarian University of Agriculture and Life Sciences (MATE)",
        "city": "Gödöllő",
        "the_url": "https://www.timeshighereducation.com/world-university-rankings/hungarian-university-agriculture-and-life-sciences"
    },
    {
        "name": "Eszterházy Károly Catholic University",
        "city": "Eger",
        "the_url": None
    },
    {
        "name": "University of Tokaj",
        "city": "Sárospatak",
        "the_url": None
    },
    {
        "name": "Apor Vilmos Catholic College",
        "city": "Vác",
        "the_url": None
    },
    {
        "name": "Episcopal Theological College of Pécs",
        "city": "Pécs",
        "the_url": None
    },
    {
        "name": "Eötvös József College",
        "city": "Baja",
        "the_url": None
    },
    {
        "name": "Kodály Institute",
        "city": "Kecskemét",
        "the_url": None
    },
    {
        "name": "International Business School Budapest",
        "city": "Budapest",
        "the_url": None
    }
]


def fetch_html(url: str) -> str:
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0"
        }
    )
    with urllib.request.urlopen(req, timeout=60) as res:
        return res.read().decode("utf-8", errors="ignore")


def extract_rank(html: str) -> str:
    patterns = [
        r'"rank":"([^"]+)"',
        r'"current_rank":"([^"]+)"',
        r'"overall_rank":"([^"]+)"',
        r'"ranked":"([^"]+)"'
    ]

    for pattern in patterns:
        match = re.search(pattern, html)
        if match:
            value = str(match.group(1)).strip()
            if value:
                return normalize_rank(value)

    return "—"


def normalize_rank(value: str) -> str:
    s = str(value or "").strip()
    s = s.replace("&nbsp;", " ")
    s = s.replace("–", "-").replace("—", "-")
    s = re.sub(r"\s+", "", s)

    if not s or s.upper() == "N/A":
        return "—"

    return s.replace("-", "–")


def rank_sort_key(item: dict) -> tuple[int, int]:
    rank = str(item.get("rank", "—")).strip()

    if rank in {"—", "N/A", ""}:
        return (999999, 999999)

    normalized = rank.replace("–", "-").replace("—", "-")

    if "-" in normalized:
        parts = normalized.split("-", 1)
        try:
            return (int(parts[0]), int(parts[1]))
        except Exception:
            return (999998, 999998)

    try:
        n = int(normalized)
        return (n, n)
    except Exception:
        return (999997, 999997)


def build_results() -> list[dict]:
    results = []

    for uni in UNIVERSITIES:
        name = uni["name"]
        city = uni["city"]
        the_url = uni["the_url"]

        if not the_url:
            results.append({
                "university": name,
                "city": city,
                "rank": "—",
                "url": "",
                "listed_in_the": False
            })
            continue

        try:
            html = fetch_html(the_url)
            rank = extract_rank(html)

            results.append({
                "university": name,
                "city": city,
                "rank": rank if rank else "—",
                "url": the_url,
                "listed_in_the": rank not in {"—", "N/A", ""}
            })
        except Exception:
            results.append({
                "university": name,
                "city": city,
                "rank": "—",
                "url": the_url,
                "listed_in_the": False
            })

    results.sort(key=rank_sort_key)
    return results


def main() -> None:
    results = build_results()

    output = {
        "source": "Times Higher Education",
        "updated": datetime.now(timezone.utc).isoformat(),
        "count": len(results),
        "universities": results
    }

    with open("rankings.json", "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print("rankings.json generated")


if __name__ == "__main__":
    main()