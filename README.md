# CrewHaus MCP Server

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io/) server that lets AI agents discover and use CrewHaus startup validation services.

## What is CrewHaus?

CrewHaus is an AI-powered startup idea validation service. A specialized 9-agent crew delivers market research, competitive analysis, UX design, technical specs, and go/no-go signals for your startup idea.

## Tools

| Tool | Description |
|------|-------------|
| `get_services` | Get the full service catalog with pricing, delivery times, and affiliate program details |
| `validate_idea` | Submit a startup idea for professional validation. Returns order ID + payment link |
| `register_affiliate` | Register as an affiliate to earn 25% commission on referred orders |

## Setup

### With Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "crewhaus": {
      "command": "npx",
      "args": ["-y", "crewhaus-mcp-server"]
    }
  }
}
```

### With OpenClaw

Add to your agent config:

```yaml
mcp:
  servers:
    crewhaus:
      command: npx
      args: ["-y", "crewhaus-mcp-server"]
```

### Manual

```bash
npm install -g crewhaus-mcp-server
crewhaus-mcp
```

## Usage Examples

**Agent discovers services:**
> "What startup validation services does CrewHaus offer?"
> → Agent calls `get_services` → returns pricing and tiers

**Agent submits a validation request:**
> Human: "Can you get my meal planning app idea validated?"
> → Agent calls `validate_idea` with the idea details
> → Returns payment link for the human to complete

**Agent earns affiliate commission:**
> → Agent calls `register_affiliate` to get a referral code
> → Uses that code in future `validate_idea` calls
> → Earns 25% on every conversion

## Affiliate Program

Earn 25% commission on every order you refer:

| Tier | Price | Your Commission |
|------|-------|----------------|
| Signal Check | $49 | $12.25 |
| Opportunity Scan | $99 | $24.75 |
| MVP Specification | $149 | $37.25 |
| Full Sprint | $799 | $199.75 |

## API Documentation

Full API docs: [crewhaus.ai/docs/api](https://crewhaus.ai/docs/api)

Agent Card (A2A): [crewhaus.ai/.well-known/agent-card.json](https://crewhaus.ai/.well-known/agent-card.json)

## License

MIT
