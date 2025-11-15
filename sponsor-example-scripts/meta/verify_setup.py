"""
Verification script to test Pipeboard API connection and setup
This script verifies your configuration without creating ads
"""
import os
import json
from dotenv import load_dotenv
from src.pipeboard_client import PipeboardMetaAdsClient

load_dotenv()

def main():
    print("=" * 60)
    print("PIPEBOARD META ADS API - SETUP VERIFICATION")
    print("=" * 60)

    # Check environment variables
    print("\n1️⃣  Checking Environment Variables...")
    api_token = os.getenv("PIPEBOARD_API_TOKEN")
    ad_account_id = os.getenv("META_AD_ACCOUNT_ID")
    page_id = os.getenv("META_PAGE_ID")
    business_id = os.getenv("META_BUSINESS_ID")

    if not api_token:
        print("   ❌ PIPEBOARD_API_TOKEN not set")
        return False
    else:
        print(f"   ✅ PIPEBOARD_API_TOKEN: {api_token[:10]}...")

    if not ad_account_id:
        print("   ❌ META_AD_ACCOUNT_ID not set")
        return False
    else:
        print(f"   ✅ META_AD_ACCOUNT_ID: {ad_account_id}")

    if not page_id:
        print("   ⚠️  META_PAGE_ID not set (required for creating ads)")
    else:
        print(f"   ✅ META_PAGE_ID: {page_id}")

    if not business_id:
        print("   ℹ️  META_BUSINESS_ID not set (optional)")
    else:
        print(f"   ✅ META_BUSINESS_ID: {business_id}")

    # Test API connection
    print("\n2️⃣  Testing API Connection...")
    try:
        client = PipeboardMetaAdsClient(api_token, ad_account_id)
        print("   ✅ Client initialized")
    except Exception as e:
        print(f"   ❌ Failed to initialize client: {e}")
        return False

    # Get ad accounts
    print("\n3️⃣  Fetching Ad Accounts...")
    try:
        accounts = client._call_mcp_tool("get_ad_accounts", {})
        account_list = accounts.get("data", [])
        print(f"   ✅ Found {len(account_list)} ad account(s)")

        target_account = None
        for account in account_list:
            acc_id = account.get("id")
            acc_name = account.get("name")
            is_target = "✨" if acc_id == ad_account_id else "   "
            print(f"   {is_target} {acc_id} - {acc_name}")
            if acc_id == ad_account_id:
                target_account = account

        if target_account:
            print(f"\n   ✅ Target account verified: {target_account.get('name')}")
            print(f"      Status: {'Active' if target_account.get('account_status') == 1 else 'Inactive'}")
            print(f"      Currency: {target_account.get('currency')}")
            print(f"      Amount spent: ${float(target_account.get('amount_spent', 0)) / 100:.2f}")
        else:
            print(f"\n   ⚠️  Target account {ad_account_id} not found in your accessible accounts")

    except Exception as e:
        print(f"   ❌ Failed to fetch ad accounts: {e}")
        return False

    # Get existing campaigns (to verify read access)
    print("\n4️⃣  Checking Existing Campaigns...")
    try:
        campaigns = client._call_mcp_tool("get_campaigns", {
            "account_id": ad_account_id,
            "limit": 5
        })
        campaign_list = campaigns.get("data", [])
        print(f"   ✅ Found {len(campaign_list)} campaign(s) (showing first 5)")

        for campaign in campaign_list[:5]:
            camp_id = campaign.get("id")
            camp_name = campaign.get("name")
            camp_status = campaign.get("status", "UNKNOWN")
            print(f"      • {camp_name} (ID: {camp_id}, Status: {camp_status})")

        if len(campaign_list) == 0:
            print("      ℹ️  No campaigns found (this is normal for new accounts)")

    except Exception as e:
        print(f"   ⚠️  Could not fetch campaigns: {e}")
        print("      (This might be a permissions issue)")

    # Summary
    print("\n" + "=" * 60)
    print("✅ SETUP VERIFICATION COMPLETE")
    print("=" * 60)
    print("\nYour Pipeboard API connection is working!")
    print("\nNext steps:")
    print("  • Run 'python get_metrics_example.py' to view ad metrics")
    print("  • Run 'python post_ad_example.py' to create test ads")
    print("     (Make sure you have an accessible image URL first)")
    print("\nNote: Pipeboard Free tier has a limit of 30 AI tool executions/week")
    print("      If you hit the limit, wait for Monday reset or upgrade your plan")
    print("\n" + "=" * 60)

    return True


if __name__ == "__main__":
    main()
