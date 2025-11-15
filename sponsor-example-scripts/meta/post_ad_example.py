"""
Example: Post Ads to Meta using Pipeboard API

This script demonstrates how to:
1. Upload ad images
2. Create a campaign
3. Create ad sets with targeting
4. Create ad creatives
5. Create ads

All ads are created in PAUSED status by default for safety.
"""
import os
from dotenv import load_dotenv
from src.pipeboard_client import PipeboardMetaAdsClient

# Load environment variables
load_dotenv()


def create_targeting_spec(
    age_min: int,
    age_max: int,
    genders: list,
    countries: list,
    interests: list = None
) -> dict:
    """
    Helper to create a targeting specification

    Args:
        age_min: Minimum age
        age_max: Maximum age
        genders: List of gender codes (1=male, 2=female)
        countries: List of country codes (e.g., ["US", "CA"])
        interests: Optional list of interest dicts with "id" and "name"

    Returns:
        Targeting spec dict
    """
    spec = {
        "age_min": age_min,
        "age_max": age_max,
        "genders": genders,
        "geo_locations": {"countries": countries},
        "publisher_platforms": ["facebook", "instagram"],
        "facebook_positions": ["feed", "marketplace"],
        "instagram_positions": ["feed", "story", "reels"]
    }

    if interests:
        spec["detailed_targeting"] = {"interests": interests}

    return spec


def main():
    # Get configuration from environment
    api_token = os.getenv("PIPEBOARD_API_TOKEN")
    ad_account_id = os.getenv("META_AD_ACCOUNT_ID")
    page_id = os.getenv("META_PAGE_ID")
    cta_url = os.getenv("AD_CTA_URL", "https://example.com")

    if not all([api_token, ad_account_id, page_id]):
        print("❌ Missing required environment variables!")
        print("Please set PIPEBOARD_API_TOKEN, META_AD_ACCOUNT_ID, and META_PAGE_ID")
        return

    # Initialize client
    client = PipeboardMetaAdsClient(api_token, ad_account_id)

    print("🚀 Starting Meta Ads Campaign Creation\n")

    # Step 1: Upload images
    print("📸 Step 1: Uploading ad images...")
    try:
        # Example: Replace with your actual image URLs
        image_url = "https://example.com/your-ad-image.png"
        image_hash = client.upload_ad_image(image_url, "ad-creative-1.png")
        print(f"   ✅ Image uploaded. Hash: {image_hash}\n")
    except Exception as e:
        print(f"   ❌ Error uploading image: {e}\n")
        return

    # Step 2: Create campaign
    print("📋 Step 2: Creating campaign...")
    try:
        campaign_name = "Test Campaign - Lead Generation"
        campaign_id = client.create_campaign(
            name=campaign_name,
            objective="OUTCOME_LEADS",
            status="PAUSED"
        )
        print(f"   ✅ Campaign created. ID: {campaign_id}\n")
    except Exception as e:
        print(f"   ❌ Error creating campaign: {e}\n")
        return

    # Step 3: Create ad set
    print("🎯 Step 3: Creating ad set...")
    try:
        # Target: Women 28-44 in US/CA interested in self-care
        targeting = create_targeting_spec(
            age_min=28,
            age_max=44,
            genders=[2],  # Female
            countries=["US", "CA"],
            interests=[
                {"id": "6003139266461", "name": "Journaling"},
                {"id": "6003462608892", "name": "Self-care"}
            ]
        )

        adset_name = "Test Ad Set - Women 28-44 US/CA"
        adset_id = client.create_adset(
            campaign_id=campaign_id,
            name=adset_name,
            daily_budget=1500,  # $15.00 per day
            targeting=targeting,
            status="PAUSED"
        )
        print(f"   ✅ Ad set created. ID: {adset_id}\n")
    except Exception as e:
        print(f"   ❌ Error creating ad set: {e}\n")
        return

    # Step 4: Create ad creative
    print("🎨 Step 4: Creating ad creative...")
    try:
        creative_name = "Test Creative 1"
        creative_id = client.create_ad_creative(
            name=creative_name,
            page_id=page_id,
            image_hash=image_hash,
            message="Transform your daily routine with our innovative solution. Join thousands who have already discovered the difference.",
            headline="Start Your Journey Today",
            link=cta_url,
            call_to_action_type="SIGN_UP",
            status="PAUSED"
        )
        print(f"   ✅ Creative created. ID: {creative_id}\n")
    except Exception as e:
        print(f"   ❌ Error creating creative: {e}\n")
        return

    # Step 5: Create ad
    print("📢 Step 5: Creating ad...")
    try:
        ad_name = "Test Ad 1"
        ad_id = client.create_ad(
            adset_id=adset_id,
            creative_id=creative_id,
            name=ad_name,
            status="PAUSED"
        )
        print(f"   ✅ Ad created. ID: {ad_id}\n")
    except Exception as e:
        print(f"   ❌ Error creating ad: {e}\n")
        return

    # Summary
    print("=" * 60)
    print("✅ CAMPAIGN CREATION COMPLETE")
    print("=" * 60)
    print(f"Campaign ID:  {campaign_id}")
    print(f"Ad Set ID:    {adset_id}")
    print(f"Creative ID:  {creative_id}")
    print(f"Ad ID:        {ad_id}")
    print("\n⚠️  All objects created in PAUSED status.")
    print("Review them in Meta Ads Manager before activating.")
    print("=" * 60)


if __name__ == "__main__":
    main()
