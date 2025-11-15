"""
Example: Retrieve Ad Metrics from Meta using Pipeboard API

This script demonstrates how to:
1. Fetch insights/metrics at the ad level
2. Parse lead generation actions
3. Calculate cost per lead (CPL)
4. Identify top-performing ads
5. Generate a performance summary
"""
import os
from datetime import datetime, timedelta
from dotenv import load_dotenv
from src.pipeboard_client import PipeboardMetaAdsClient

# Load environment variables
load_dotenv()


def calculate_cpl(spend: float, leads: int) -> float:
    """Calculate cost per lead"""
    if leads == 0:
        return 0.0
    return spend / leads


def format_currency(cents: int) -> str:
    """Format cents as currency"""
    return f"${cents / 100:.2f}"


def format_percentage(value: float) -> str:
    """Format as percentage"""
    return f"{value * 100:.2f}%"


def main():
    # Get configuration from environment
    api_token = os.getenv("PIPEBOARD_API_TOKEN")
    ad_account_id = os.getenv("META_AD_ACCOUNT_ID")

    if not all([api_token, ad_account_id]):
        print("❌ Missing required environment variables!")
        print("Please set PIPEBOARD_API_TOKEN and META_AD_ACCOUNT_ID")
        return

    # Initialize client
    client = PipeboardMetaAdsClient(api_token, ad_account_id)

    print("📊 Fetching Meta Ads Performance Metrics\n")

    # Configure time range (last 7 days by default)
    today = datetime.now()
    time_range = {
        "since": (today - timedelta(days=7)).strftime("%Y-%m-%d"),
        "until": today.strftime("%Y-%m-%d")
    }

    print(f"📅 Time Range: {time_range['since']} to {time_range['until']}\n")

    # Fetch insights at the ad level
    print("🔍 Fetching ad-level insights...")
    try:
        insights = client.get_insights(
            level="ad",
            time_range=time_range,
            fields=[
                "ad_id", "ad_name", "adset_id", "adset_name",
                "campaign_id", "campaign_name",
                "impressions", "clicks", "actions", "spend",
                "ctr", "cpm", "cpc"
            ]
        )

        if not insights:
            print("   ℹ️  No insights data available for the specified time range.")
            print("   This could mean:")
            print("   - Ads are still in PAUSED status")
            print("   - Ads haven't started running yet")
            print("   - No data has been recorded yet")
            return

        print(f"   ✅ Retrieved {len(insights)} ad record(s)\n")

    except Exception as e:
        print(f"   ❌ Error fetching insights: {e}\n")
        return

    # Process and display metrics
    print("=" * 80)
    print("AD PERFORMANCE SUMMARY")
    print("=" * 80)

    metrics_list = []

    for record in insights:
        # Extract basic metrics
        ad_id = record.get("ad_id", "N/A")
        ad_name = record.get("ad_name", "Unnamed Ad")
        impressions = int(record.get("impressions", 0))
        clicks = int(record.get("clicks", 0))
        spend = float(record.get("spend", 0))
        ctr = float(record.get("ctr", 0))

        # Parse lead actions
        actions = record.get("actions", [])
        leads = client.parse_lead_actions(actions)

        # Calculate CPL
        cpl = calculate_cpl(spend, leads) if leads > 0 else None

        # Store for ranking
        metrics = {
            "ad_id": ad_id,
            "ad_name": ad_name,
            "campaign_name": record.get("campaign_name", "N/A"),
            "impressions": impressions,
            "clicks": clicks,
            "leads": leads,
            "spend": spend,
            "ctr": ctr,
            "cpl": cpl
        }
        metrics_list.append(metrics)

        # Display individual ad metrics
        print(f"\n📢 Ad: {ad_name} (ID: {ad_id})")
        print(f"   Campaign: {metrics['campaign_name']}")
        print(f"   Impressions: {impressions:,}")
        print(f"   Clicks: {clicks:,}")
        print(f"   CTR: {format_percentage(ctr)}")
        print(f"   Leads: {leads}")
        print(f"   Spend: ${spend:.2f}")
        if cpl is not None:
            print(f"   CPL: ${cpl:.2f}")
        else:
            print(f"   CPL: N/A (no leads)")

    # Rank and find best performers
    print("\n" + "=" * 80)
    print("TOP PERFORMERS")
    print("=" * 80)

    # Best by CPL (lowest cost per lead)
    ads_with_leads = [m for m in metrics_list if m["leads"] > 0]
    if ads_with_leads:
        best_cpl = min(ads_with_leads, key=lambda x: x["cpl"])
        print(f"\n🏆 Best Cost Per Lead (CPL):")
        print(f"   {best_cpl['ad_name']}")
        print(f"   CPL: ${best_cpl['cpl']:.2f} ({best_cpl['leads']} leads for ${best_cpl['spend']:.2f})")

    # Best by CTR
    best_ctr = max(metrics_list, key=lambda x: x["ctr"])
    print(f"\n🎯 Best Click-Through Rate (CTR):")
    print(f"   {best_ctr['ad_name']}")
    print(f"   CTR: {format_percentage(best_ctr['ctr'])} ({best_ctr['clicks']:,} clicks from {best_ctr['impressions']:,} impressions)")

    # Most leads generated
    best_leads = max(metrics_list, key=lambda x: x["leads"])
    if best_leads["leads"] > 0:
        print(f"\n📈 Most Leads Generated:")
        print(f"   {best_leads['ad_name']}")
        print(f"   Leads: {best_leads['leads']} (CPL: ${best_leads['cpl']:.2f})")

    # Overall summary
    print("\n" + "=" * 80)
    print("OVERALL SUMMARY")
    print("=" * 80)

    total_impressions = sum(m["impressions"] for m in metrics_list)
    total_clicks = sum(m["clicks"] for m in metrics_list)
    total_leads = sum(m["leads"] for m in metrics_list)
    total_spend = sum(m["spend"] for m in metrics_list)
    overall_ctr = total_clicks / total_impressions if total_impressions > 0 else 0
    overall_cpl = calculate_cpl(total_spend, total_leads) if total_leads > 0 else None

    print(f"\nTotal Ads: {len(metrics_list)}")
    print(f"Total Impressions: {total_impressions:,}")
    print(f"Total Clicks: {total_clicks:,}")
    print(f"Overall CTR: {format_percentage(overall_ctr)}")
    print(f"Total Leads: {total_leads}")
    print(f"Total Spend: ${total_spend:.2f}")
    if overall_cpl is not None:
        print(f"Overall CPL: ${overall_cpl:.2f}")

    print("\n" + "=" * 80)

    # Recommendations
    print("\n💡 RECOMMENDATIONS")
    print("=" * 80)

    if ads_with_leads:
        # Find underperformers (CPL > 2x average)
        avg_cpl = sum(m["cpl"] for m in ads_with_leads) / len(ads_with_leads)
        underperformers = [m for m in ads_with_leads if m["cpl"] > avg_cpl * 2]

        if underperformers:
            print(f"\n⚠️  Consider pausing or optimizing these high-CPL ads:")
            for ad in underperformers:
                print(f"   - {ad['ad_name']} (CPL: ${ad['cpl']:.2f}, {ad['cpl'] / avg_cpl:.1f}x average)")

        # Find top performers to scale
        top_performers = [m for m in ads_with_leads if m["cpl"] < avg_cpl * 0.7]
        if top_performers:
            print(f"\n🚀 Consider increasing budget for these low-CPL ads:")
            for ad in top_performers:
                print(f"   - {ad['ad_name']} (CPL: ${ad['cpl']:.2f}, {avg_cpl / ad['cpl']:.1f}x better than average)")

    print("\n")


if __name__ == "__main__":
    main()
