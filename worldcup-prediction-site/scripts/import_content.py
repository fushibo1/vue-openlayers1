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


def section_by_keyword(text, keyword):
    pattern = rf"^##\s*[^\n]*{re.escape(keyword)}[^\n]*\n(.*?)(?=^##\s+|\Z)"
    match = re.search(pattern, text, flags=re.S | re.M)
    return match.group(1).strip() if match else ""


def clean_markdown(text):
    lines = text.replace("\r\n", "\n").split("\n")
    blocked_heading_keywords = [
        "四轴评分",
        "综合评分",
        "RiskFlag",
        "资料来源",
    ]
    cleaned = []
    skipping_section = False
    skipping_rules = False

    for line in lines:
        stripped = line.strip()
        is_heading = stripped.startswith("## ")

        if is_heading:
            skipping_section = any(keyword in stripped for keyword in blocked_heading_keywords)
            skipping_rules = False
            if skipping_section:
                continue

        if skipping_section:
            continue

        if stripped == "规则触发：":
            skipping_rules = True
            continue

        if skipping_rules:
            if stripped.startswith("- ") or stripped == "":
                continue
            skipping_rules = False

        cleaned.append(line)

    result = "\n".join(cleaned)
    result = re.sub(r"\n{3,}", "\n\n", result).strip()
    return result + "\n"


def strip_ticks(value):
    return value.strip().strip("`").strip()


def load_results(project_root):
    results_path = project_root / "data" / "results.json"
    if not results_path.exists():
        return {}
    return json.loads(results_path.read_text(encoding="utf-8"))


def load_overrides(project_root):
    overrides_path = project_root / "data" / "content_overrides.json"
    if not overrides_path.exists():
        return {}
    return json.loads(overrides_path.read_text(encoding="utf-8"))


def apply_text_overrides(text, override):
    for item in override.get("removeText", []):
        text = text.replace(item, "")
    if override.get("asianLine"):
        text = re.sub(
            r"(\|\s*亚盘观点\s*\|\s*)[^|]+?(\s*\|)",
            rf"\g<1>{override['asianLine']}\g<2>",
            text,
        )
    text = re.sub(r"\n{3,}", "\n\n", text).strip()
    return text + "\n"


def split_handicap(handicap):
    sign = -1 if handicap < 0 else 1
    absolute = abs(handicap)
    base = int(absolute)
    fraction = round(absolute - base, 2)
    if fraction == 0.25:
        return [sign * base, sign * (base + 0.5)]
    if fraction == 0.75:
        return [sign * (base + 0.5), sign * (base + 1)]
    return [handicap]


def settle_handicap(margin, handicap):
    outcomes = []
    for line in split_handicap(handicap):
        adjusted = margin + line
        if adjusted > 0:
            outcomes.append("win")
        elif adjusted < 0:
            outcomes.append("loss")
        else:
            outcomes.append("push")

    wins = outcomes.count("win")
    losses = outcomes.count("loss")
    pushes = outcomes.count("push")

    if wins and not losses and not pushes:
        return "win", "正确"
    if losses and not wins and not pushes:
        return "loss", "错误"
    if pushes and not wins and not losses:
        return "push", "走水"
    if wins and pushes:
        return "win", "半赢"
    if losses and pushes:
        return "loss", "半输"
    return "push", "走水"


def parse_asian_pick(asian_line, teams):
    if not asian_line:
        return None

    clauses = re.split(r"[；;]", asian_line)
    last_team = ""
    team_pattern = "|".join(re.escape(team) for team in sorted(teams, key=len, reverse=True))
    if not team_pattern:
        return None

    for clause in clauses:
        text = clause.strip()
        team_match = re.search(team_pattern, text)
        if team_match:
            last_team = team_match.group(0)
        if not last_team:
            continue

        line_match = re.search(r"([+\-]?\d+(?:\.\d+)?)", text)
        if line_match:
            return {
                "team": last_team,
                "handicap": float(line_match.group(1)),
                "text": text,
            }
    return None


