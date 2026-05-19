import { invoke } from '@tauri-apps/api/core';

export interface AppPaths {
  appData: string;
  localAppData: string;
  home: string;
  temp: string;
  documents: string;
  resourceDir: string;
  platform: string;
}

export interface DirEntryInfo {
  name: string;
  path: string;
  isFile: boolean;
  isDirectory: boolean;
}

let appPaths: AppPaths | null = null;

export const initializeNative = async (): Promise<void> => {
  appPaths = await invoke<AppPaths>('get_app_paths');
};

export const getAppPaths = (): AppPaths => {
  if (!appPaths) {
    throw new Error('Native paths are not initialized.');
  }
  return appPaths;
};

export const native = {
  invoke,
  loadSettings: () => invoke<Record<string, unknown>>('load_settings'),
  saveSettings: (settings: unknown) => invoke<void>('save_settings', { settings }),
  exists: (path: string | null | undefined) => (path ? invoke<boolean>('fs_exists', { path }) : Promise.resolve(false)),
  readText: (path: string) => invoke<string>('fs_read_text', { path }),
  writeText: (path: string, content: string) => invoke<void>('fs_write_text', { path, content }),
  createDirAll: (path: string) => invoke<void>('fs_create_dir_all', { path }),
  remove: (path: string, recursive = false) => invoke<void>('fs_remove', { path, recursive }),
  readDir: (path: string) => invoke<DirEntryInfo[]>('fs_read_dir', { path }),
  readLink: (path: string) => invoke<string | null>('fs_read_link', { path }),
  freeDiskSpace: (path: string) => invoke<number>('free_disk_space', { path }),
  tcpPortOpen: (port: number) => invoke<boolean>('tcp_port_open', { port }),
  openPath: (path: string) => invoke<void>('open_path', { path }),
  openUrl: (url: string) => invoke<void>('open_url', { url }),
  selectDirectory: (title: string, defaultPath?: string) =>
    invoke<string | null>('select_directory', { title, defaultPath }),
  showMessageBox: (title: string, message: string, buttons: string[]) =>
    invoke<number>('show_message_box', { options: { title, message, buttons } }),
};
