import { getAppPaths } from '../native';

export const platform = (): NodeJS.Platform => {
  const platform = getAppPaths().platform;
  if (platform === 'windows') return 'win32';
  if (platform === 'macos') return 'darwin';
  if (platform === 'linux') return 'linux';
  return platform as NodeJS.Platform;
};

export default { platform };
