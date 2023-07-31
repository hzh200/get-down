CREATE TABLE "sequence" (
  "sequence_no" INTEGER PRIMARY KEY AUTOINCREMENT,
  "task_no" INTEGER NOT NULL,
  "task_type" VARCHAR(255) NOT NULL,
  "created_at" DATETIME NOT NULL,
  "updated_at" DATETIME NOT NULL
);
INSERT INTO "sqlite_sequence" (name, seq) VALUES ('sequence', '8');

CREATE TABLE "sqlite_sequence" (
  "name",
  "seq"
);

CREATE TABLE "task_sets" (
  "task_no" INTEGER PRIMARY KEY AUTOINCREMENT,
  "name" VARCHAR(255) NOT NULL,
  "size" INTEGER,
  "url" VARCHAR(255) NOT NULL,
  "status" VARCHAR(255) NOT NULL,
  "progress" INTEGER NOT NULL,
  "location" VARCHAR(255) NOT NULL,
  "extractor_no" INTEGER NOT NULL,
  "children" JSON NOT NULL,
  "created_at" DATETIME NOT NULL,
  "updated_at" DATETIME NOT NULL
);
INSERT INTO "sqlite_sequence" (name, seq) VALUES ('task_sets', '2');

CREATE TABLE "tasks" (
  "task_no" INTEGER PRIMARY KEY AUTOINCREMENT,
  "name" VARCHAR(255) NOT NULL,
  "size" INTEGER,
  "type" VARCHAR(255) NOT NULL,
  "url" VARCHAR(255) NOT NULL,
  "status" VARCHAR(255) NOT NULL,
  "progress" INTEGER NOT NULL,
  "location" VARCHAR(255) NOT NULL,
  "extractor_no" INTEGER NOT NULL,
  "download_url" VARCHAR(255) NOT NULL,
  "published_timestamp" VARCHAR(255) NOT NULL,
  "sub_type" VARCHAR(255) NOT NULL,
  "charset" VARCHAR(255),
  "download_type" INTEGER NOT NULL,
  "download_ranges" JSON,
  "parent" INTEGER,
  "additional_info" VARCHAR(255),
  "created_at" DATETIME NOT NULL,
  "updated_at" DATETIME NOT NULL
);
INSERT INTO "sqlite_sequence" (name, seq) VALUES ('tasks', '6');

