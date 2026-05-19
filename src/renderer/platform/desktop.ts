import { ipcRenderer } from './ipc';
import { native } from './native';

export { ipcRenderer };

export const shell = {
  openExternal: (url: string) => native.openUrl(url),
  openPath: (path: string) => native.openPath(path),
};

export const clipboard = {
  writeText: (value: string, _type?: string) => navigator.clipboard?.writeText(value),
};
