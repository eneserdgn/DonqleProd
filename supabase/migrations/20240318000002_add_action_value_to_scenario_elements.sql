-- Add action_value column to scenario_elements table
ALTER TABLE scenario_elements ADD COLUMN IF NOT EXISTS action_value text;

-- Set default value for existing rows
UPDATE scenario_elements SET action_value = '' WHERE action_value IS NULL; 