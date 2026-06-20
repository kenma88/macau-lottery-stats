CREATE TABLE IF NOT EXISTS metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS records (
  issue TEXT PRIMARY KEY,
  draw_date TEXT NOT NULL,
  regular_json TEXT NOT NULL,
  special INTEGER NOT NULL,
  zodiacs_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS project_values (
  issue TEXT NOT NULL,
  project_id TEXT NOT NULL,
  value TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (issue, project_id)
);

CREATE INDEX IF NOT EXISTS idx_projects_sort_order ON projects(sort_order ASC);
CREATE INDEX IF NOT EXISTS idx_records_issue ON records(issue DESC);
CREATE INDEX IF NOT EXISTS idx_project_values_project_id ON project_values(project_id);
