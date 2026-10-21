DROP TABLE IF EXISTS course_facilities;
ALTER TABLE courses
    DROP COLUMN IF EXISTS facility_source,
    DROP COLUMN IF EXISTS facilities_checked_at;
DROP TYPE IF EXISTS course_facility_type;
