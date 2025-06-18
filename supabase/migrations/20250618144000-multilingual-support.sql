
-- Add multilingual support for checklist items
ALTER TABLE checklist_items 
ADD COLUMN description_ko TEXT,
ADD COLUMN description_en TEXT,
ADD COLUMN description_zh TEXT,
ADD COLUMN description_ja TEXT;

-- Update existing Korean descriptions to the new Korean column
UPDATE checklist_items 
SET description_ko = description;

-- Add comment for clarity
COMMENT ON COLUMN checklist_items.description_ko IS 'Korean description';
COMMENT ON COLUMN checklist_items.description_en IS 'English description';
COMMENT ON COLUMN checklist_items.description_zh IS 'Chinese description';
COMMENT ON COLUMN checklist_items.description_ja IS 'Japanese description';
