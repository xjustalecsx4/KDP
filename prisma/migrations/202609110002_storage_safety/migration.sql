-- Coordinate reference creation with cleanup, including writes outside Prisma.
CREATE FUNCTION guard_file_reference() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE file_state "FileState";
BEGIN
  SELECT state INTO file_state FROM "StoredFile" WHERE id = NEW."fileId" FOR UPDATE;
  IF NOT FOUND OR file_state = 'DELETING' THEN
    RAISE EXCEPTION 'File is unavailable for reference';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER protect_file_reference BEFORE INSERT OR UPDATE OF "fileId"
  ON "FileReference" FOR EACH ROW EXECUTE FUNCTION guard_file_reference();
ALTER TABLE "FileReference" ADD CONSTRAINT exactly_one_file_owner
  CHECK (num_nonnulls("bookAssetId", "contentId", "scheduledPostId", "jobId") = 1);
ALTER TABLE "RenderJob" ADD CONSTRAINT valid_job_attempts
  CHECK ("attemptCount" >= 0 AND "maxAttempts" BETWEEN 1 AND 10);
ALTER TABLE "StoredFile" ADD CONSTRAINT nonnegative_file_size CHECK (bytes >= 0);
