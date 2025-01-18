-- Drop existing tables and indexes if they exist
DROP TABLE IF EXISTS elements;
DROP TABLE IF EXISTS pages;
DROP TABLE IF EXISTS projects;

-- Create tables
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE pages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE elements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    page_id UUID REFERENCES pages(id) ON DELETE CASCADE,
    selector_type TEXT NOT NULL,
    selector_value TEXT NOT NULL,
    action_type TEXT NOT NULL,
    action_value TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create indexes
CREATE INDEX idx_pages_project_id ON pages(project_id);
CREATE INDEX idx_elements_page_id ON elements(page_id); 