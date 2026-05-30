-- Per-session acknowledgment before sending data to hosted providers (hosted_per_session mode).
ALTER TABLE sessions ADD COLUMN hosted_data_acknowledged INTEGER NOT NULL DEFAULT 0;
