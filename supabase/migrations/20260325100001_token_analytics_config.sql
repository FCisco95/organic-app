-- Add token analytics configuration (LP vault exclusions, DexScreener pair) to orgs table.
-- Admins can manage these from Settings > Token tab.

ALTER TABLE orgs
  ADD COLUMN IF NOT EXISTS token_analytics_config JSONB NOT NULL DEFAULT '{
    "lp_vault_exclusions": [],
    "dexscreener_pair": null
  }'::jsonb;

COMMENT ON COLUMN orgs.token_analytics_config IS
  'Token analytics settings: LP vault addresses to exclude from holder distribution, DexScreener pair address for chart embed.';
