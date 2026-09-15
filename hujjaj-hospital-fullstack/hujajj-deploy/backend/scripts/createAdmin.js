/**
 * Creates (or resets the password for) a staff/admin login.
 *
 * Usage:
 *   npm run create-admin
 *
 * You'll be prompted for a username, password, and role interactively —
 * nothing is hardcoded or committed to the repo. Requires DATABASE_URL
 * to already be set in your .env (or environment) and the schema to
 * already be migrated (npm run migrate).
 */
require('dotenv').config();
const readline = require('readline');
const bcrypt = require('bcryptjs');
const pool = require('../db');

function ask(rl, question, { hidden = false } = {}) {
  return new Promise((resolve) => {
    if (!hidden) {
      rl.question(question, resolve);
      return;
    }
    // Basic masked input for the password prompt.
    const stdin = process.stdin;
    process.stdout.write(question);
    let input = '';
    const onData = (char) => {
      char = char.toString('utf8');
      if (char === '\n' || char === '\r' || char === '\u0004') {
        stdin.removeListener('data', onData);
        stdin.setRawMode(false);
        stdin.pause();
        process.stdout.write('\n');
        resolve(input);
        return;
      }
      if (char === '\u0003') { process.exit(1); } // Ctrl+C
      if (char === '\u007f') { input = input.slice(0, -1); return; } // backspace
      input += char;
    };
    stdin.setRawMode(true);
    stdin.resume();
    stdin.on('data', onData);
  });
}

async function main() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  const username = (await ask(rl, 'Username: ')).trim().toLowerCase();
  const password = await ask(rl, 'Password (min 8 characters): ', { hidden: true });
  const roleInput = (await ask(rl, 'Role [staff/admin] (default: staff): ')).trim().toLowerCase();
  rl.close();

  const role = roleInput === 'admin' ? 'admin' : 'staff';

  if (!username) {
    console.error('Username is required.');
    process.exit(1);
  }
  if (!password || password.length < 8) {
    console.error('Password must be at least 8 characters.');
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  try {
    await pool.query(
      `INSERT INTO users (username, password_hash, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = EXCLUDED.role`,
      [username, passwordHash, role]
    );
    console.log(`✓ User "${username}" (${role}) is ready to sign in.`);
  } catch (err) {
    console.error('Failed to create user:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
