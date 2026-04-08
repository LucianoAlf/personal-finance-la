import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

type E2ECredentialsSource = 'env' | 'file';

interface LoadE2ECredentialsOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  fileExists?: (filePath: string) => boolean;
  readFile?: (filePath: string) => string;
}

interface E2ECredentials {
  email: string;
  password: string;
  source: E2ECredentialsSource;
}

const CANDIDATE_FILES = ['.env.e2e.local', '.env.local'];

function cleanValue(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.replace(/^['"]|['"]$/g, '');
}

function parseEnvLikeContent(content: string): Record<string, string> {
  return content.split(/\r?\n/).reduce<Record<string, string>>((acc, line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      return acc;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex <= 0) {
      return acc;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = cleanValue(trimmed.slice(separatorIndex + 1));
    if (value) {
      acc[key] = value;
    }

    return acc;
  }, {});
}

export function loadE2ECredentials({
  cwd = process.cwd(),
  env = process.env,
  fileExists = (filePath: string) => existsSync(filePath),
  readFile = (filePath: string) => readFileSync(filePath, 'utf8'),
}: LoadE2ECredentialsOptions = {}): E2ECredentials | null {
  const envEmail = cleanValue(env.E2E_EMAIL);
  const envPassword = cleanValue(env.E2E_PASSWORD);
  if (envEmail && envPassword) {
    return {
      email: envEmail,
      password: envPassword,
      source: 'env',
    };
  }

  for (const relativeFile of CANDIDATE_FILES) {
    const filePath = path.resolve(cwd, relativeFile);
    if (!fileExists(filePath)) {
      continue;
    }

    const parsed = parseEnvLikeContent(readFile(filePath));
    const email = cleanValue(parsed.E2E_EMAIL);
    const password = cleanValue(parsed.E2E_PASSWORD);
    if (email && password) {
      return {
        email,
        password,
        source: 'file',
      };
    }
  }

  return null;
}
