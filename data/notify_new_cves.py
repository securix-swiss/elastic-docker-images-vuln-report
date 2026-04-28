import argparse
import json
import os
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple
from urllib.parse import urljoin

import requests


DEFAULT_CONFIG_PATH = "data/scan_config.json"
DEFAULT_DEPLOYED_BASE_URL = "https://securix-swiss.github.io/elastic-docker-images-vuln-report/json/"

INTERESTING_SEVERITIES = {"CRITICAL"}
REPORT_BASE_URL = "https://securix-swiss.github.io/elastic-docker-images-vuln-report"


def load_products(config_path: str) -> List[str]:
    with open(config_path, "r", encoding="utf-8") as handle:
        config = json.load(handle)

    products = config.get("products", [])
    if not isinstance(products, list):
        return []

    return [product for product in products if isinstance(product, str) and product]


def extract_cves(payload: Dict[str, Any]) -> Set[str]:
    cve_data = payload.get("cveData", {})
    if not isinstance(cve_data, dict):
        return set()
    return set(cve_data.keys())

def extract_cve_data(payload: Dict[str, Any]) -> Dict[str, Dict[str, Any]]:
    cve_data = payload.get("cveData", {})
    if not isinstance(cve_data, dict):
        return {}
    # Best-effort: ensure each value is a dict.
    return {k: v for k, v in cve_data.items() if isinstance(k, str) and isinstance(v, dict)}


def load_local_cves(file_path: Path) -> Set[str]:
    with file_path.open("r", encoding="utf-8") as handle:
        payload = json.load(handle)
    return extract_cves(payload)

def load_local_payload(file_path: Path) -> Dict[str, Any]:
    with file_path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def deployed_file_url(base_url: str, file_name: str) -> str:
    return urljoin(base_url if base_url.endswith("/") else base_url + "/", file_name)


def fetch_remote_payload(file_url: str) -> Dict[str, Any]:
    response = requests.get(file_url, timeout=20)
    if response.status_code == 404:
        return {}

    response.raise_for_status()
    payload = response.json()
    if not isinstance(payload, dict):
        return {}
    return payload


def normalize_severity(value: object) -> str:
    if not isinstance(value, str):
        return ""
    return value.strip().upper()


def best_cvss(entry: Dict[str, Any]) -> Tuple[Optional[float], Optional[str]]:
    cvss = entry.get("CVSS")
    if not isinstance(cvss, dict):
        return None, None

    best_score: Optional[float] = None
    best_vector: Optional[str] = None
    for source_data in cvss.values():
        if not isinstance(source_data, dict):
            continue
        score = source_data.get("V3Score")
        vector = source_data.get("V3Vector")
        if isinstance(score, (int, float)):
            if best_score is None or float(score) > best_score:
                best_score = float(score)
                best_vector = vector if isinstance(vector, str) and vector else None

    return best_score, best_vector


def format_versions(versions: List[str], max_show: int = 3) -> str:
    if not versions:
        return "—"
    if len(versions) <= max_show:
        return ", ".join(versions)
    shown = ", ".join(versions[:max_show])
    return f"{shown} (+{len(versions) - max_show})"


def product_from_file_name(file_name: str) -> str:
    return Path(file_name).stem


def severity_label_and_color(severity: str) -> Tuple[str, str]:
    if severity == "CRITICAL":
        return "CRITICAL", "attention"
    if severity == "HIGH":
        return "HIGH", "warning"
    return severity or "UNKNOWN", "default"


def build_cve_card_item(
    e: Dict[str, Any],
    product: str,
) -> Dict[str, Any]:
    """Build an Adaptive Card Container for a single CVE entry."""
    cve_id = str(e.get("VulnerabilityID") or e.get("cve") or "UNKNOWN_CVE")
    severity = normalize_severity(e.get("Severity"))
    sev_label, sev_color = severity_label_and_color(severity)
    title_text = str(e.get("Title") or "No description available")
    
    affected_versions_raw = e.get("affected_versions")
    affected_versions = affected_versions_raw if isinstance(affected_versions_raw, list) else []
    affected_versions_str = format_versions(
        [str(v) for v in affected_versions if isinstance(v, (str, int, float))]
    )
    
    score, _vector = best_cvss(e)
    cvss_str = f"{score:.1f}" if score is not None else "N/A"
    
    report_url = f"{REPORT_BASE_URL}/{product}/cve/{cve_id}/"

    return {
        "type": "Container",
        "style": "emphasis",
        "bleed": True,
        "spacing": "medium",
        "items": [
            {
                "type": "ColumnSet",
                "columns": [
                    {
                        "type": "Column",
                        "width": "auto",
                        "items": [
                            {
                                "type": "TextBlock",
                                "text": sev_label,
                                "color": sev_color,
                                "weight": "bolder",
                                "size": "small",
                            }
                        ],
                        "verticalContentAlignment": "center",
                    },
                    {
                        "type": "Column",
                        "width": "stretch",
                        "items": [
                            {
                                "type": "TextBlock",
                                "text": cve_id,
                                "weight": "bolder",
                                "size": "medium",
                            }
                        ],
                        "verticalContentAlignment": "center",
                    },
                    {
                        "type": "Column",
                        "width": "auto",
                        "items": [
                            {
                                "type": "TextBlock",
                                "text": f"CVSS {cvss_str}",
                                "size": "small",
                                "isSubtle": True,
                            }
                        ],
                        "verticalContentAlignment": "center",
                    },
                ],
            },
            {
                "type": "TextBlock",
                "text": title_text,
                "wrap": True,
                "spacing": "small",
            },
            {
                "type": "ColumnSet",
                "spacing": "small",
                "columns": [
                    {
                        "type": "Column",
                        "width": "stretch",
                        "items": [
                            {
                                "type": "TextBlock",
                                "text": f"Affected: {affected_versions_str}",
                                "size": "small",
                                "isSubtle": True,
                                "wrap": True,
                            }
                        ],
                    },
                    {
                        "type": "Column",
                        "width": "auto",
                        "items": [
                            {
                                "type": "TextBlock",
                                "text": f"[View Report]({report_url})",
                                "size": "small",
                                "color": "accent",
                            }
                        ],
                    },
                ],
            },
        ],
    }


