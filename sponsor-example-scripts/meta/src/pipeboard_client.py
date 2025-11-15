"""
Pipeboard Meta Ads MCP Client
Wraps the Pipeboard API for interacting with Meta Marketing API
"""
import os
import requests
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta


class PipeboardMetaAdsClient:
    """Client for interacting with Meta Ads via Pipeboard MCP API"""

    def __init__(self, api_token: str, ad_account_id: str):
        """
        Initialize the Pipeboard client

        Args:
            api_token: Pipeboard API token
            ad_account_id: Meta ad account ID (format: act_123456789012345)
        """
        self.api_token = api_token
        self.ad_account_id = ad_account_id
        self.endpoint_url = "https://mcp.pipeboard.co/meta-ads-mcp"
        self.headers = {
            "Authorization": f"Bearer {api_token}",
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
        self._request_id = 0

    def _call_mcp_tool(self, tool_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """
        Call a Pipeboard MCP tool using JSON-RPC 2.0 format

        Args:
            tool_name: Name of the MCP tool (e.g., "upload_ad_image")
            arguments: Arguments to pass to the tool

        Returns:
            Response from the MCP tool
        """
        self._request_id += 1

        # JSON-RPC 2.0 format
        payload = {
            "jsonrpc": "2.0",
            "id": self._request_id,
            "method": "tools/call",
            "params": {
                "name": tool_name,
                "arguments": arguments
            }
        }

        response = requests.post(
            self.endpoint_url,
            headers=self.headers,
            json=payload,
            timeout=60
        )
        response.raise_for_status()

        result = response.json()

        # Handle JSON-RPC error responses
        if "error" in result:
            error = result["error"]
            raise Exception(f"MCP Error {error.get('code')}: {error.get('message')}")

        # Extract the result content
        mcp_result = result.get("result", {})

        # Check for MCP-level errors
        if mcp_result.get("isError"):
            error_content = mcp_result.get("content", [{}])[0].get("text", "Unknown error")
            raise Exception(f"MCP Tool Error: {error_content}")

        # Parse the actual response from structuredContent.result
        structured = mcp_result.get("structuredContent", {})
        result_str = structured.get("result", "{}")

        # Parse the JSON string
        import json
        try:
            return json.loads(result_str)
        except json.JSONDecodeError:
            # If it's not JSON, return the raw result
            return mcp_result

    def upload_ad_image(self, image_url: str, filename: str) -> str:
        """
        Upload an image to Meta and get the image hash

        Args:
            image_url: URL of the image to upload
            filename: Filename for the image

        Returns:
            Image hash that can be used in ad creatives
        """
        result = self._call_mcp_tool("upload_ad_image", {
            "account_id": self.ad_account_id,
            "image_url": image_url,
            "filename": filename
        })

        # Extract the hash from the response
        # Response format: {"images": {"bytes": {"hash": "..."}}}
        if "images" in result:
            return result["images"]["bytes"]["hash"]
        return result.get("hash") or result.get("image_hash")

    def create_campaign(
        self,
        name: str,
        objective: str = "OUTCOME_LEADS",
        status: str = "PAUSED"
    ) -> str:
        """
        Create a Meta ad campaign

        Args:
            name: Campaign name
            objective: Campaign objective (OUTCOME_LEADS, OUTCOME_TRAFFIC, etc.)
            status: Campaign status (PAUSED or ACTIVE)

        Returns:
            Campaign ID
        """
        result = self._call_mcp_tool("create_campaign", {
            "account_id": self.ad_account_id,
            "name": name,
            "objective": objective,
            "status": status,
            "special_ad_categories": ["NONE"],
            "buying_type": "AUCTION"
        })

        return result.get("id") or result.get("campaign_id")

    def create_adset(
        self,
        campaign_id: str,
        name: str,
        daily_budget: int,
        targeting: Dict[str, Any],
        start_time: Optional[str] = None,
        end_time: Optional[str] = None,
        status: str = "PAUSED"
    ) -> str:
        """
        Create an ad set within a campaign

        Args:
            campaign_id: Parent campaign ID
            name: Ad set name
            daily_budget: Daily budget in cents (e.g., 1500 = $15.00)
            targeting: Targeting specification dict
            start_time: Start time in ISO format (defaults to tomorrow)
            end_time: End time in ISO format (defaults to start + 3 days)
            status: Ad set status (PAUSED or ACTIVE)

        Returns:
            Ad set ID
        """
        if not start_time:
            start_time = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%dT09:00:00-08:00")
        if not end_time:
            end_time = (datetime.now() + timedelta(days=4)).strftime("%Y-%m-%dT09:00:00-08:00")

        result = self._call_mcp_tool("create_adset", {
            "account_id": self.ad_account_id,
            "campaign_id": campaign_id,
            "name": name,
            "status": status,
            "daily_budget": daily_budget,
            "billing_event": "IMPRESSIONS",
            "optimization_goal": "LEAD_GENERATION",
            "bid_strategy": "LOWEST_COST_WITHOUT_CAP",
            "start_time": start_time,
            "end_time": end_time,
            "targeting": targeting
        })

        return result.get("id") or result.get("adset_id")

    def create_ad_creative(
        self,
        name: str,
        page_id: str,
        image_hash: str,
        message: str,
        headline: str,
        link: str,
        call_to_action_type: str = "SIGN_UP",
        status: str = "PAUSED"
    ) -> str:
        """
        Create an ad creative

        Args:
            name: Creative name
            page_id: Facebook page ID
            image_hash: Image hash from upload_ad_image
            message: Ad body text
            headline: Ad headline
            link: Destination URL
            call_to_action_type: CTA button type (SIGN_UP, LEARN_MORE, etc.)
            status: Creative status

        Returns:
            Creative ID
        """
        result = self._call_mcp_tool("create_ad_creative", {
            "account_id": self.ad_account_id,
            "name": name,
            "object_story_spec": {
                "page_id": page_id,
                "link_data": {
                    "message": message,
                    "name": headline,
                    "link": link,
                    "image_hash": image_hash,
                    "call_to_action": {
                        "type": call_to_action_type,
                        "value": {"link": link}
                    }
                }
            },
            "status": status
        })

        return result.get("id") or result.get("creative_id")

    def create_ad(
        self,
        adset_id: str,
        creative_id: str,
        name: str,
        status: str = "PAUSED"
    ) -> str:
        """
        Create an ad

        Args:
            adset_id: Parent ad set ID
            creative_id: Creative ID to use
            name: Ad name
            status: Ad status (PAUSED or ACTIVE)

        Returns:
            Ad ID
        """
        result = self._call_mcp_tool("create_ad", {
            "account_id": self.ad_account_id,
            "adset_id": adset_id,
            "name": name,
            "creative": {"creative_id": creative_id},
            "status": status
        })

        return result.get("id") or result.get("ad_id")

    def get_insights(
        self,
        level: str = "ad",
        time_range: Optional[Dict[str, str]] = None,
        filtering: Optional[List[Dict[str, Any]]] = None,
        fields: Optional[List[str]] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Get insights/metrics for campaigns, ad sets, or ads

        Args:
            level: Level to query (ad, adset, or campaign)
            time_range: Time range dict with "since" and "until" keys (YYYY-MM-DD)
            filtering: Optional filtering criteria
            fields: Fields to retrieve (defaults to common metrics)
            limit: Max number of results

        Returns:
            List of insight records
        """
        if not time_range:
            # Default to last 7 days
            today = datetime.now()
            time_range = {
                "since": (today - timedelta(days=7)).strftime("%Y-%m-%d"),
                "until": today.strftime("%Y-%m-%d")
            }

        if not fields:
            fields = [
                "ad_id", "ad_name", "adset_id", "adset_name",
                "campaign_id", "campaign_name",
                "impressions", "clicks", "actions", "spend",
                "ctr", "cpm", "cpc"
            ]

        arguments = {
            "object_id": self.ad_account_id,
            "level": level,
            "time_range": time_range,
            "limit": limit
        }

        if filtering:
            arguments["filtering"] = filtering

        result = self._call_mcp_tool("get_insights", arguments)

        # Parse the response - it may be nested in a "data" key
        if isinstance(result, dict):
            return result.get("data", [result])
        return result

    def parse_lead_actions(self, actions: List[Dict[str, Any]]) -> int:
        """
        Parse lead actions from insights data

        Args:
            actions: List of action dicts from insights

        Returns:
            Total number of leads
        """
        if not actions:
            return 0

        action_map = {a["action_type"]: int(a.get("value", 0)) for a in actions}
        leads = action_map.get("leadgen.other", 0) + action_map.get("onsite_conversion.lead_grouped", 0)
        return leads
