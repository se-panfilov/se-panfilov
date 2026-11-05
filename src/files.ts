import { randomBytes } from 'node:crypto';
import { closeSync, constants, fstatSync, lstatSync, openSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';

import { GeneratorError } from '@tarot/errors';

/**
 * Read a regular UTF-8 text file through one file descriptor, so that the checked file is the file that is read.
 * Returns undefined for a missing file. A link, a directory, or a file larger than the limit is an error.
 */
export function readTextFile(path: string, limit: number): string | undefined {
  let descriptor: number;
  try {
    descriptor = openSync(path, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') return undefined;
    if (code === 'ELOOP') throw new GeneratorError(`Expected a regular file, not a link: ${path}`);
    throw error;
  }
  try {
    const stat = fstatSync(descriptor);
    if (!stat.isFile()) throw new GeneratorError(`Expected a regular file: ${path}`);
    if (stat.size > limit) throw new GeneratorError(`The file is larger than ${limit} bytes: ${path}`);
    const text = new TextDecoder('utf-8', { fatal: true }).decode(readFileSync(descriptor));
    // Remove a byte order mark and use LF line endings.
    return text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  } catch (error) {
    if (error instanceof TypeError) throw new GeneratorError(`The file is not valid UTF-8: ${path}`);
    throw error;
  } finally {
    closeSync(descriptor);
  }
}

/** Replace a regular file atomically: write a temporary file in the same directory, then rename it. */
export function writeTextFileAtomic(path: string, text: string): void {
  try {
    const stat = lstatSync(path);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new GeneratorError(`The output must be a regular file, not a link or a directory: ${path}`);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  const temporary = join(dirname(path), `.${basename(path)}.${randomBytes(6).toString('hex')}.tmp`);
  try {
    writeFileSync(temporary, text, { encoding: 'utf8', flag: 'wx', mode: 0o644 });
    renameSync(temporary, path);
  } catch (error) {
    rmSync(temporary, { force: true });
    throw error;
  }
}
