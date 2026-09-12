INSERT INTO sources (id, name, base_url, source_type, parser_type, enabled)
VALUES
  ('hackcmu-2026-fixture', 'HackCMU 2026 Opening Ceremony (fixture)', 'fixture://hackcmu-2026/opening-ceremony.txt', 'pdf', 'fixture', true),
  ('scottybites-demo-seed', 'ScottyBites demo seed', 'fixture://demo-seed', 'manual', 'fixture', true),
  ('cmu-events', 'CMU Events (public)', 'https://events.cmu.edu/', 'official_calendar', 'html', true),
  ('scs-events', 'School of Computer Science events (public)', 'https://www.cs.cmu.edu/calendar', 'department', 'html', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO buildings (id, name, short_name, aliases, latitude, longitude, campus_zone, off_campus, geojson_feature_id, height_meters)
VALUES
  ('ghc', 'Gates Hillman Center', 'GHC', ARRAY['ghc','gates','gates hillman','gates center','hillman'], 40.44385, -79.94455, 'morewood', false, 'ghc', 42),
  ('tepper', 'Tepper Quad', 'Tepper', ARRAY['tepper','tep','tepper quad','simmons','simmons auditorium'], 40.44125, -79.94195, 'forbes', false, 'tepper', 28),
  ('cuc', 'Cohon University Center', 'CUC', ARRAY['cuc','cohon','university center','rangos'], 40.44295, -79.94175, 'cut', false, 'cuc', 22),
  ('wean', 'Wean Hall', 'Wean', ARRAY['wean','weh','wean hall'], 40.44265, -79.94585, 'morewood', false, 'wean', 36),
  ('doherty', 'Doherty Hall', 'DH', ARRAY['doherty','dh','doherty hall'], 40.44248, -79.94440, 'morewood', false, 'doherty', 30),
  ('hunt', 'Hunt Library', 'Hunt', ARRAY['hunt','hl','hunt library'], 40.44110, -79.94370, 'cut', false, 'hunt', 46),
  ('nsh', 'Newell-Simon Hall', 'NSH', ARRAY['nsh','newell-simon','newell simon hall'], 40.44350, -79.94565, 'morewood', false, 'nsh', 32),
  ('hamburg', 'Hamburg Hall', 'HBH', ARRAY['hamburg','hbh','hamburg hall'], 40.44422, -79.94505, 'morewood', false, 'hamburg', 24),
  ('posner', 'Posner Hall', 'Posner', ARRAY['posner','posner hall'], 40.44115, -79.94285, 'forbes', false, 'posner', 20),
  ('craig', 'Craig Street (off campus)', 'Craig', ARRAY['craig','craig street','off campus'], 40.44585, -79.94915, 'off_campus', true, 'craig', 12)
ON CONFLICT (id) DO NOTHING;
