import json
import re
import sys
import time
from collections import defaultdict
from datetime import datetime, timezone
from html import unescape
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple
from urllib.parse import urljoin
from urllib.request import Request, urlopen


BASE_URL = "https://apply.stipendiumhungaricum.hu"
INSTITUTIONS_URL = f"{BASE_URL}/institutions"

USER_AGENT = (
    "Mozilla/5.0 (compatible; hungarystudy-bot/1.0; "
    "+https://hungarystudy.org)"
)

REQUEST_TIMEOUT = 60
SLEEP_BETWEEN_REQUESTS = 0.8


def fetch_html(url: str) -> str:
    req = Request(
        url,
        headers={
            "User-Agent": USER_AGENT,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        method="GET",
    )
    with urlopen(req, timeout=REQUEST_TIMEOUT) as r:
        raw = r.read()
    return raw.decode("utf-8", errors="replace")


def normalize_space(text: str) -> str:
    text = text.replace("\u00a0", " ")
    text = re.sub(r"[ \t\r\f\v]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def strip_tags_keep_newlines(html: str) -> str:
    s = html

    # remove script / style
    s = re.sub(r"(?is)<script\b.*?>.*?</script>", "\n", s)
    s = re.sub(r"(?is)<style\b.*?>.*?</style>", "\n", s)

    # convert common block tags to line breaks
    s = re.sub(r"(?is)<br\s*/?>", "\n", s)
    s = re.sub(r"(?is)</(p|div|section|article|li|ul|ol|h1|h2|h3|h4|h5|h6|tr|td|th)>", "\n", s)

    # drop remaining tags
    s = re.sub(r"(?is)<[^>]+>", "", s)

    s = unescape(s)
    s = s.replace("\r\n", "\n").replace("\r", "\n")

    lines = [normalize_space(line) for line in s.split("\n")]
    lines = [line for line in lines if line]

    return "\n".join(lines)


def html_to_lines(html: str) -> List[str]:
    text = strip_tags_keep_newlines(html)
    return [line.strip() for line in text.split("\n") if line.strip()]


def clean_html_text(fragment: str) -> str:
    s = re.sub(r"(?is)<[^>]+>", " ", fragment)
    s = unescape(s)
    s = normalize_space(s)
    return s


def extract_h1(html: str) -> str:
    m = re.search(r"(?is)<h1[^>]*>(.*?)</h1>", html)
    if not m:
        return ""
    return clean_html_text(m.group(1))


def extract_anchor_pairs(html: str) -> List[Tuple[str, str]]:
    pairs: List[Tuple[str, str]] = []
    for m in re.finditer(r'(?is)<a\b[^>]*href="([^"]+)"[^>]*>(.*?)</a>', html):
        href = unescape(m.group(1)).strip()
        label = clean_html_text(m.group(2))
        if href and label:
            pairs.append((href, label))
    return pairs


def dedupe_preserve_order(items: List[str]) -> List[str]:
    seen: Set[str] = set()
    out: List[str] = []
    for x in items:
        if x in seen:
            continue
        seen.add(x)
        out.append(x)
    return out


def find_all_institution_urls(index_html: str) -> List[str]:
    urls: List[str] = []
    for href, _label in extract_anchor_pairs(index_html):
        if "/institutions/institution/" in href:
            urls.append(urljoin(BASE_URL, href))
    return dedupe_preserve_order(urls)


def find_course_urls(institution_html: str) -> List[str]:
    urls: List[str] = []
    for href, _label in extract_anchor_pairs(institution_html):
        if "/courses/course/" in href:
            urls.append(urljoin(BASE_URL, href))
    return dedupe_preserve_order(urls)


def text_after_h1_top_anchors(course_html: str) -> Tuple[str, str]:
    """
    Try to get institution / faculty from the header zone after <h1>.
    This is heuristic but works well with DreamApply-style pages.
    """
    h1_match = re.search(r"(?is)<h1[^>]*>.*?</h1>", course_html)
    if not h1_match:
        return "", ""

    tail = course_html[h1_match.end():]
    # limit to the top info block
    end_markers = [
        "How to apply",
        "Entry qualification",
        "Language requirements",
        "Overview",
    ]
    cut = len(tail)
    for marker in end_markers:
        m = re.search(re.escape(marker), tail, flags=re.I)
        if m:
            cut = min(cut, m.start())
    head_zone = tail[:cut]

    anchors = extract_anchor_pairs(head_zone)

    institution = ""
    faculty = ""

    generic_labels = {
        "how to apply",
        "find programmes",
        "browse institutions",
        "sign in / register",
        "study in hungary website",
        "contact us",
        "stipendium hungaricum scholarship programme",
        "report accessibility issue",
        "skip to content",
    }

    filtered: List[Tuple[str, str]] = []
    for href, label in anchors:
        low = label.strip().lower()
        if not low or low in generic_labels:
            continue
        if label.lower().startswith("image:"):
            continue
        filtered.append((href, label))

    for href, label in filtered:
        href_low = href.lower()
        if not institution and (
            "studyinhungary.hu" in href_low
            or "/institution/" in href_low
            or "institution" in href_low
        ):
            institution = label
            continue

        if institution and not faculty:
            if label != institution:
                faculty = label
                break

    if not institution and filtered:
        institution = filtered[0][1]
        if len(filtered) >= 2 and filtered[1][1] != institution:
            faculty = filtered[1][1]

    return institution, faculty


def first_line_starting(lines: List[str], prefix: str) -> str:
    p = prefix.lower().strip()
    for line in lines:
        if line.lower().startswith(p):
            return line
    return ""


def value_after_colon(line: str) -> str:
    if ":" not in line:
        return ""
    return line.split(":", 1)[1].strip()


def find_line_index(lines: List[str], target: str) -> int:
    t = target.lower().strip()
    for i, line in enumerate(lines):
        if line.lower().strip() == t:
            return i
    return -1


def collect_section(lines: List[str], start_heading: str, stop_headings: List[str]) -> List[str]:
    start = find_line_index(lines, start_heading)
    if start == -1:
        return []

    out: List[str] = []
    stop_set = {h.lower().strip() for h in stop_headings}

    for i in range(start + 1, len(lines)):
        low = lines[i].lower().strip()
        if low in stop_set:
            break
        out.append(lines[i])

    return out


def extract_language_requirement(lines: List[str]) -> str:
    section = collect_section(
        lines,
        "Language requirements",
        [
            "Other requirements",
            "More information",
            "Overview",
            "Programme structure",
            "Program structure",
            "Not available for applying at the moment",
        ],
    )
    if not section:
        return ""

    # Prefer the block around "English"
    idx = -1
    for i, line in enumerate(section):
        if line.strip().lower() == "english":
            idx = i
            break

    if idx == -1:
        return " / ".join(section[:8]).strip()

    english_block: List[str] = []
    for i in range(idx + 1, len(section)):
        low = section[i].strip().lower()
        if low in {"hungarian", "german", "french"}:
            break
        english_block.append(section[i])

    english_block = [x for x in english_block if x]
    return " / ".join(english_block).strip()


def extract_overview_field(lines: List[str], label: str) -> str:
    full = first_line_starting(lines, f"{label}:")
    if full:
        return value_after_colon(full)

    # fallback: exact label followed by the value on next line
    idx = find_line_index(lines, label)
    if idx != -1 and idx + 1 < len(lines):
        return lines[idx + 1].strip()

    return ""


def extract_multiline_field(lines: List[str], label: str, next_labels: List[str]) -> str:
    idx = -1
    target = label.lower().strip()

    for i, line in enumerate(lines):
        if line.lower().strip() == target or line.lower().startswith(target + ":"):
            idx = i
            break

    if idx == -1:
        return ""

    first_line = lines[idx]
    buf: List[str] = []

    if ":" in first_line:
        after = value_after_colon(first_line)
        if after:
            buf.append(after)

    stop = {x.lower().strip() for x in next_labels}

    for j in range(idx + 1, len(lines)):
        low = lines[j].lower().strip()
        if low in stop or any(low.startswith(s + ":") for s in stop):
            break
        buf.append(lines[j])

    buf = [x for x in buf if x]
    return " ".join(buf).strip()


def parse_course_page(course_url: str, html: str) -> Dict[str, Any]:
    lines = html_to_lines(html)

    programme_name = extract_h1(html)
    institution_name, faculty_name = text_after_h1_top_anchors(html)

    location = extract_overview_field(lines, "Study location")
    course_type = extract_overview_field(lines, "Type")
    study_language = extract_overview_field(lines, "Study language")
    degree_award = extract_overview_field(lines, "Awards")
    course_code = extract_overview_field(lines, "Course code")
    entry_qualification = extract_overview_field(lines, "Entry qualification")

    language_requirement = extract_language_requirement(lines)

    overview_entry_requirements = extract_multiline_field(
        lines,
        "Entry requirements",
        [
            "Entrance exam",
            "Type of entrance exam",
            "Entrance exam location",
            "Entrance exam description",
            "Contact",
            "Preparatory year available",
            "Specialisation year available",
            "Programme structure",
            "Program structure",
        ],
    )

    entrance_exam = extract_multiline_field(
        lines,
        "Entrance exam",
        [
            "Type of entrance exam",
            "Entrance exam location",
            "Entrance exam description",
            "Contact",
            "Preparatory year available",
            "Specialisation year available",
            "Programme structure",
            "Program structure",
        ],
    )

    entrance_exam_type = extract_multiline_field(
        lines,
        "Type of entrance exam",
        [
            "Entrance exam location",
            "Entrance exam description",
            "Contact",
            "Preparatory year available",
            "Specialisation year available",
            "Programme structure",
            "Program structure",
        ],
    )

    entrance_exam_location = extract_multiline_field(
        lines,
        "Entrance exam location",
        [
            "Entrance exam description",
            "Contact",
            "Preparatory year available",
            "Specialisation year available",
            "Programme structure",
            "Program structure",
        ],
    )

    entrance_exam_description = extract_multiline_field(
        lines,
        "Entrance exam description",
        [
            "Contact",
            "Preparatory year available",
            "Specialisation year available",
            "Programme structure",
            "Program structure",
            "Not available for applying at the moment",
        ],
    )

    other_requirements = collect_section(
        lines,
        "Other requirements",
        [
            "More information",
            "Overview",
            "Programme structure",
            "Program structure",
            "Not available for applying at the moment",
        ],
    )

    return {
        "institution": institution_name,
        "faculty": faculty_name,
        "programme": programme_name,
        "course_url": course_url,
        "study_location": location,
        "course_type": course_type,
        "study_language": study_language,
        "degree_award": degree_award,
        "course_code": course_code,
        "entry_qualification": entry_qualification,
        "english_requirement": language_requirement,
        "entry_requirements": overview_entry_requirements,
        "entrance_exam": entrance_exam,
        "entrance_exam_type": entrance_exam_type,
        "entrance_exam_location": entrance_exam_location,
        "entrance_exam_description": entrance_exam_description,
        "other_requirements": other_requirements,
    }


def build_grouped_payload(programmes: List[Dict[str, Any]]) -> Dict[str, Any]:
    grouped: Dict[str, List[Dict[str, Any]]] = defaultdict(list)

    for item in programmes:
        key = item.get("institution") or "Unknown institution"
        grouped[key].append(item)

    universities: List[Dict[str, Any]] = []
    for institution in sorted(grouped.keys(), key=lambda x: x.lower()):
        rows = grouped[institution]
        rows.sort(key=lambda x: ((x.get("faculty") or "").lower(), (x.get("programme") or "").lower()))

        faculties = sorted(
            {r.get("faculty", "").strip() for r in rows if r.get("faculty", "").strip()},
            key=lambda x: x.lower(),
        )

        universities.append(
            {
                "institution": institution,
                "faculty_count": len(faculties),
                "programme_count": len(rows),
                "faculties": faculties,
                "programmes": rows,
            }
        )

    return {
        "source": "apply.stipendiumhungaricum.hu",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "university_count": len(universities),
        "programme_count": sum(u["programme_count"] for u in universities),
        "universities": universities,
    }


def collect_sh_admissions(output_path: str) -> None:
    institution_index_html = fetch_html(INSTITUTIONS_URL)
    institution_urls = find_all_institution_urls(institution_index_html)

    if not institution_urls:
        raise RuntimeError("Institution URLs could not be extracted from the institutions page.")

    all_course_urls: List[str] = []
    institution_cache: Dict[str, str] = {}

    for idx, institution_url in enumerate(institution_urls, start=1):
        html = fetch_html(institution_url)
        institution_cache[institution_url] = html
        course_urls = find_course_urls(html)
        all_course_urls.extend(course_urls)

        print(f"[institutions] {idx}/{len(institution_urls)} -> {institution_url} -> {len(course_urls)} courses")
        time.sleep(SLEEP_BETWEEN_REQUESTS)

    all_course_urls = dedupe_preserve_order(all_course_urls)
    if not all_course_urls:
        raise RuntimeError("No course URLs were found on institution pages.")

    programmes: List[Dict[str, Any]] = []

    for idx, course_url in enumerate(all_course_urls, start=1):
        try:
            html = fetch_html(course_url)
            parsed = parse_course_page(course_url, html)

            # keep English-taught only (user requested 英語プログラム)
            study_language_low = (parsed.get("study_language") or "").strip().lower()
            lang_req_low = (parsed.get("english_requirement") or "").strip().lower()

            keep = False
            if "english" in study_language_low:
                keep = True
            elif lang_req_low:
                keep = True

            if keep:
                programmes.append(parsed)

            print(f"[courses] {idx}/{len(all_course_urls)} -> OK -> {course_url}")
        except Exception as e:
            print(f"[courses] {idx}/{len(all_course_urls)} -> ERROR -> {course_url} -> {e}")

        time.sleep(SLEEP_BETWEEN_REQUESTS)

    payload = build_grouped_payload(programmes)
    Path(output_path).write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote: {output_path}")
    print(
        f"Universities: {payload['university_count']} / "
        f"Programmes: {payload['programme_count']}"
    )


if __name__ == "__main__":
    out_path = sys.argv[1] if len(sys.argv) > 1 else "sh_admissions.json"
    collect_sh_admissions(out_path)