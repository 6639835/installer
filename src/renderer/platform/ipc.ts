import { listen, UnlistenFn } from '@tauri-apps/api/event';
import channels from 'common/channels';
import { native } from './native';

type IpcListener = (event: unknown, ...args: unknown[]) => void;

const listeners = new Map<IpcListener, UnlistenFn>();

const installResultToLegacyValue = (result: { success: boolean; error?: string | null }) => {
  if (result.success) {
    return true;
  }
  return { message: result.error ?? 'Install failed' };
};

export const ipcRenderer = {
  async invoke(channel: string, ...args: unknown[]): Promise<unknown> {
    switch (channel) {
      case channels.sentry.requestSessionID:
        return crypto.randomUUID();
      case channels.installManager.installFromUrl: {
        const [installId, url, tempDir, destDir] = args as [number, string, string, string];
        return installResultToLegacyValue(
          await native.invoke('install_from_url', { installId, url, tempDir, destDir }),
        );
      }
      case channels.installManager.uninstall: {
        const [communityPackageDir, packageCacheDirs] = args as [string, string[]];
        return native.invoke('uninstall', { communityPackageDir, packageCacheDirs });
      }
      default:
        return native.invoke(channel.replaceAll('/', '_'), { args });
    }
  },

  send(channel: string, ...args: unknown[]): void {
    switch (channel) {
      case channels.window.minimize:
        native.invoke('minimize_window');
        break;
      case channels.window.maximize:
        native.invoke('toggle_maximize_window');
        break;
      case channels.window.close:
        native.invoke('close_window');
        break;
      case channels.window.reload:
        native.invoke('reload_window');
        break;
      case channels.openPath:
        native.openPath(args[0] as string);
        break;
      case channels.installManager.cancelInstall:
        native.invoke('cancel_install', { installId: args[0] });
        break;
      case 'request-startup-at-login-changed':
        native.invoke('set_startup_at_login', { enabled: args[0] });
        break;
      case 'set-window-progress-bar':
        native.invoke('set_window_progress', { value: args[0] });
        break;
      case channels.checkForInstallerUpdate:
      case 'restartAndUpdate':
        break;
      default:
        native.invoke(channel.replaceAll('/', '_'), { args });
    }
  },

  on(channel: string, callback: IpcListener): void {
    listen<unknown[]>(channel, (event) => callback(event, ...(event.payload ?? []))).then((unlisten) => {
      listeners.set(callback, unlisten);
    });
  },

  off(_channel: string, callback: IpcListener): void {
    this.removeListener(_channel, callback);
  },

  removeListener(_channel: string, callback: IpcListener): void {
    const unlisten = listeners.get(callback);
    if (unlisten) {
      unlisten();
      listeners.delete(callback);
    }
  },
};
