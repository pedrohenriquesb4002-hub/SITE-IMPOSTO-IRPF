import mysql from 'mysql2/promise';

const sql = `
CREATE TABLE IF NOT EXISTS \`quotaTracking\` (
	\`id\` int AUTO_INCREMENT NOT NULL,
	\`quotaId\` int NOT NULL,
	\`cotaNumero\` int NOT NULL,
	\`dataEnvio\` timestamp NOT NULL DEFAULT (now()),
	\`createdAt\` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT \`quotaTracking_id\` PRIMARY KEY(\`id\`)
);

ALTER TABLE \`quotas\` ADD COLUMN IF NOT EXISTS \`cotasEnviadas\` int DEFAULT 0 NOT NULL;

ALTER TABLE \`quotaTracking\` ADD CONSTRAINT \`quotaTracking_quotaId_quotas_id_fk\` FOREIGN KEY (\`quotaId\`) REFERENCES \`quotas\`(\`id\`) ON DELETE no action ON UPDATE no action;

CREATE INDEX IF NOT EXISTS \`idx_quota_tracking_quota_id\` ON \`quotaTracking\` (\`quotaId\`);
`;

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const connection = await mysql.createConnection(dbUrl);

try {
  // Split by statement-breakpoint and execute each
  const statements = sql.split(';').filter(s => s.trim());
  for (const statement of statements) {
    if (statement.trim()) {
      console.log('Executing:', statement.trim().substring(0, 50) + '...');
      await connection.execute(statement);
    }
  }
  console.log('✅ Migration applied successfully!');
} catch (error) {
  console.error('❌ Migration failed:', error.message);
  process.exit(1);
} finally {
  await connection.end();
}
