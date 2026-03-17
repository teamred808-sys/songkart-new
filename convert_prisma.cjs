const fs = require('fs');

let schema = fs.readFileSync('backend/prisma/schema.prisma', 'utf8');

// Change provider
schema = schema.replace(/provider = "postgresql"/g, 'provider = "mysql"');

// Replace @default(dbgenerated("gen_random_uuid()")) with @default(uuid())
schema = schema.replace(/@default\(dbgenerated\("gen_random_uuid\(\)"\)\)/g, '@default(uuid())');

// Remove PostgreSQL specific attributes
schema = schema.replace(/@db\.Uuid/g, '@db.Char(36)'); // Using Char(36) for UUID in MySQL
schema = schema.replace(/@db\.Timestamptz\(6\)/g, '');
schema = schema.replace(/@db\.Timestamp\(6\)/g, '');

// Clean up weird Decimal definitions where it's missing @db.
schema = schema.replace(/Decimal\?\s+\(\s*(\d+),\s*(\d+)\s*\)/g, 'Decimal? @db.Decimal($1, $2)');
schema = schema.replace(/Decimal\s+\(\s*(\d+),\s*(\d+)\s*\)/g, 'Decimal @db.Decimal($1, $2)');
schema = schema.replace(/Decimal\s+@default\(0\)\s+\(\s*(\d+),\s*(\d+)\s*\)/g, 'Decimal @default(0) @db.Decimal($1, $2)');
schema = schema.replace(/Decimal\?\s+@default\(0\)\s+\(\s*(\d+),\s*(\d+)\s*\)/g, 'Decimal? @default(0) @db.Decimal($1, $2)');
schema = schema.replace(/Decimal\?\s+@default\(500\)\s+\(\s*(\d+),\s*(\d+)\s*\)/g, 'Decimal? @default(500) @db.Decimal($1, $2)');

// Final pass for any hanging " (X, Y)" after Decimal
schema = schema.replace(/Decimal\s+@default\(0\)\s+\(10,\s*2\)/g, 'Decimal @default(0) @db.Decimal(10, 2)');
schema = schema.replace(/Decimal\?\s+@default\(0\)\s+\(10,\s*2\)/g, 'Decimal? @default(0) @db.Decimal(10, 2)');
schema = schema.replace(/Decimal\?\s+@default\(0\)\s+\(2,\s*1\)/g, 'Decimal? @default(0) @db.Decimal(2, 1)');
schema = schema.replace(/Decimal\?\s+\(5,\s*2\)/g, 'Decimal? @db.Decimal(5, 2)');
schema = schema.replace(/Decimal\?\s+\(10,\s*2\)/g, 'Decimal? @db.Decimal(10, 2)');
schema = schema.replace(/Decimal\s+\(10,\s*2\)/g, 'Decimal @db.Decimal(10, 2)');
schema = schema.replace(/Decimal\s+\(5,\s*2\)/g, 'Decimal @db.Decimal(5, 2)');

// Remove index with sort parameter
schema = schema.replace(/@@index\(\[average_rating\(sort: Desc\)\], map: "idx_songs_average_rating"\)/g, '@@index([average_rating], map: "idx_songs_average_rating")');
schema = schema.replace(/@@index\(\[created_at\(sort: Desc\)\], map: "idx_transactions_created_at"\)/g, '@@index([created_at], map: "idx_transactions_created_at")');
schema = schema.replace(/@@index\(\[created_at\(sort: Desc\)\], map: "idx_songs_created_at"\)/g, '@@index([created_at], map: "idx_songs_created_at")');

// MySQL doesn't support arrays
schema = schema.replace(/String\[\]/g, 'Json');

// Also remove @default([]) for Json fields since MySQL doesn't support array defaults directly in schema
schema = schema.replace(/Json\s+@default\(\[\]\)/g, 'Json @default("[]")');

// PostgreSQL syntax for intervals is not supported in MySQL
// Remove all occurrences of @default(dbgenerated("...")) that use ::interval or interval
schema = schema.replace(/@default\(dbgenerated\("\(\s*now\(\)\s*\+\s*'10\s*minutes'::interval\s*\)"\)\)/g, '');
schema = schema.replace(/@default\(dbgenerated\("\(\s*now\(\)\s*\+\s*'10\s*minute'::interval\s*\)"\)\)/g, '');
schema = schema.replace(/@default\(dbgenerated\("[^"]*interval[^"]*"\)\)/g, ''); // Catch any other intervals

fs.writeFileSync('backend/prisma/schema.mysql.prisma', schema);
console.log("Schema converted to MySQL format");
