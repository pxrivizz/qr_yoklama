-- Preserve every user's current role while moving from a single enum value
-- to a PostgreSQL enum array. The GIN index keeps role membership queries fast.
ALTER TABLE "User"
ADD COLUMN "roles" "UserRole"[] NOT NULL DEFAULT ARRAY['STUDENT']::"UserRole"[];

UPDATE "User"
SET "roles" = ARRAY["role"]::"UserRole"[];

-- Known multi-role accounts. Keeping this in the same migration makes the
-- deployed authorization state atomic with the schema change.
UPDATE "User"
SET "roles" = ARRAY['ADMIN', 'STUDENT']::"UserRole"[]
WHERE LOWER("email") = 'halilciftci39@gmail.com';

UPDATE "User"
SET "roles" = ARRAY['ADMIN', 'TEACHER']::"UserRole"[]
WHERE LOWER("email") = 'guncelsariman@mu.edu.tr';

DROP INDEX "User_role_idx";

ALTER TABLE "User"
DROP COLUMN "role";

CREATE INDEX "User_roles_idx" ON "User" USING GIN ("roles");
