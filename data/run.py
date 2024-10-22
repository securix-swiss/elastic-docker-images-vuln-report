import subprocess
import requests
import logging
import json
import os
import time
import random
import datetime
import semantic_version

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
TEMP_DIR='results/'

def download_trivy_db(trivy_executable='trivy'):
    download_trivy_db_vuln(trivy_executable)
    download_trivy_db_java(trivy_executable)

def download_trivy_db_vuln(trivy_executable='trivy', retry=50):
    logging.info(f"Downloading Trivy DB")
    count = 0
    while count < retry:
        try:
            # Run the trivy db command to download the database
            subprocess.run([
                trivy_executable,
                'image',
                '--download-db-only',
            ], check=True)
            count = retry
        except subprocess.CalledProcessError as e:
            print(f"Failed to download Trivy database: {e}")
            time.sleep(random.randint(10,20))

def download_trivy_db_java(trivy_executable='trivy', retry=50):
    logging.info(f"Downloading Trivy Java DB")
    count = 0
    while count < retry:
        try:
            # Run the trivy db command to download the database
            subprocess.run([
                trivy_executable,
                'image',
                '--download-java-db-only'
            ], check=True)
            count = retry
        except subprocess.CalledProcessError as e:
            print(f"Failed to download Trivy database: {e}")
            time.sleep(random.randint(10,20))

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
            for release in current_page_releases:
                add = True
                if not enable_rc:
                    for word in ['rc', 'alpha', 'beta']:
                        if word in release['tag_name'].lower():
                            add = False

                if add:
                    releases.append({
                        'version': release['tag_name'].lstrip('v'),
                        'published_at': release['published_at']
                    })

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
            image_name = f"docker.elastic.co/{product}/{product}:{release['version']}"
            try:
                s_version = semantic_version.Version(release['version'])
            except ValueError:
                s_version = 0

            if s_version.major not in major_versions:
                logging.info(f"Skipping {image_name}")
                continue

            releases.append(release)

        for release in releases:
            logging.info(f"Working on {image_name}")
            image_name = f"docker.elastic.co/{product}/{product}:{release['version']}"

            result = run_trivy_scan(image_name, trivy_executable=os.getenv('TRIVY_CMD', 'trivy'))
            if not result:
                failed_releases.append(release['version'])
                continue

            if not all_vulns.get(product):
                all_vulns[product] = {
                    'cveData': {},
                    'name': product,
                    'dockerImage': image_name,
                    'releases': releases
                }

            for vuln_result in result.get('Results', []):
                for vuln in vuln_result.get('Vulnerabilities', []):
                    vuln_id = vuln.get('VulnerabilityID')

                    if not all_vulns[product]['cveData'].get(vuln_id):
                        all_vulns[product]['cveData'][vuln_id] = vuln
                        all_vulns[product]['cveData'][vuln_id]['affected_versions'] = []
                        all_vulns[product]['cveData'][vuln_id]['not_affected_versions'] = []

                    if release['version'] not in all_vulns[product]['cveData'][vuln_id]['affected_versions']:
                        all_vulns[product]['cveData'][vuln_id]['affected_versions'].append(release['version'])

        # 2nd loop to check version is not affected
        for release in releases:
            if release['version'] in failed_releases:
                continue

            for vuln_id in all_vulns[product]['cveData'].keys():
                if release['version'] not in all_vulns[product]['cveData'][vuln_id]['affected_versions']:
                    if release['version'] not in all_vulns[product]['cveData'][vuln_id]['not_affected_versions']:
                        all_vulns[product]['cveData'][vuln_id]['not_affected_versions'].append(release['version'])

        for vuln_id in all_vulns[product]['cveData'].keys():
            all_vulns[product]['cveData'][vuln_id]['affected_versions'].sort(key=semantic_version.Version, reverse=True)
            all_vulns[product]['cveData'][vuln_id]['not_affected_versions'].sort(key=semantic_version.Version, reverse=True)

        all_vulns[product]['date'] = datetime.datetime.now().isoformat()
        with open(f"{TEMP_DIR}/{product}.json", "w") as f:
            json.dump(all_vulns[product], f, indent=2)

if __name__ == "__main__":
    main()
