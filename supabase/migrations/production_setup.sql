-- Projects Table
create table if not exists projects (
    id uuid default gen_random_uuid() primary key,
    name text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Pages Table
create table if not exists pages (
    id uuid default gen_random_uuid() primary key,
    name text not null,
    project_id uuid references projects(id) on delete cascade,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Elements Table
create table if not exists elements (
    id uuid default gen_random_uuid() primary key,
    name text not null,
    page_id uuid references pages(id) on delete cascade,
    selector_type text not null,
    selector_value text not null,
    action_type text,
    action_value text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Features Table
create table if not exists features (
    id uuid default gen_random_uuid() primary key,
    name text not null,
    parent_feature_id uuid references features(id) on delete cascade,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Scenarios Table
create table if not exists scenarios (
    id uuid default gen_random_uuid() primary key,
    name text not null,
    feature_id uuid references features(id) on delete cascade,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Scenario Elements Table
create table if not exists scenario_elements (
    id uuid default gen_random_uuid() primary key,
    scenario_id uuid references scenarios(id) on delete cascade,
    element_name text not null,
    action_type text,
    action_value text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create indexes for better performance
create index if not exists pages_project_id_idx on pages(project_id);
create index if not exists elements_page_id_idx on elements(page_id);
create index if not exists features_parent_feature_id_idx on features(parent_feature_id);
create index if not exists scenarios_feature_id_idx on scenarios(feature_id);
create index if not exists scenario_elements_scenario_id_idx on scenario_elements(scenario_id); 