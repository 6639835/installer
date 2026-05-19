import { getAppPaths, native } from './native';

const pathMap: Record<string, () => string> = {
  appData: () => getAppPaths().appData,
  home: () => getAppPaths().home,
  temp: () => getAppPaths().temp,
  documents: () => getAppPaths().documents,
};

export const app = {
  getPath(name: keyof typeof pathMap): string {
    const getter = pathMap[name];
    if (!getter) {
      throw new Error(`Unsupported app path: ${name}`);
    }
    return getter();
  },
};

export const dialog = {
  async showOpenDialog(options: { title?: string; defaultPath?: string; properties?: string[] }) {
    const selected = await native.selectDirectory(options.title ?? 'Select directory', options.defaultPath);
    return { canceled: !selected, filePaths: selected ? [selected] : [] };
  },

  async showMessageBox(options: { title?: string; message?: string; buttons?: string[]; type?: string }) {
    const response = await native.showMessageBox(
      options.title ?? 'FlyByWire Installer',
      options.message ?? '',
      options.buttons ?? ['OK'],
    );
    return { response };
  },
};

export const shell = {
  openExternal: (url: string) => native.openUrl(url),
  openPath: (path: string) => native.openPath(path),
  writeShortcutLink: (_shortcutPath: string, _operation: string, _options: Record<string, unknown>) => false,
};
