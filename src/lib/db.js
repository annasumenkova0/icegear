import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..', '..');

const db = new DatabaseSync(join(ROOT_DIR, 'icegear.db'));

const schema = readFileSync(join(ROOT_DIR, 'src', 'schema.sql'), 'utf-8');
db.exec(schema);

export default db;
