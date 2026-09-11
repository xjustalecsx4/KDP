import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { afterAll, beforeAll, expect, it } from "vitest";
let pg: PGlite;
beforeAll(async () => {
  pg = new PGlite();
  await pg.exec(
    await readFile(
      "prisma/migrations/202609110001_initial/migration.sql",
      "utf8",
    ),
  );
  await pg.exec(
    await readFile(
      "prisma/migrations/202609110002_storage_safety/migration.sql",
      "utf8",
    ),
  );
  await pg.exec(
    await readFile(
      "prisma/migrations/202609110003_content_rendering/migration.sql",
      "utf8",
    ),
  );
  await pg.exec(
    await readFile(
      "prisma/migrations/202609110004_file_order/migration.sql",
      "utf8",
    ),
  );
  await pg.exec(
    await readFile(
      "prisma/migrations/202609110005_kdp_resources/migration.sql",
      "utf8",
    ),
  );
  await pg.exec(`INSERT INTO "Book" (id,title,themes,keywords,"contentAngles","updatedAt") VALUES ('book','Test book','{}','{}','{}',NOW());
    INSERT INTO "BookAsset" (id,"bookId",type,name) VALUES ('asset','book','COVER','Cover');
    INSERT INTO "StoredFile" (id,key,category,bytes,"mimeType") VALUES ('original','books/original.png','BOOK',100,'image/png'),('orphan','generated/orphan.png','IMAGE',100,'image/png');`);
}, 30000);
afterAll(async () => {
  await pg?.close();
});
it("protects a file referenced by a book from deletion", async () => {
  await pg.exec(
    `INSERT INTO "FileReference" (id,"fileId","bookAssetId") VALUES ('ref','original','asset')`,
  );
  await expect(
    pg.exec(`DELETE FROM "StoredFile" WHERE id = 'original'`),
  ).rejects.toThrow();
  const result = await pg.query(
    `SELECT id FROM "StoredFile" WHERE id = 'original'`,
  );
  expect(result.rows).toHaveLength(1);
});
it("blocks attaching a file once cleanup has claimed it", async () => {
  await pg.exec(
    `UPDATE "StoredFile" SET state = 'DELETING' WHERE id = 'orphan'`,
  );
  await expect(
    pg.exec(
      `INSERT INTO "FileReference" (id,"fileId","bookAssetId") VALUES ('late-ref','orphan','asset')`,
    ),
  ).rejects.toThrow("File is unavailable");
});
it("requires exactly one real owner per reference", async () => {
  await expect(
    pg.exec(
      `INSERT INTO "FileReference" (id,"fileId") VALUES ('ownerless','original')`,
    ),
  ).rejects.toThrow();
});
it("protects scheduled post files using the same FK", async () => {
  await pg.exec(`INSERT INTO "ContentItem" (id,"bookId",platform,format,title,"updatedAt") VALUES ('content','book','PINTEREST','IMAGE','Test',NOW());
    INSERT INTO "ScheduledPost" (id,platform,"contentId","scheduledAt","updatedAt") VALUES ('post','PINTEREST','content',NOW(),NOW());
    INSERT INTO "StoredFile" (id,key,category,bytes,"mimeType") VALUES ('scheduled-file','generated/scheduled.png','IMAGE',100,'image/png');
    INSERT INTO "FileReference" (id,"fileId","scheduledPostId") VALUES ('scheduled-ref','scheduled-file','post');`);
  await expect(
    pg.exec(`DELETE FROM "StoredFile" WHERE id = 'scheduled-file'`),
  ).rejects.toThrow();
});
