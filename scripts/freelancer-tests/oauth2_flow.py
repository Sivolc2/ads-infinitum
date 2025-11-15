#!/usr/bin/env python3
"""
OAuth2 authentication flow for Freelancer.com API
This script helps you obtain an access token using OAuth2
"""

import os
import requests
from dotenv import load_dotenv
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import webbrowser
import threading

# Load environment variables
load_dotenv()

# OAuth2 Configuration - You need to set these in .env or here
CLIENT_ID = os.getenv('FREELANCER_CLIENT_ID', '')
CLIENT_SECRET = os.getenv('FREELANCER_CLIENT_SECRET', '')
REDIRECT_URI = os.getenv('FREELANCER_REDIRECT_URI', 'http://localhost:8080/callback')

# Freelancer OAuth endpoints
AUTH_URL = 'https://accounts.freelancer.com/oauth/authorise'
TOKEN_URL = 'https://accounts.freelancer.com/oauth/token'

# Global variable to store the authorization code
auth_code = None


class OAuthCallbackHandler(BaseHTTPRequestHandler):
    """Handler for OAuth callback"""

    def do_GET(self):
        global auth_code

        # Parse the callback URL
        parsed_path = urlparse(self.path)
        query_params = parse_qs(parsed_path.query)

        if 'code' in query_params:
            auth_code = query_params['code'][0]
            self.send_response(200)
            self.send_header('Content-type', 'text/html')
            self.end_headers()
            self.wfile.write(b"""
                <html>
                    <body>
                        <h1>Authorization successful!</h1>
                        <p>You can close this window and return to the terminal.</p>
                    </body>
                </html>
            """)
        else:
            self.send_response(400)
            self.send_header('Content-type', 'text/html')
            self.end_headers()
            error = query_params.get('error', ['Unknown error'])[0]
            self.wfile.write(f"""
                <html>
                    <body>
                        <h1>Authorization failed</h1>
                        <p>Error: {error}</p>
                    </body>
                </html>
            """.encode())

    def log_message(self, format, *args):
        """Suppress log messages"""
        pass


def start_callback_server():
    """Start a local server to handle OAuth callback"""
    server = HTTPServer(('localhost', 8080), OAuthCallbackHandler)
    server.handle_request()  # Handle one request and then stop


def get_authorization_url(scope='basic'):
    """Generate the OAuth authorization URL"""
    params = {
        'response_type': 'code',
        'client_id': CLIENT_ID,
        'redirect_uri': REDIRECT_URI,
        'scope': scope
    }

    query_string = '&'.join([f'{k}={v}' for k, v in params.items()])
    return f'{AUTH_URL}?{query_string}'


def exchange_code_for_token(code):
    """Exchange authorization code for access token"""
    data = {
        'grant_type': 'authorization_code',
        'code': code,
        'client_id': CLIENT_ID,
        'client_secret': CLIENT_SECRET,
        'redirect_uri': REDIRECT_URI
    }

    try:
        response = requests.post(TOKEN_URL, data=data)

        if response.status_code == 200:
            token_data = response.json()
            return token_data
        else:
            print(f"Token exchange failed: {response.status_code}")
            print(f"Response: {response.text}")
            return None

    except Exception as e:
        print(f"Error exchanging code for token: {e}")
        return None


def client_credentials_flow():
    """
    Use client credentials flow (for app-only authentication)
    This doesn't require user authorization
    """
    print("\nAttempting Client Credentials flow...")

    data = {
        'grant_type': 'client_credentials',
        'client_id': CLIENT_ID,
        'client_secret': CLIENT_SECRET,
        'scope': 'basic'
    }

    try:
        response = requests.post(TOKEN_URL, data=data)

        if response.status_code == 200:
            token_data = response.json()
            print("\n✓ Client Credentials authentication successful!")
            return token_data
        else:
            print(f"\n✗ Client Credentials flow failed: {response.status_code}")
            print(f"Response: {response.text}")
            return None

    except Exception as e:
        print(f"\n✗ Error: {e}")
        return None


def main():
    print("=" * 60)
    print("Freelancer.com OAuth2 Authentication")
    print("=" * 60)

    if not CLIENT_ID or not CLIENT_SECRET:
        print("\n⚠ Missing OAuth2 credentials!")
        print("\nTo use OAuth2, you need to:")
        print("1. Go to: https://accounts.freelancer.com/settings/develop")
        print("2. Create a new application")
        print("3. Add these to your .env file:")
        print("   FREELANCER_CLIENT_ID=your_client_id")
        print("   FREELANCER_CLIENT_SECRET=your_client_secret")
        print("   FREELANCER_REDIRECT_URI=http://localhost:8080/callback")
        print("\n" + "=" * 60)
        return

    print(f"Client ID: {CLIENT_ID[:10]}...")
    print(f"Redirect URI: {REDIRECT_URI}")
    print("=" * 60)

    print("\nSelect authentication flow:")
    print("1. Authorization Code Flow (user authorization required)")
    print("2. Client Credentials Flow (app-only, no user)")

    choice = input("\nEnter choice (1 or 2): ").strip()

    if choice == '1':
        # Authorization Code Flow
        print("\n" + "=" * 60)
        print("Starting Authorization Code Flow...")
        print("=" * 60)

        # Start callback server in a thread
        server_thread = threading.Thread(target=start_callback_server)
        server_thread.daemon = True
        server_thread.start()

        # Open browser for authorization
        auth_url = get_authorization_url()
        print(f"\nOpening browser for authorization...")
        print(f"URL: {auth_url}\n")

        webbrowser.open(auth_url)

        print("Waiting for authorization...")
        server_thread.join(timeout=60)  # Wait up to 60 seconds

        if auth_code:
            print(f"\n✓ Received authorization code!")
            print(f"Code: {auth_code[:20]}...")

            # Exchange code for token
            print("\nExchanging code for access token...")
            token_data = exchange_code_for_token(auth_code)

            if token_data:
                print("\n" + "=" * 60)
                print("✓ Successfully obtained access token!")
                print("=" * 60)
                print(f"Access Token: {token_data.get('access_token', '')[:30]}...")
                print(f"Token Type: {token_data.get('token_type')}")
                print(f"Expires In: {token_data.get('expires_in')} seconds")

                if 'refresh_token' in token_data:
                    print(f"Refresh Token: {token_data.get('refresh_token')[:30]}...")

                print("\n💾 Add this to your .env file:")
                print(f"FREELANCER_ACCESS_TOKEN={token_data.get('access_token')}")
                print("=" * 60)
        else:
            print("\n✗ Authorization failed or timed out")

    elif choice == '2':
        # Client Credentials Flow
        token_data = client_credentials_flow()

        if token_data:
            print("\n" + "=" * 60)
            print(f"Access Token: {token_data.get('access_token', '')[:30]}...")
            print(f"Token Type: {token_data.get('token_type')}")
            print(f"Expires In: {token_data.get('expires_in')} seconds")

            print("\n💾 Add this to your .env file:")
            print(f"FREELANCER_ACCESS_TOKEN={token_data.get('access_token')}")
            print("=" * 60)

    else:
        print("\n✗ Invalid choice")


if __name__ == "__main__":
    main()
