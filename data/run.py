import subprocess
import requests
import logging
import json
import os
import datetime
import semantic_version

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
TEMP_DIR='results/'

def download_trivy_db(trivy_executable='trivy'):
    logging.info(f"Downloading Trivy DB")
    try:
        # Run the trivy db command to download the database
        subprocess.run([
            trivy_executable,
            'image',
            '--download-db-only',
        ], check=True)
    except subprocess.CalledProcessError as e:
        print(f"Failed to download Trivy database: {e}")

    logging.info(f"Downloading Trivy Java DB")
    try:
        # Run the trivy db command to download the database
        subprocess.run([
            trivy_executable,
            'image',
            '--download-java-db-only'
        ], check=True)
    except subprocess.CalledProcessError as e:
        print(f"Failed to download Trivy database: {e}")

def run_trivy_scan(target, trivy_executable='trivy'):
    try:
        logging.info(f"Starting Trivy scan for image '{target}'.")
        result = subprocess.run(
            [
                trivy_executable,
                'image',
                '--skip-db-update',
                '--skip-java-db-update',
                '--scanners', 'vuln',
                '--format', 'json',
                target
            ],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            check=True
        )

        json_result = json.loads(result.stdout)
        logging.info(f"Trivy scan completed for image '{target}'.")

        return json_result
    except subprocess.CalledProcessError as e:
        logging.error(f"Trivy scan failed for image '{target}'. Error: {e.stderr}")
        return None

def get_releases(repo, enable_rc=False):
    url = f"https://api.github.com/repos/{repo}/releases"
    releases = []
    page = 1

    logging.info(f"Fetching releases for repo '{repo}'.")

    try:
        while True:
            # Fetch releases with pagination (100 per page)
            response = requests.get(url, params={'per_page': 100, 'page': page})
            response.raise_for_status()  # Raise an error if the request failed

            current_page_releases = response.json()

            # Break if no more releases are returned
            if not current_page_releases:
                logging.info(f"No more releases found for '{repo}'.")
                break

            # Remove leading 'v' from version tags
            current_page_releases = [
                release['tag_name'].lstrip('v') for release in current_page_releases
            ]

            # Optionally filter out 'rc', 'alpha', and 'beta' releases
            if not enable_rc:
                current_page_releases = [
                    release for release in current_page_releases
                    if 'rc' not in release.lower() and
                    'alpha' not in release.lower() and
                    'beta' not in release.lower()
                ]

            releases.extend(current_page_releases)
            logging.info(f"Page {page} processed for repo '{repo}'.")

            page += 1  # Move to the next page

        logging.info(f"Total releases fetched for repo '{repo}': {len(releases)}.")
        return releases

    except requests.RequestException as e:
        logging.error(f"Error fetching releases for repo '{repo}'. Error: {e}")
        return None

def mkdir_p(path):
    try:
        os.makedirs(path)
    except FileExistsError:
        pass

def main():
    products = [
        'kibana',
        'elasticsearch'
    ]

    major_versions = [
        8
    ]

    all_vulns = {}
    mkdir_p(TEMP_DIR)
    download_trivy_db(trivy_executable=os.getenv('TRIVY_CMD', 'trivy'))
    for product in products:
        repo = f"elastic/{product}"
        logging.info(f"Processing repository '{repo}'.")
        all_releases = get_releases(repo)
        releases = []
        failed_releases = []

        if not all_releases:
            logging.warning(f"No releases found for repo '{repo}'.")
            continue

        for release in all_releases:
            image_name = f"docker.elastic.co/{product}/{product}:{release}"
            try:
                s_version = semantic_version.Version(release)
            except ValueError:
                s_version = 0

            if s_version.major not in major_versions:
                logging.info(f"Skipping {image_name}")
                continue

            releases.append(release)

        for release in releases:
            logging.info(f"Working on {image_name}")
            image_name = f"docker.elastic.co/{product}/{product}:{release}"

            result = run_trivy_scan(image_name, trivy_executable=os.getenv('TRIVY_CMD', 'trivy'))
            if not result:
                failed_releases.append(release)
                continue

            for vuln_result in result.get('Results', []):
                for vuln in vuln_result.get('Vulnerabilities', []):
                    vuln_id = vuln.get('VulnerabilityID')

                    if not all_vulns.get(product):
                        all_vulns[product] = {
                            'cveData': {},
                            'name': product,
                            'dockerImage': image_name
                        }
                    if not all_vulns[product]['cveData'].get(vuln_id):
                        all_vulns[product]['cveData'][vuln_id] = vuln
                        all_vulns[product]['cveData'][vuln_id]['affected_versions'] = []
                        all_vulns[product]['cveData'][vuln_id]['not_affected_versions'] = []

                    if release not in all_vulns[product]['cveData'][vuln_id]['affected_versions']:
                        all_vulns[product]['cveData'][vuln_id]['affected_versions'].append(release)

        # 2nd loop to check version is not affected
        for release in releases:
            if release in failed_releases:
                continue

            for vuln_id in all_vulns[product]['cveData'].keys():
                if release not in all_vulns[product]['cveData'][vuln_id]['affected_versions']:
                    if release not in all_vulns[product]['cveData'][vuln_id]['not_affected_versions']:
                        all_vulns[product]['cveData'][vuln_id]['not_affected_versions'].append(release)

        for vuln_id in all_vulns[product]['cveData'].keys():
            all_vulns[product]['cveData'][vuln_id]['affected_versions'].sort(key=semantic_version.Version, reverse=True)
            all_vulns[product]['cveData'][vuln_id]['not_affected_versions'].sort(key=semantic_version.Version, reverse=True)

        all_vulns['date'] = datetime.datetime.now().isoformat()
        with open(f"{TEMP_DIR}/{product}.json", "w") as f:
            json.dump(all_vulns[product], f, indent=2)

if __name__ == "__main__":
    main()
