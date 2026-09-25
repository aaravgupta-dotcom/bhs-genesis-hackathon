// Must be imported first from index.js so NVIDIA keys exist before any service reads process.env
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const dir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(dir, '.env') });
dotenv.config({ path: path.join(dir, '../.env') });