def attach_result(match, result_record):
    status = (result_record or {}).get("status", "not_started")
    result = {
        "status": "completed" if status == "completed" else "not_started",
        "statusLabel": "已完赛" if status == "completed" else "未开始",
    }

    pick = parse_asian_pick(match.get("asianLine", ""), match.get("teams", []))
    if pick:
        result["asianPick"] = {
            "team": pick["team"],
            "handicap": f"{pick['handicap']:+g}" if pick["handicap"] else "0",
            "text": pick["text"],
        }

    if status != "completed":
        result["settlement"] = {
            "outcome": "pending",
            "label": "未开始",
        }
        return result

    home_score = int(result_record.get("homeScore", 0))
    away_score = int(result_record.get("awayScore", 0))
    result.update(
        {
            "homeScore": home_score,
            "awayScore": away_score,
            "scoreText": f"{home_score}-{away_score}",
            "source": result_record.get("source", ""),
        }
    )

    if not pick:
        result["settlement"] = {
            "outcome": "ungraded",
            "label": "未结算",
        }
        return result

    teams = match.get("teams", [])
    if pick["team"] == teams[0]:
        margin = home_score - away_score
    elif len(teams) > 1 and pick["team"] == teams[1]:
        margin = away_score - home_score
    else:
        margin = 0

    outcome, label = settle_handicap(margin, pick["handicap"])
    result["settlement"] = {
        "outcome": outcome,
        "label": label,
        "isCorrect": outcome == "win" if outcome in ("win", "loss") else None,
    }
    return result


def accuracy_stats(matches):
    completed = [match for match in matches if match.get("result", {}).get("status") == "completed"]
    wins = [
        match for match in completed
        if match.get("result", {}).get("settlement", {}).get("outcome") == "win"
    ]
    losses = [
        match for match in completed
        if match.get("result", {}).get("settlement", {}).get("outcome") == "loss"
    ]
    pushes = [
        match for match in completed
        if match.get("result", {}).get("settlement", {}).get("outcome") == "push"
    ]
    graded = len(wins) + len(losses)
    accuracy = round(len(wins) / graded * 100, 1) if graded else None
    return {
        "total": len(matches),
        "completed": len(completed),
        "pending": len(matches) - len(completed),
        "graded": graded,
        "correct": len(wins),
        "wrong": len(losses),
        "push": len(pushes),
        "accuracy": accuracy,
    }


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


def parse_match(path, round_name, index_row, override=None):
    text = path.read_text(encoding="utf-8")
    override = override or {}
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
    text = apply_text_overrides(text, override)
    display_text = clean_markdown(text)
    direction = conclusion_value(text, "90分钟方向") or (index_row or {}).get("direction", "")
    asian_line = override.get("asianLine") or conclusion_value(text, "亚盘观点") or (index_row or {}).get("asianLine", "")

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
        "summary": section_by_keyword(text, "分析总结") or section(text, "八、分析总结", "九").strip(),
        "fileName": path.name,
        "rawMarkdown": display_text,
    }


def main():
    project_root = Path(__file__).resolve().parents[1]
    source_root = Path.home() / "Desktop" / SOURCE_RELATIVE
    output_path = project_root / "data" / "content.js"
    result_records = load_results(project_root)
    content_overrides = load_overrides(project_root)

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
            match_id = f"match-{int(path.name.split('_', 1)[0]):02d}" if path.name[:2].isdigit() else ""
            match = parse_match(path, round_dir.name, index_rows.get(path.name), content_overrides.get(match_id))
            match["result"] = attach_result(match, result_records.get(match["id"], {}))
            matches.append(match)
            round_match_ids.append(match["id"])

        round_matches = [match for match in matches if match["id"] in round_match_ids]
        rounds.append(
            {
                "id": f"round-{len(rounds) + 1}",
                "name": round_dir.name,
                "title": title,
                "description": description,
                "matches": round_match_ids,
                "stats": accuracy_stats(round_matches),
            }
        )

    team_map = {}
    for match in matches:
        for team in match["teams"]:
            item = team_map.setdefault(
                team,
                {
                    "name": team,
                    "matches": [],
                    "groups": [],
                    "directions": {},
                    "scorePredictions": [],
                },
            )
            item["matches"].append(match["id"])
            if match["group"] not in item["groups"]:
                item["groups"].append(match["group"])
            direction = match.get("direction") or "未提取"
            item["directions"][direction] = item["directions"].get(direction, 0) + 1
            if match.get("scorePrediction"):
                item["scorePredictions"].append(match["scorePrediction"])

    for item in team_map.values():
        item["stats"] = {
            "total": len(item["matches"]),
            "primaryDirection": max(item["directions"].items(), key=lambda pair: pair[1])[0],
            "scoreSamples": item["scorePredictions"][:3],
            "accuracy": accuracy_stats([match for match in matches if match["id"] in item["matches"]]),
        }

    data = {
        "generatedAt": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "sourceRoot": str(source_root),
        "stats": accuracy_stats(matches),
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