def build_teams_card(
    new_cves_by_file: Dict[str, List[Dict[str, Any]]],
) -> Dict[str, Any]:
    total = sum(len(v) for v in new_cves_by_file.values())
    product_count = len(new_cves_by_file)

    body: List[Dict[str, Any]] = [
        {
            "type": "Container",
            "style": "accent",
            "bleed": True,
            "items": [
                {
                    "type": "TextBlock",
                    "text": f"🔒 {total} New CRITICAL CVE{'s' if total != 1 else ''}",
                    "weight": "bolder",
                    "size": "large",
                    "wrap": True,
                    "color": "dark",
                },
                {
                    "type": "TextBlock",
                    "text": f"Across {product_count} product{'s' if product_count != 1 else ''}",
                    "size": "small",
                    "spacing": "none",
                    "color": "dark",
                },
            ],
        }
    ]

    for file_name in sorted(new_cves_by_file.keys()):
        entries = new_cves_by_file[file_name]
        product = product_from_file_name(file_name)

        body.append(
            {
                "type": "TextBlock",
                "text": f"📦 {product.upper()}",
                "weight": "bolder",
                "size": "medium",
                "spacing": "large",
                "wrap": True,
            }
        )
        body.append(
            {
                "type": "TextBlock",
                "text": f"{len(entries)} new vulnerabilit{'ies' if len(entries) != 1 else 'y'}",
                "size": "small",
                "isSubtle": True,
                "spacing": "none",
            }
        )

        for e in entries:
            body.append(build_cve_card_item(e, product))

    return {
        "type": "message",
        "attachments": [
            {
                "contentType": "application/vnd.microsoft.card.adaptive",
                "content": {
                    "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
                    "type": "AdaptiveCard",
                    "version": "1.4",
                    "body": body,
                },
            }
        ],
    }


def post_to_teams(webhook_url: str, payload: Dict[str, Any]) -> None:
    response = requests.post(webhook_url, json=payload, timeout=20)
    response.raise_for_status()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Compare locally generated CVE JSON files with deployed JSON files and alert "
            "via MS Teams when new CVEs are found."
        )
    )
    parser.add_argument(
        "--config",
        default=DEFAULT_CONFIG_PATH,
        help="Path to shared scan config JSON file (uses its products list).",
    )
    parser.add_argument(
        "--results-dir",
        default="data/results",
        help="Directory containing local JSON result files.",
    )
    parser.add_argument(
        "--deployed-base-url",
        default=DEFAULT_DEPLOYED_BASE_URL,
        help=(
            "Base URL for deployed JSON files (for example .../json/). "
            "Each product is resolved as <base>/<product>.json."
        ),
    )
    parser.add_argument(
        "--webhook-url",
        default=os.getenv("MS_TEAMS_WEBHOOK_URL", ""),
        help="MS Teams incoming webhook URL (defaults to MS_TEAMS_WEBHOOK_URL env var).",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    products = load_products(args.config)
    if not products:
        print(f"No products found in config: {args.config}")
        return 1

    results_dir = Path(args.results_dir)
    if not results_dir.exists() or not results_dir.is_dir():
        print(f"Results directory not found: {results_dir}")
        return 1

    new_cves_by_file: Dict[str, List[Dict[str, Any]]] = {}

    for product in products:
        local_file = results_dir / f"{product}.json"
        if not local_file.exists():
            print(f"Skipping missing local result file: {local_file}")
            continue

        local_payload = load_local_payload(local_file)
        local_cve_data = extract_cve_data(local_payload)
        local_cves = set(local_cve_data.keys())
        remote_url = deployed_file_url(args.deployed_base_url, local_file.name)
        remote_payload = fetch_remote_payload(remote_url)
        remote_cves = extract_cves(remote_payload)

        new_cves = sorted(local_cves - remote_cves)
        if not new_cves:
            continue

        interesting_entries: List[Dict[str, Any]] = []
        for cve_id in new_cves:
            entry = local_cve_data.get(cve_id)
            if not entry:
                continue
            if normalize_severity(entry.get("Severity")) not in INTERESTING_SEVERITIES:
                continue
            interesting_entries.append(entry)

        if interesting_entries:
            # Stable ordering: severity (CRITICAL first), then CVSS desc, then ID.
            def sort_key(e: Dict[str, Any]) -> Tuple[int, float, str]:
                sev = normalize_severity(e.get("Severity"))
                sev_rank = 0 if sev == "CRITICAL" else 1
                score, _vector = best_cvss(e)
                score_key = -(score if score is not None else -1.0)
                cve = str(e.get("VulnerabilityID") or "")
                return (sev_rank, score_key, cve)

            interesting_entries.sort(key=sort_key)
            new_cves_by_file[local_file.name] = interesting_entries

    if not new_cves_by_file:
        print("No new CRITICAL CVEs found compared to deployed JSON files.")
        return 0

    teams_payload = build_teams_card(new_cves_by_file)
    print(json.dumps(teams_payload, indent=2))

    if not args.webhook_url:
        print("MS Teams webhook URL is not set (use --webhook-url or MS_TEAMS_WEBHOOK_URL).")
        return 1

    post_to_teams(args.webhook_url, teams_payload)
    print("MS Teams alert sent.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
