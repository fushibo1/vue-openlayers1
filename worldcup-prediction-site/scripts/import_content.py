import base64
import json
import re
from datetime import datetime
from pathlib import Path


SOURCE_RELATIVE = base64.b64decode(
    "5LiW55WM5p2vXDIwMjjkuJbnlYzmna9cMjAyNuS4lueVjOadr+S4k+mimOmihOa1iw=="
).decode("utf-8")


def first_match(text, pattern, default=""):
    match = re.search(pattern, text, flags=re.M)
    return match.group(1).strip() if match else default


def conclusion_value(text, name):
    return first_match(text, rf"^\|\s*{re.escape(name)}\s*\|\s*([^|]+?)\s*\|")


def section(text, heading, next_heading):
    pattern = rf"^##\s*{re.escape(heading)}\s*\n(.*?)(?=^##\s*{next_heading}|\Z)"
    match = re.search(pattern, text, flags=re.S | re.M)
    return match.group(1).strip() if match else ""


def strip_ticks(value):
    return value.strip().strip("`").strip()


def parse_index(index_path):
    text = index_path.read_text(encoding="utf-8")
    rows = {}
    title = first_match(text, r"^#\s*(.+)$", index_path.parent.name)
    description = first_match(text, r"^>\s*(.+?)(?:\n\n|\Z)")

    for line in text.splitlines():
        if not re.match(r"^\|\s*\d+\s*\|", line):
            continue
        cols = [col.strip() for col in line.split("|")[1:-1]]
        if len(cols) < 8:
            continue
        file_name = strip_ticks(cols[7])
        rows[file_name] = {
            "order": int(cols[0]),
            "group": cols[1],
            "match": cols[2],
            "venue": cols[3],
            "matchTime": cols[4],
            "direction": cols[5],
            "asianLine": cols[6],
            "fileName": file_name,
        }
    return title, description, rows


def parse_match(path, round_name, index_row):
    text = path.read_text(encoding="utf-8")
    stem = path.stem
    order = 0
    group = ""
    teams = []

    name_match = re.match(r"^(\d+)_([^_]+)_(.+)$", stem)
    if name_match:
        order = int(name_match.group(1))
        group = name_match.group(2)
        teams = [item.strip() for item in name_match.group(3).split("vs")]

    if index_row:
        order = index_row["order"]
        group = index_row["group"]
        teams = [item.strip() for item in re.split(r"\s+vs\s+", index_row["match"])]

    match_id = f"match-{order:02d}"
    direction = conclusion_value(text, "90分钟方向") or (index_row or {}).get("direction", "")
    asian_line = conclusion_value(text, "亚盘观点") or (index_row or {}).get("asianLine", "")

    return {
        "id": match_id,
        "order": order,
        "group": group,
        "round": round_name,
        "title": first_match(text, r"^#\s*(.+)$", " vs ".join(teams)),
        "teams": teams,
        "matchTime": first_match(text, r"-\s*比赛时间：([^；\n]+)", (index_row or {}).get("matchTime", "")),
        "stage": first_match(text, r"-\s*赛事阶段：([^\n]+)", f"{group} 第1轮"),
        "venue": first_match(text, r"-\s*比赛地：([^\n]+)", (index_row or {}).get("venue", "")),
        "direction": direction,
        "asianLine": asian_line,
        "totalGoals": conclusion_value(text, "大小球"),
        "scorePrediction": conclusion_value(text, "预计比分"),
        "confidence": conclusion_value(text, "置信度"),
        "modelScore": first_match(text, r"Score\s*=.*?=\s*([0-9]+(?:\.[0-9]+)?)"),
        "riskFlag": first_match(text, r"RiskFlag净分：\*\*([+\-]?\d+)\*\*"),
        "summary": section(text, "八、分析总结", "九").strip(),
        "fileName": path.name,
        "rawMarkdown": text,
    }


def main():
    project_root = Path(__file__).resolve().parents[1]
    source_root = Path.home() / "Desktop" / SOURCE_RELATIVE
    output_path = project_root / "data" / "content.js"

    matches = []
    rounds = []

    for round_dir in sorted([item for item in source_root.iterdir() if item.is_dir()]):
        index_files = sorted(round_dir.glob("00_*.md"))
        title = round_dir.name
        description = ""
        index_rows = {}
        if index_files:
            title, description, index_rows = parse_index(index_files[0])

        round_match_ids = []
        for path in sorted(round_dir.glob("*.md")):
            if path.name.startswith("00_"):
                continue
            match = parse_match(path, round_dir.name, index_rows.get(path.name))
            matches.append(match)
            round_match_ids.append(match["id"])

        rounds.append(
            {
                "id": f"round-{len(rounds) + 1}",
                "name": round_dir.name,
                "title": title,
                "description": description,
                "matches": round_match_ids,
            }
        )

    team_map = {}
    for match in matches:
        for team in match["teams"]:
            item = team_map.setdefault(team, {"name": team, "matches": [], "groups": []})
            item["matches"].append(match["id"])
            if match["group"] not in item["groups"]:
                item["groups"].append(match["group"])

    data = {
        "generatedAt": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "sourceRoot": str(source_root),
        "matches": matches,
        "rounds": rounds,
        "teams": sorted(team_map.values(), key=lambda item: item["name"]),
    }

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        "window.WORLD_CUP_DATA = "
        + json.dumps(data, ensure_ascii=False, separators=(",", ":"))
        + ";",
        encoding="utf-8",
    )
    print(f"Imported {len(matches)} matches, {len(rounds)} rounds, {len(data['teams'])} teams.")
    print(f"Output: {output_path}")


if __name__ == "__main__":
    main()
