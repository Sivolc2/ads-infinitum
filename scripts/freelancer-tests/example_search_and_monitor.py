#!/usr/bin/env python3
"""
Example: Search and monitor projects on Freelancer.com
Practical example showing how to search for projects matching your criteria
"""

import os
import requests
from dotenv import load_dotenv
from datetime import datetime
import time

# Load environment variables
load_dotenv()

# API Configuration
ACCESS_TOKEN = os.getenv('FREELANCER_ACCESS_TOKEN') or os.getenv('FREELANCER-API-KEY')
BASE_URL = os.getenv('FLN_URL', 'https://www.freelancer.com')
API_ENDPOINT = f'{BASE_URL}/api'

HEADERS = {
    'Authorization': f'Bearer {ACCESS_TOKEN}',
    'Content-Type': 'application/json'
}


def search_projects(query, skills=None, min_budget=None, max_budget=None, limit=10):
    """
    Search for projects matching criteria

    Args:
        query: Search keywords
        skills: List of skill IDs (optional)
        min_budget: Minimum budget (optional)
        max_budget: Maximum budget (optional)
        limit: Number of results to return
    """
    params = {
        'query': query,
        'limit': limit,
        'offset': 0,
        'compact': False
    }

    if skills:
        for skill_id in skills:
            params[f'skills[]'] = skill_id

    if min_budget:
        params['min_budget'] = min_budget

    if max_budget:
        params['max_budget'] = max_budget

    try:
        response = requests.get(
            f'{API_ENDPOINT}/projects/0.1/projects/active',
            headers=HEADERS,
            params=params
        )

        if response.status_code == 200:
            data = response.json()
            return data.get('result', {}).get('projects', [])
        else:
            print(f"Search failed: {response.status_code}")
            return []

    except Exception as e:
        print(f"Error searching projects: {e}")
        return []


def format_project(project):
    """Format project data for display"""
    project_id = project.get('id')
    title = project.get('title')
    description = project.get('description', '')[:200]

    budget = project.get('budget', {})
    min_budget = budget.get('minimum', 0)
    max_budget = budget.get('maximum', 0)
    currency = project.get('currency', {}).get('code', 'USD')

    bid_stats = project.get('bid_stats', {})
    bid_count = bid_stats.get('bid_count', 0)
    avg_bid = bid_stats.get('bid_avg', 0)

    time_submitted = project.get('time_submitted')
    if time_submitted:
        dt = datetime.fromtimestamp(time_submitted)
        time_str = dt.strftime('%Y-%m-%d %H:%M:%S')
    else:
        time_str = 'Unknown'

    owner_id = project.get('owner_id')
    project_url = f"{BASE_URL}/projects/{project_id}"

    return f"""
{'='*70}
Project ID: {project_id}
Title: {title}
URL: {project_url}
{'='*70}
Budget: ${min_budget} - ${max_budget} {currency}
Bids: {bid_count} (avg: ${avg_bid:.2f})
Posted: {time_str}
Owner ID: {owner_id}

Description:
{description}...
{'='*70}
"""


def monitor_projects(query, interval=60, max_iterations=10):
    """
    Monitor projects continuously

    Args:
        query: Search query
        interval: Seconds between checks
        max_iterations: Number of times to check (set to 0 for infinite)
    """
    print(f"Starting project monitor for: '{query}'")
    print(f"Checking every {interval} seconds")
    print("Press Ctrl+C to stop\n")

    seen_projects = set()
    iteration = 0

    try:
        while True:
            iteration += 1

            if max_iterations > 0 and iteration > max_iterations:
                print("\nMax iterations reached. Stopping monitor.")
                break

            print(f"\n[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Checking for new projects...")

            projects = search_projects(query, limit=10)

            new_projects = []
            for project in projects:
                project_id = project.get('id')
                if project_id not in seen_projects:
                    new_projects.append(project)
                    seen_projects.add(project_id)

            if new_projects:
                print(f"\n🆕 Found {len(new_projects)} new project(s)!\n")
                for project in new_projects:
                    print(format_project(project))
            else:
                print("No new projects found.")

            if max_iterations == 0 or iteration < max_iterations:
                time.sleep(interval)

    except KeyboardInterrupt:
        print("\n\nMonitor stopped by user.")


def example_1_simple_search():
    """Example 1: Simple keyword search"""
    print("\n" + "="*70)
    print("Example 1: Simple Search for Python Projects")
    print("="*70)

    projects = search_projects("python", limit=5)

    print(f"\nFound {len(projects)} projects:")

    for project in projects:
        print(format_project(project))


def example_2_filtered_search():
    """Example 2: Search with budget filter"""
    print("\n" + "="*70)
    print("Example 2: Search with Budget Filter")
    print("="*70)

    projects = search_projects(
        query="web development",
        min_budget=500,
        max_budget=5000,
        limit=5
    )

    print(f"\nFound {len(projects)} projects with budget $500-$5000:")

    for project in projects:
        print(format_project(project))


def example_3_by_skills():
    """Example 3: Search by skill IDs"""
    print("\n" + "="*70)
    print("Example 3: Search by Skills")
    print("="*70)

    # Note: You need to get skill IDs from /projects/0.1/skills endpoint
    # Common skill IDs (examples - verify these):
    # Python: 3, JavaScript: 4, PHP: 3, etc.

    print("Note: To search by skills, you need skill IDs.")
    print("Run test_api_advanced.py to see available skills and their IDs")

    # Example with hypothetical skill IDs
    # projects = search_projects("", skills=[3, 4], limit=5)


def main():
    print("="*70)
    print("Freelancer.com Project Search & Monitor Examples")
    print("="*70)

    if not ACCESS_TOKEN:
        print("\n✗ Error: No access token found in .env file")
        return

    print("\nSelect an example to run:")
    print("1. Simple keyword search")
    print("2. Search with budget filter")
    print("3. Information about skill-based search")
    print("4. Monitor projects (continuous)")
    print("5. Run all examples (except monitor)")

    choice = input("\nEnter choice (1-5): ").strip()

    if choice == '1':
        example_1_simple_search()
    elif choice == '2':
        example_2_filtered_search()
    elif choice == '3':
        example_3_by_skills()
    elif choice == '4':
        query = input("Enter search query: ").strip() or "python"
        interval = input("Check interval in seconds (default 60): ").strip()
        interval = int(interval) if interval else 60
        monitor_projects(query, interval=interval, max_iterations=5)
    elif choice == '5':
        example_1_simple_search()
        example_2_filtered_search()
        example_3_by_skills()
    else:
        print("Invalid choice")


if __name__ == "__main__":
    main()
