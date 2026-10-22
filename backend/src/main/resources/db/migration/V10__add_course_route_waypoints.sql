ALTER TABLE courses
    ADD COLUMN route_waypoints JSONB;

COMMENT ON COLUMN courses.route_waypoints IS 'GeoJSON LineString containing user-editable course waypoints, separate from routed geometry';
