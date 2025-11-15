#!/usr/bin/env python3
"""
Test script using the official Freelancer SDK
"""

import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

try:
    from freelancersdk.session import Session
    from freelancersdk.resources.projects import (
        create_get_projects_project_details,
        create_get_projects_user_details,
        create_search_projects,
    )
    from freelancersdk.resources.users import get_self
    SDK_AVAILABLE = True
except ImportError:
    SDK_AVAILABLE = False
    print("⚠ Freelancer SDK not installed. Run: pip install -r requirements.txt")


def test_sdk():
    """Test the official Freelancer SDK"""
    if not SDK_AVAILABLE:
        return

    print("=" * 60)
    print("Freelancer SDK Test")
    print("=" * 60)

    # Get access token from environment
    access_token = os.getenv('FREELANCER_ACCESS_TOKEN') or os.getenv('FREELANCER-API-KEY')

    if not access_token:
        print("\n✗ No access token found in .env")
        print("Add FREELANCER_ACCESS_TOKEN to your .env file")
        return

    # Optional: Set FLN_URL for sandbox testing
    # os.environ['FLN_URL'] = 'https://www.freelancer-sandbox.com'

    print(f"Access Token: {access_token[:15]}...")
    print("=" * 60)

    try:
        # Create session
        print("\nCreating session...")
        session = Session(oauth_token=access_token)
        print("✓ Session created")

        # Test 1: Get self info
        print("\n" + "-" * 60)
        print("Test 1: Getting self user info")
        print("-" * 60)

        try:
            response = get_self(session)
            user = response.get('result', {})

            print(f"✓ Authenticated as: {user.get('username')}")
            print(f"  Display Name: {user.get('display_name')}")
            print(f"  User ID: {user.get('id')}")
            print(f"  Email: {user.get('email')}")
        except Exception as e:
            print(f"✗ Failed to get self info: {e}")

        # Test 2: Search for projects
        print("\n" + "-" * 60)
        print("Test 2: Searching for Python projects")
        print("-" * 60)

        try:
            query = create_search_projects(
                query='python',
                limit=5
            )
            response = session.session_get(query.url, params_data=query.params)

            if response.ok:
                data = response.json()
                projects = data.get('result', {}).get('projects', [])

                print(f"✓ Found {len(projects)} projects")

                for idx, project in enumerate(projects, 1):
                    print(f"\n  Project {idx}:")
                    print(f"    ID: {project.get('id')}")
                    print(f"    Title: {project.get('title')}")
                    budget = project.get('budget', {})
                    print(f"    Budget: {budget.get('minimum', 0)}-{budget.get('maximum', 0)}")
            else:
                print(f"✗ Search failed: {response.status_code}")
        except Exception as e:
            print(f"✗ Failed to search projects: {e}")

        # Test 3: Get project details
        print("\n" + "-" * 60)
        print("Test 3: Getting project details")
        print("-" * 60)

        try:
            # First get a project ID from the search
            query = create_search_projects(query='python', limit=1)
            response = session.session_get(query.url, params_data=query.params)

            if response.ok:
                data = response.json()
                projects = data.get('result', {}).get('projects', [])

                if projects:
                    project_id = projects[0].get('id')

                    # Get detailed info
                    query = create_get_projects_project_details([project_id])
                    response = session.session_get(query.url, params_data=query.params)

                    if response.ok:
                        data = response.json()
                        project = data.get('result', {}).get('projects', [{}])[0]

                        print(f"✓ Project Details:")
                        print(f"  Title: {project.get('title')}")
                        print(f"  Description: {project.get('description', '')[:150]}...")
                        print(f"  Status: {project.get('status')}")
                        print(f"  Bid Count: {project.get('bid_stats', {}).get('bid_count', 0)}")
                    else:
                        print(f"✗ Failed to get details: {response.status_code}")
                else:
                    print("✗ No projects found to get details from")
        except Exception as e:
            print(f"✗ Failed to get project details: {e}")

        # Summary
        print("\n" + "=" * 60)
        print("✓ SDK test completed!")
        print("=" * 60)

    except Exception as e:
        print(f"\n✗ SDK Error: {e}")
        print("\nTroubleshooting:")
        print("1. Ensure your access token is valid")
        print("2. Check if you need OAuth2 authentication (run oauth2_flow.py)")
        print("3. Verify your API credentials at https://accounts.freelancer.com/settings/develop")


if __name__ == "__main__":
    test_sdk()
