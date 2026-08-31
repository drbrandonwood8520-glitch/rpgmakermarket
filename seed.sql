-- Sample rows so the storefront isn't empty on first run.
-- Free plugin (download works once you upload a file for it in /admin).
INSERT INTO products (slug, title, summary, description, kind, price_cents, cover_image, sponsored_until)
VALUES
('quest-log-mz', 'Quest Log MZ', 'A clean quest journal for RPG Maker MZ.',
 'Adds a scrollable quest log with categories, objectives, and completion tracking. Plug-and-play.',
 'plugin', 0, 'https://placehold.co/600x400?text=Quest+Log+MZ', datetime('now', '+14 days')),

('battle-sfx-pack', 'Battle SFX Pack Vol.1', '60 royalty-free battle sound effects.',
 'High-quality hits, misses, magic whooshes and UI blips. WAV + OGG included.',
 'asset', 499, 'https://placehold.co/600x400?text=Battle+SFX', NULL),

('name-generator', 'Fantasy Name Generator', 'Roll NPC names in your browser.',
 'A little in-browser tool for generating fantasy names. No download needed.',
 'generator', 0, 'https://placehold.co/600x400?text=Name+Generator', NULL);

UPDATE products SET external_url = '/generators/name-generator/' WHERE slug = 'name-generator';
