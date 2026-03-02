#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

const API_BASE = "https://crewhaus.ai/api/v1";

// Service definitions (mirrored from crewhaus-site/src/lib/services.ts)
const SERVICES = {
  signal: {
    name: "Signal Check",
    price: 49,
    deliveryHours: 2,
    description:
      "Quick market viability assessment. Go/no-go signal with market size, competitors, and demand evidence.",
  },
  scan: {
    name: "Opportunity Scan",
    price: 99,
    deliveryHours: 4,
    description:
      "Deep market research and opportunity identification based on your skills and interests.",
  },
  spec: {
    name: "MVP Specification",
    price: 149,
    deliveryHours: 8,
    description:
      "Complete MVP spec with market research, UX design, validation plan, and tech architecture.",
  },
  sprint: {
    name: "Full Sprint",
    price: 799,
    deliveryHours: 24,
    description:
      "End-to-end product sprint: research, design, validation, PM, engineering, ops, and growth.",
  },
} as const;

type TierKey = keyof typeof SERVICES;

const server = new Server(
  {
    name: "crewhaus-validation",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_services",
        description:
          "Get CrewHaus service catalog with pricing, delivery times, and affiliate program details. Call this first to understand what's available.",
        inputSchema: {
          type: "object" as const,
          properties: {},
        },
      },
      {
        name: "validate_idea",
        description:
          "Submit a startup idea for professional validation by CrewHaus's 9-agent AI crew. Returns an order ID and payment link. The human will need to complete payment via the link.",
        inputSchema: {
          type: "object" as const,
          properties: {
            idea: {
              type: "string",
              description: "The startup idea to validate (1-2 sentences)",
            },
            tier: {
              type: "string",
              enum: ["signal", "scan", "spec", "sprint"],
              description:
                "Service tier. signal=$49 (2h), scan=$99 (4h), spec=$149 (8h), sprint=$799 (24h). Default: signal",
            },
            customer_name: {
              type: "string",
              description: "Customer's name",
            },
            customer_email: {
              type: "string",
              description: "Customer's email for delivery",
            },
            audience: {
              type: "string",
              description: "Target audience for the idea (optional)",
            },
            url: {
              type: "string",
              description:
                "URL of existing product/landing page if any (optional)",
            },
            affiliate_code: {
              type: "string",
              description:
                "Affiliate referral code for commission attribution (optional)",
            },
          },
          required: ["idea", "customer_name", "customer_email"],
        },
      },
      {
        name: "register_affiliate",
        description:
          "Register as a CrewHaus affiliate to earn 25% commission on referred orders. Works for both human and AI agent affiliates. Returns a unique referral code.",
        inputSchema: {
          type: "object" as const,
          properties: {
            name: {
              type: "string",
              description:
                "Name of the affiliate (person or agent name)",
            },
            email: {
              type: "string",
              description:
                "Email of the affiliate operator (for payout communication)",
            },
            type: {
              type: "string",
              enum: ["human", "agent"],
              description: "Whether this is a human or AI agent affiliate",
            },
            webhook: {
              type: "string",
              description:
                "Webhook URL to receive conversion notifications (optional)",
            },
          },
          required: ["name", "email"],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "get_services": {
      const tiers = Object.entries(SERVICES).map(([id, s]) => ({
        id,
        ...s,
        commission: `$${(s.price * 0.25).toFixed(2)} (25%)`,
      }));

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                provider: "CrewHaus",
                description:
                  "AI-powered startup idea validation by a 9-agent crew. Market research, competitive analysis, UX design, technical specs, and go/no-go signals.",
                website: "https://crewhaus.ai",
                tiers,
                affiliate: {
                  commission: "25% per sale",
                  signup: "Use the register_affiliate tool to get your referral code",
                },
                apiDocs: "https://crewhaus.ai/docs/api",
              },
              null,
              2
            ),
          },
        ],
      };
    }

    case "validate_idea": {
      const a = args as Record<string, string>;
      const tier = (a.tier ?? "signal") as string;

      if (!SERVICES[tier as TierKey]) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Invalid tier "${tier}". Valid options: signal ($49), scan ($99), spec ($149), sprint ($799).`,
            },
          ],
          isError: true,
        };
      }

      try {
        const res = await fetch(`${API_BASE}/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tier,
            customer: { name: a.customer_name, email: a.customer_email },
            idea: {
              description: a.idea,
              audience: a.audience,
              url: a.url,
            },
            affiliate: a.affiliate_code
              ? { code: a.affiliate_code }
              : undefined,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Error submitting order: ${data.error ?? res.statusText}`,
              },
            ],
            isError: true,
          };
        }

        const service = SERVICES[tier as TierKey];
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  success: true,
                  orderId: data.orderId,
                  tier: service.name,
                  price: `$${service.price}`,
                  paymentUrl: data.paymentUrl,
                  estimatedDelivery: `${service.deliveryHours} hours after payment`,
                  message: data.paymentUrl
                    ? `Order created! The customer needs to complete payment at: ${data.paymentUrl}`
                    : `Order submitted. Payment will be arranged separately.`,
                  affiliate: data.affiliate ?? null,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (e) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Network error contacting CrewHaus API: ${e instanceof Error ? e.message : String(e)}`,
            },
          ],
          isError: true,
        };
      }
    }

    case "register_affiliate": {
      const a = args as Record<string, string>;

      try {
        const res = await fetch(`${API_BASE}/affiliate/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: a.name,
            email: a.email,
            type: a.type ?? "agent",
            webhook: a.webhook,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Error registering affiliate: ${data.error ?? res.statusText}`,
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  success: true,
                  affiliateId: data.affiliateId,
                  referralCode: data.code,
                  referralUrl: data.referralUrl,
                  message: `Registered! Use referral code "${data.code}" when submitting orders via validate_idea to earn 25% commission.`,
                  commissionPerTier: data.terms?.perTier ?? null,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (e) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Network error: ${e instanceof Error ? e.message : String(e)}`,
            },
          ],
          isError: true,
        };
      }
    }

    default:
      return {
        content: [
          {
            type: "text" as const,
            text: `Unknown tool: ${name}`,
          },
        ],
        isError: true,
      };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("CrewHaus MCP server started");
}

main().catch((e) => {
  console.error("Failed to start:", e);
  process.exit(1);
});
