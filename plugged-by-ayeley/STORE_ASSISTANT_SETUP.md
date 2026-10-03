# Ayeley Store Assistant — Setup

This is the first, non-LLM version of the Plugged by Ayeley assistant.
It runs in the frontend as a chat widget and uses a Supabase Edge Function
as the secure backend. It does NOT require OpenAI or Gemini billing.

## 1. Database rate-limit migration

Run:

`supabase/sql/store_assistant_rate_limit.sql`

in Supabase SQL Editor.

## 2. Deploy the backend

Deploy:

`supabase/functions/store-assistant/index.ts`

as the Edge Function named:

`store-assistant`

No AI key is needed.

The function uses the Supabase service role key only inside the Edge Function.

## 3. Frontend

`src/components/AgentChat.jsx` is already wired to call:

`store-assistant`

The existing `Layout.jsx` already renders `<AgentChat />`, so the assistant
appears on customer-facing pages without changing the rest of the site.

## 4. Production behavior

The assistant can:
- search the live product catalog
- show current prices
- show stock availability
- explain delivery
- explain payment options
- link customers to order tracking
- answer common store questions

It does not use a generative AI model yet.

## 5. Later AI upgrade

The chat UI can stay the same. The backend can later be upgraded so the
same `store-assistant` function calls Gemini/OpenAI while still reading the
same live Supabase product/store data.
