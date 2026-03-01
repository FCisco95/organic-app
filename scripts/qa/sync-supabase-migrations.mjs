import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const HELP_TEXT = `
Usage:
  node scripts/qa/sync-supabase-migrations.mjs --project-ref <ref> [options]

Options:
  --project-ref <ref>           Supabase project ref (or use SUPABASE_PROJECT_REF env)
  --apply                       Apply local-only migrations directly via Supabase Management API
  --allow-equivalent-errors     Treat known drift-equivalent SQL errors as already applied
  --record-applied              Record processed local versions in schema_migrations
  --skip-record-applied         Do not write schema_migrations entries after apply
  --reload-postgrest            Run NOTIFY pgrst, 'reload schema' after apply
  --strict-remote-only          Exit non-zero if remote has versions missing locally
  --help                        Show this help text

Environment:
  SUPABASE_ACCESS_TOKEN         Required Supabase Management API token
  SUPABASE_PROJECT_REF          Optional fallback for --project-ref
`;

const MIGRATION_FILE_PATTERN = /^(\d{14})_(.+)\.sql$/;

const argv = process.argv.slice(2);

if (argv.includes('--help')) {
  console.log(HELP_TEXT.trim());
  process.exit(0);
}

function hasFlag(flag) {
  return argv.includes(flag);
}

function getArg(flag) {
  const index = argv.indexOf(flag);
  if (index === -1) return undefined;
  return argv[index + 1];
}

const projectRef = getArg('--project-ref') ?? process.env.SUPABASE_PROJECT_REF;
const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
const applyMigrations = hasFlag('--apply');
const allowEquivalentErrors = hasFlag('--allow-equivalent-errors');
const strictRemoteOnly = hasFlag('--strict-remote-only');
const skipRecordApplied = hasFlag('--skip-record-applied');
const shouldRecordApplied = hasFlag('--record-applied') || (applyMigrations && !skipRecordApplied);
const reloadPostgrest = hasFlag('--reload-postgrest');

if (!projectRef) {
  console.error('Missing --project-ref (or SUPABASE_PROJECT_REF env).');
  process.exit(1);
}

if (!accessToken) {
  console.error('Missing SUPABASE_ACCESS_TOKEN env.');
  process.exit(1);
}

const migrationsDir = resolve(process.cwd(), 'supabase', 'migrations');
const apiUrl = `https://api.supabase.com/v1/projects/${projectRef}/database/query`;

function sqlLiteral(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function uniqueSorted(values) {
  return [...new Set(values)].sort();
}

function isEquivalentDriftError(message) {
  const checks = [
    /already exists/i,
    /duplicate key value violates unique constraint/i,
    /duplicate object/i,
    /cannot drop columns from view/i,
    /cannot change name of view column/i,
    /cannot drop view .* because other objects depend on it/i,
    /enum label .* already exists/i,
  ];
  return checks.some((check) => check.test(message));
}

async function querySql(query) {
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });

  const rawBody = await response.text();
  let parsedBody = null;

  try {
    parsedBody = JSON.parse(rawBody);
  } catch {
    throw new Error(`Management API returned non-JSON response (HTTP ${response.status}): ${rawBody}`);
  }

  if (!response.ok) {
    const apiMessage =
      parsedBody && typeof parsedBody === 'object' && 'message' in parsedBody
        ? parsedBody.message
        : JSON.stringify(parsedBody);
    throw new Error(`Management API HTTP ${response.status}: ${apiMessage}`);
  }

  if (parsedBody && typeof parsedBody === 'object' && !Array.isArray(parsedBody) && 'message' in parsedBody) {
    throw new Error(String(parsedBody.message));
  }

  if (!Array.isArray(parsedBody)) {
    throw new Error(`Unexpected SQL response payload: ${JSON.stringify(parsedBody)}`);
  }

  return parsedBody;
}

async function loadLocalMigrations() {
  const filenames = await readdir(migrationsDir);
  const migrations = [];

  for (const filename of filenames) {
    const match = MIGRATION_FILE_PATTERN.exec(filename);
    if (!match) continue;

    const [, version, nameWithoutExt] = match;
    const absolutePath = resolve(migrationsDir, filename);
    migrations.push({
      version,
      name: nameWithoutExt,
      filename,
      path: absolutePath,
    });
  }

  migrations.sort((a, b) => a.version.localeCompare(b.version));
  return migrations;
}

async function fetchRemoteVersions() {
  const rows = await querySql(
    'select version from supabase_migrations.schema_migrations order by version;'
  );
  return uniqueSorted(rows.map((row) => String(row.version)));
}

function buildVersionSet(items) {
  return new Set(items.map((item) => item.version));
}

