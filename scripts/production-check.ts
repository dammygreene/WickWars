const required = ['WW_SESSION_SECRET', 'WW_BASE_URL'];
const missing = required.filter((name) => !process.env[name]);
const production = process.env.NODE_ENV === 'production';
const base = process.env.WW_BASE_URL;
const callback = process.env.X_REDIRECT_URI;
const expectedCallback = base ? `${base.replace(/\/$/, '')}/api/auth/x/callback` : '';

if (missing.length) {
  console.error(`Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

if ((process.env.WW_SESSION_SECRET ?? '').length < 32) {
  console.error('WW_SESSION_SECRET must contain at least 32 characters.');
  process.exit(1);
}

if (production && base !== 'https://wickwars.xyz') {
  console.error('WW_BASE_URL must be https://wickwars.xyz in production.');
  process.exit(1);
}

try {
  const parsed = new URL(base!);
  if (parsed.protocol !== 'https:' && production) throw new Error('production base URL must use HTTPS');
} catch {
  console.error('WW_BASE_URL must be a valid URL.');
  process.exit(1);
}

const xValues = ['X_CLIENT_ID', 'X_CLIENT_SECRET', 'X_REDIRECT_URI'];
const configuredX = xValues.every((name) => process.env[name]);
if (configuredX && callback !== expectedCallback) {
  console.error(`X_REDIRECT_URI must exactly equal ${expectedCallback}.`);
  process.exit(1);
}
if (!configuredX && xValues.some((name) => process.env[name])) {
  console.error('Set all X OAuth variables together, or leave all of them unset.');
  process.exit(1);
}

console.log(`Production configuration OK (X OAuth ${configuredX ? 'configured' : 'disabled'}).`);