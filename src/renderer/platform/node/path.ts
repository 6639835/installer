const preferredSeparator = (parts: string[]) => (parts.some((part) => part.includes('\\')) ? '\\' : '/');

const trimSeparators = (part: string) => part.replace(/^[\\/]+|[\\/]+$/g, '');

export const normalize = (input: string): string => {
  if (!input) return '.';
  const sep = preferredSeparator([input]);
  const prefix = input.match(/^[A-Za-z]:/)?.[0] ?? (input.startsWith('/') ? '/' : '');
  const normalized = input.replace(/[\\/]+/g, sep);
  const parts = normalized
    .replace(/^[A-Za-z]:/, '')
    .split(/[\\/]+/)
    .filter(Boolean);
  const stack: string[] = [];

  for (const part of parts) {
    if (part === '.') continue;
    if (part === '..' && stack.length > 0 && stack[stack.length - 1] !== '..') {
      stack.pop();
    } else if (part !== '..' || !prefix) {
      stack.push(part);
    }
  }

  return `${prefix}${prefix && stack.length ? sep : ''}${stack.join(sep)}` || '.';
};

export const join = (...parts: Array<string | null | undefined>): string => {
  const present = parts.filter((part): part is string => typeof part === 'string' && part.length > 0);
  if (!present.length) return '.';
  const sep = preferredSeparator(present);
  const first = present[0];
  const prefix = first.match(/^[A-Za-z]:/)?.[0] ?? (first.startsWith('/') ? '/' : '');
  const joined = present
    .map((part, index) => (index === 0 ? part.replace(/[\\/]+$/g, '') : trimSeparators(part)))
    .join(sep);
  return normalize(prefix && !joined.startsWith(prefix) ? `${prefix}${sep}${joined}` : joined);
};

export const dirname = (input: string): string => {
  const normalized = normalize(input);
  const sep = preferredSeparator([normalized]);
  const index = normalized.lastIndexOf(sep);
  if (index <= 0) return normalized.match(/^[A-Za-z]:/) ? normalized.slice(0, 2) : '.';
  return normalized.slice(0, index);
};

export const extname = (input: string): string => {
  const file = input.split(/[\\/]/).pop() ?? '';
  const index = file.lastIndexOf('.');
  return index > 0 ? file.slice(index) : '';
};

export const parse = (input: string) => {
  const dir = dirname(input);
  const base = input.split(/[\\/]/).pop() ?? '';
  const ext = extname(base);
  const name = ext ? base.slice(0, -ext.length) : base;
  return { root: input.startsWith('/') ? '/' : '', dir, base, ext, name };
};

export default { normalize, join, dirname, extname, parse };
