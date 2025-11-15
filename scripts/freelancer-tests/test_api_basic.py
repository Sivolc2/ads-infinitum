#!/usr/bin/env python3
"""
Basic test script for Freelancer.com API
Tests if the API key/token in .env works for basic API calls
"""

import os
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# API Configuration
API_KEY = os.getenv('FREELANCER-API-KEY')
BASE_URL = os.getenv('FLN_URL', 'https://www.freelancer.com')
API_ENDPOINT = f'{BASE_URL}/api'

def test_auth_with_bearer_token():
    """Test API access using the key as a Bearer token"""
    print("Testing API with Bearer token authentication...")

    headers = {
        'Authorization': f'Bearer {API_KEY}',
        'Content-Type': 'application/json'
    }

    # Try to get current user info (common test endpoint)
    try:
        response = requests.get(
            f'{API_ENDPOINT}/users/0.1/self',
            headers=headers
        )

        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text[:500]}")  # First 500 chars

        if response.status_code == 200:
            data = response.json()
            print("\n✓ Authentication successful!")
            print(f"User info: {data}")
            return True
        else:
            print(f"\n✗ Authentication failed: {response.text}")
            return False

    except Exception as e:
        print(f"\n✗ Error: {e}")
        return False

def test_projects_endpoint():
    """Test fetching public projects"""
    print("\n\nTesting projects endpoint...")

    headers = {
        'Authorization': f'Bearer {API_KEY}',
        'Content-Type': 'application/json'
    }

    try:
        # Get recent projects
        response = requests.get(
            f'{API_ENDPOINT}/projects/0.1/projects',
            headers=headers,
            params={
                'limit': 5,
                'offset': 0
            }
        )

        print(f"Status Code: {response.status_code}")

        if response.status_code == 200:
            data = response.json()
            print(f"\n✓ Successfully fetched projects!")
            print(f"Number of projects: {len(data.get('result', {}).get('projects', []))}")

            # Display first project
            projects = data.get('result', {}).get('projects', [])
            if projects:
                first_project = projects[0]
                print(f"\nFirst project:")
                print(f"  ID: {first_project.get('id')}")
                print(f"  Title: {first_project.get('title')}")
                print(f"  Budget: {first_project.get('budget', {})}")
            return True
        else:
            print(f"\n✗ Request failed: {response.text}")
            return False

    except Exception as e:
        print(f"\n✗ Error: {e}")
        return False

def main():
    print("=" * 60)
    print("Freelancer.com API Basic Test")
    print("=" * 60)
    print(f"API Endpoint: {API_ENDPOINT}")
    print(f"API Key: {API_KEY[:10]}..." if API_KEY else "API Key: NOT FOUND")
    print("=" * 60)

    if not API_KEY:
        print("\n✗ Error: FREELANCER-API-KEY not found in .env file")
        return

    # Run tests
    auth_success = test_auth_with_bearer_token()

    if auth_success:
        test_projects_endpoint()
    else:
        print("\n" + "=" * 60)
        print("Note: If authentication failed, your key might be:")
        print("  1. A client_id (not an access token)")
        print("  2. An expired access token")
        print("  3. Invalid or requires OAuth2 flow")
        print("\nRun oauth2_flow.py to get a valid access token")
        print("=" * 60)

if __name__ == "__main__":
    main()
