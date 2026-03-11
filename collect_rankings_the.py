import json
import re
import urllib.request
from datetime import datetime

universities = {
    "Budapest University of Technology and Economics":
    "https://www.timeshighereducation.com/world-university-rankings/budapest-university-technology-and-economics",

    "Eötvös Loránd University":
    "https://www.timeshighereducation.com/world-university-rankings/eotvos-lorand-university",

    "University of Debrecen":
    "https://www.timeshighereducation.com/world-university-rankings/university-debrecen",

    "University of Szeged":
    "https://www.timeshighereducation.com/world-university-rankings/university-szeged",

    "Semmelweis University":
    "https://www.timeshighereducation.com/world-university-rankings/semmelweis-university"
}

def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req) as res:
        return res.read().decode("utf-8")

results = []

for name, url in universities.items():

    try:
        html = fetch(url)

        match = re.search(r'"rank":"([^"]+)"', html)

        rank = match.group(1) if match else "N/A"

        results.append({
            "university": name,
            "rank": rank,
            "url": url
        })

    except:
        results.append({
            "university": name,
            "rank": "N/A",
            "url": url
        })

output = {
    "source": "Times Higher Education",
    "updated": datetime.utcnow().isoformat(),
    "universities": results
}

with open("rankings.json", "w", encoding="utf-8") as f:
    json.dump(output, f, ensure_ascii=False, indent=2)

print("rankings.json generated")