function summarizeDiff(localMigrations, remoteVersions) {
  const localVersions = localMigrations.map((migration) => migration.version);
  const localSet = new Set(localVersions);
  const remoteSet = new Set(remoteVersions);

  const localOnly = localMigrations.filter((migration) => !remoteSet.has(migration.version));
  const remoteOnly = remoteVersions.filter((version) => !localSet.has(version));

  return {
    localOnly,
    remoteOnly,
  };
}

async function applyLocalOnlyMigrations(localOnly) {
  const processed = [];

  for (const migration of localOnly) {
    const sql = await readFile(migration.path, 'utf8');

    try {
      await querySql(sql);
      processed.push({
        ...migration,
        status: 'applied',
      });
      console.log(`APPLIED   ${migration.version} ${migration.filename}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      if (allowEquivalentErrors && isEquivalentDriftError(message)) {
        processed.push({
          ...migration,
          status: 'equivalent',
          error: message,
        });
        console.log(`EQUIV     ${migration.version} ${migration.filename}`);
        continue;
      }

      throw new Error(
        `Migration failed at ${migration.version} (${migration.filename}): ${message}`
      );
    }
  }

  return processed;
}

async function recordAppliedVersions(processed) {
  if (processed.length === 0) return;

  const values = processed
    .map((migration) => `(${sqlLiteral(migration.version)}, ${sqlLiteral(migration.name)})`)
    .join(',\n  ');

  const sql = `
insert into supabase_migrations.schema_migrations (version, name)
values
  ${values}
on conflict (version) do nothing;
`;

  await querySql(sql);
}

async function run() {
  const localMigrations = await loadLocalMigrations();
  if (localMigrations.length === 0) {
    throw new Error(`No migrations found in ${migrationsDir}`);
  }

  const initialRemoteVersions = await fetchRemoteVersions();
  const initialDiff = summarizeDiff(localMigrations, initialRemoteVersions);

  console.log(`Project ref: ${projectRef}`);
  console.log(`Local migrations: ${localMigrations.length}`);
  console.log(`Remote migration versions: ${initialRemoteVersions.length}`);
  console.log(`Missing on remote (local-only): ${initialDiff.localOnly.length}`);
  console.log(`Missing locally (remote-only): ${initialDiff.remoteOnly.length}`);

  if (initialDiff.remoteOnly.length > 0) {
    console.log('Remote-only versions (first 25):');
    for (const version of initialDiff.remoteOnly.slice(0, 25)) {
      console.log(`  - ${version}`);
    }
  }

  if (!applyMigrations) {
    if (initialDiff.localOnly.length > 0) {
      console.error('Remote is missing local migrations. Re-run with --apply to sync.');
      process.exit(2);
    }

    if (strictRemoteOnly && initialDiff.remoteOnly.length > 0) {
      console.error('Remote has migration versions not present locally.');
      process.exit(3);
    }

    console.log('Migration check passed (dry run).');
    return;
  }

  const processed = await applyLocalOnlyMigrations(initialDiff.localOnly);
  const processedVersions = buildVersionSet(processed);

  if (shouldRecordApplied && processed.length > 0) {
    await recordAppliedVersions(processed);
    console.log(`Recorded ${processed.length} versions in schema_migrations.`);
  }

  if (reloadPostgrest) {
    await querySql("NOTIFY pgrst, 'reload schema';");
    console.log('PostgREST schema cache reload sent.');
  }

  const finalRemoteVersions = await fetchRemoteVersions();
  const finalDiff = summarizeDiff(localMigrations, finalRemoteVersions);

  // Ensure any successfully/equivalently processed local version is now recorded remotely.
  const missingProcessed = [...processedVersions].filter(
    (version) => !finalRemoteVersions.includes(version)
  );

  console.log('--- Sync Summary ---');
  console.log(`Processed: ${processed.length}`);
  console.log(
    `Applied: ${processed.filter((entry) => entry.status === 'applied').length}`
  );
  console.log(
    `Equivalent: ${processed.filter((entry) => entry.status === 'equivalent').length}`
  );
  console.log(`Remaining local-only: ${finalDiff.localOnly.length}`);
  console.log(`Remaining remote-only: ${finalDiff.remoteOnly.length}`);

  if (missingProcessed.length > 0) {
    throw new Error(
      `Processed versions missing from schema_migrations: ${missingProcessed.join(', ')}`
    );
  }

  if (finalDiff.localOnly.length > 0) {
    throw new Error(
      `Remote still missing local migrations: ${finalDiff.localOnly
        .map((migration) => migration.version)
        .join(', ')}`
    );
  }

  if (strictRemoteOnly && finalDiff.remoteOnly.length > 0) {
    throw new Error(
      `Remote has migration versions not present locally: ${finalDiff.remoteOnly.join(', ')}`
    );
  }
}

try {
  await run();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
