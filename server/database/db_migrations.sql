
INSERT INTO technologies (name, description, tech_level_required, cost, tech_code, modifier_value, game_effect, shipstation_kb_link, acquirable, category, emoji)
SELECT 'Advertising Campaign', 'Launch an advertising campaign to increase brand awareness and drive traffic to your store.', 1, 50000, 'advertising_campaign', 1, 'Increase your order volume by 50% for 2 minutes.', '', true, 'Marketing', '📈'
WHERE NOT EXISTS (
    SELECT 1 FROM technologies WHERE tech_code = 'advertising_campaign'
);

-- alter player add new columns
ALTER TABLE player ADD COLUMN IF NOT EXISTS advertising_campaign_start_time TIMESTAMP;