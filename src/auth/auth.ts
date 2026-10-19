export type LocalAuthAccount = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  salt: string;
  workspaceName: string;
  usage: 'personal' | 'company' | 'agency' | 'education';
  createdAt: string;
};

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  workspaceName: string;
  isGuest?: boolean;
};

type StoredSession = {
  accountId: string;
  expiresAt: number;
  guest?: boolean;
  guestName?: string;
};

const ACCOUNTS_KEY = 'blueocean.auth.accounts.v1';
const SESSION_KEY = 'blueocean.auth.session.v1';
const PBKDF2_ITERATIONS = 120_000;

const bytesToHex = (bytes: Uint8Array) => Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
const hexToBytes = (hex: string) => new Uint8Array(hex.match(/.{1,2}/g)?.map((part) => Number.parseInt(part, 16)) ?? []);

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const readAccounts = (): LocalAuthAccount[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || '[]') as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is LocalAuthAccount => Boolean(item && typeof item === 'object' && 'email' in item)) : [];
  } catch {
    return [];
  }
};

const writeAccounts = (accounts: LocalAuthAccount[]) => localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));

async function derivePasswordHash(password: string, saltHex: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: hexToBytes(saltHex), iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' }, key, 256);
  return bytesToHex(new Uint8Array(bits));
}

const createId = () => `account_${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)}`;
const accountToUser = (account: LocalAuthAccount): AuthUser => ({ id: account.id, name: account.name, email: account.email, workspaceName: account.workspaceName });

export function getStoredUser(): AuthUser | null {
  const candidates = [localStorage.getItem(SESSION_KEY), sessionStorage.getItem(SESSION_KEY)];
  for (const raw of candidates) {
    if (!raw) continue;
    try {
      const session = JSON.parse(raw) as StoredSession;
      if (!session.expiresAt || session.expiresAt < Date.now()) continue;
      if (session.guest) return { id: 'local_guest', name: session.guestName || 'Workspace local', email: '', workspaceName: 'Workspace local', isGuest: true };
      const account = readAccounts().find((item) => item.id === session.accountId);
      if (account) return accountToUser(account);
    } catch {
      // Ignore malformed legacy/session data and continue.
    }
  }
  return null;
}

function persistSession(accountId: string, remember: boolean, guest = false, guestName?: string) {
  const storage = remember ? localStorage : sessionStorage;
  const alternate = remember ? sessionStorage : localStorage;
  alternate.removeItem(SESSION_KEY);
  storage.setItem(SESSION_KEY, JSON.stringify({ accountId, guest, guestName, expiresAt: Date.now() + (remember ? 30 : 1) * 24 * 60 * 60 * 1000 } satisfies StoredSession));
}

export async function signInLocal(email: string, password: string, remember: boolean): Promise<AuthUser> {
  const account = readAccounts().find((item) => item.email === normalizeEmail(email));
  if (!account) throw new Error('E-mail ou senha incorretos.');
  const passwordHash = await derivePasswordHash(password, account.salt);
  if (passwordHash !== account.passwordHash) throw new Error('E-mail ou senha incorretos.');
  persistSession(account.id, remember);
  return accountToUser(account);
}

export async function createLocalAccount(input: { name: string; email: string; password: string; workspaceName: string; usage: LocalAuthAccount['usage'] }): Promise<AuthUser> {
  const email = normalizeEmail(input.email);
  if (readAccounts().some((item) => item.email === email)) throw new Error('Já existe uma conta local com este e-mail.');
  const salt = bytesToHex(crypto.getRandomValues(new Uint8Array(16)));
  const account: LocalAuthAccount = {
    id: createId(),
    name: input.name.trim(),
    email,
    passwordHash: await derivePasswordHash(input.password, salt),
    salt,
    workspaceName: input.workspaceName.trim() || 'Meu workspace',
    usage: input.usage,
    createdAt: new Date().toISOString(),
  };
  writeAccounts([...readAccounts(), account]);
  persistSession(account.id, true);
  return accountToUser(account);
}

export async function resetLocalPassword(emailInput: string, nextPassword: string): Promise<void> {
  const email = normalizeEmail(emailInput);
  const accounts = readAccounts();
  const index = accounts.findIndex((item) => item.email === email);
  if (index < 0) throw new Error('Nenhuma conta local foi encontrada com este e-mail.');
  const salt = bytesToHex(crypto.getRandomValues(new Uint8Array(16)));
  accounts[index] = { ...accounts[index], salt, passwordHash: await derivePasswordHash(nextPassword, salt) };
  writeAccounts(accounts);
}

export function enterLocalWorkspace(): AuthUser {
  const user: AuthUser = { id: 'local_guest', name: 'Workspace local', email: '', workspaceName: 'Workspace local', isGuest: true };
  persistSession(user.id, false, true, user.name);
  return user;
}

export function signOutLocal() {
  localStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(SESSION_KEY);
}

export function hasLocalAccounts() {
  return readAccounts().length > 0;
}
