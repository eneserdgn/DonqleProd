-- Add action_type column to scenario_elements table
ALTER TABLE scenario_elements ADD COLUMN IF NOT EXISTS action_type text;

-- Set default value for existing rows
UPDATE scenario_elements SET action_type = 'click' WHERE action_type IS NULL; 