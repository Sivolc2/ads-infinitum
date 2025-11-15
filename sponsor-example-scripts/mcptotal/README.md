# MCPTotal Integration Example

MCPTotal is an infrastructure layer for Model Context Protocol (MCP) that provides a secure hub and gateway for hosting and orchestrating multiple MCP servers.

## What is MCPTotal?

MCPTotal acts as:
- **Hub**: Centralized management for deploying and hosting MCP servers
- **Gateway**: Secure access point that handles authentication, routing, and guardrails
- **Orchestrator**: Enables LLM/agents to use tools across multiple MCP servers seamlessly

## Setup Instructions

### 1. Sign Up for MCPTotal

1. Visit [mcptotal.io](https://mcptotal.io)
2. Create an account and obtain your API token
3. Set up your workspace/space URL

### 2. Configure Environment Variables

Create a `.env` file in your project root:

```env
MCPTOTAL_API_TOKEN=your_token_here
MCPTOTAL_SPACE_URL=https://your-space.mcptotal.io
```

### 3. Deploy MCP Servers to MCPTotal Hub

Through the MCPTotal dashboard, deploy or connect the following MCP servers:

- **Raindrop MCP**: For SmartMemory and AI model access
- **Daft MCP**: For analytics and data processing (if available)
- **Filesystem MCP**: For file operations
- **Custom Marketing MCP**: Your custom ad optimization tools

### 4. Configure Your MCP Client

Use the provided `mcp-config.json` to connect your MCP client (Claude Desktop, Claude Code, or custom client) to the MCPTotal gateway.

Copy `mcp-config.json` to your MCP client configuration directory:
- **Claude Desktop (macOS)**: `~/Library/Application Support/Claude/`
- **Claude Code**: `.mcp/config.json` in your project
- **Custom Client**: As specified by your MCP client implementation

### 5. Using with Claude Desktop

1. Copy `mcp-config.json` to `~/Library/Application Support/Claude/config.json`
2. Replace `${MCPTOTAL_API_TOKEN}` with your actual token
3. Update `<your-space>` with your MCPTotal space URL
4. Restart Claude Desktop
5. You should now see MCP tools available in Claude Desktop

### 6. Using with Custom TypeScript Client

See `custom-client-example.ts` for an example of how to:
- Load the MCP configuration
- Connect to MCPTotal-hosted servers
- Make tool calls across multiple MCP servers
- Handle authentication and routing

## Architecture

```
┌─────────────────────┐
│   Your Application  │
│  (Agent/Frontend)   │
└──────────┬──────────┘
           │
           │ MCP Protocol
           │
┌──────────▼──────────┐
│  MCPTotal Gateway   │
│  (Auth + Routing)   │
└──────────┬──────────┘
           │
    ┌──────┴──────┐
    │             │
┌───▼───┐   ┌────▼────┐   ┌─────────┐
│Raindrop│   │  Daft   │   │ Custom  │
│  MCP   │   │   MCP   │   │Marketing│
└────────┘   └─────────┘   └─────────┘
```

## Benefits for Ads Infinitum

1. **Unified Tool Surface**: Access Raindrop AI, Daft analytics, and custom tools through one gateway
2. **Security**: MCPTotal handles authentication and access control
3. **Scalability**: Add new MCP servers without changing client code
4. **Monitoring**: Track tool usage and performance through MCPTotal dashboard
5. **Version Management**: Deploy and rollback MCP server versions easily

## Integration with Other Sponsors

- **Raindrop**: Host your Raindrop MCP server through MCPTotal for SmartMemory and AI access
- **Daft**: Connect Daft MCP for parallel prompt engineering and analytics
- **Freepik**: Create a custom MCP server wrapper for Freepik API and host through MCPTotal
- **Lovable**: Build a Lovable MCP server to programmatically generate campaign sites

## Next Steps

1. Set up your MCPTotal account
2. Deploy the Raindrop MCP server (highest priority)
3. Test the connection using the example client
4. Integrate into your Ads Infinitum orchestrator agent

## Resources

- [MCPTotal Documentation](https://mcptotal.io/docs)
- [MCP Protocol Specification](https://modelcontextprotocol.io)
- [Raindrop MCP Guide](https://raindrop.dev/docs/mcp)
