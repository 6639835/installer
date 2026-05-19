import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import * as packageInfo from '../../package.json';
import { getAppPaths, native } from './platform/native';

type Listener = (value: unknown) => void;

const listeners = new Map<string, Set<Listener>>();

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const deepMerge = <T extends Record<string, unknown>>(base: T, overlay: Record<string, unknown>): T => {
  const merged: Record<string, unknown> = { ...base };

  for (const [key, value] of Object.entries(overlay)) {
    if (isObject(value) && isObject(merged[key])) {
      merged[key] = deepMerge(merged[key] as Record<string, unknown>, value);
    } else {
      merged[key] = value;
    }
  }

  return merged as T;
};

const getByPath = (source: Record<string, unknown>, key: string): unknown =>
  key.split('.').reduce<unknown>((value, part) => (isObject(value) ? value[part] : undefined), source);

const setByPath = (source: Record<string, unknown>, key: string, value: unknown): void => {
  const parts = key.split('.');
  let target = source;

  for (const part of parts.slice(0, -1)) {
    if (!isObject(target[part])) {
      target[part] = {};
    }
    target = target[part] as Record<string, unknown>;
  }

  target[parts[parts.length - 1]] = value;
};

const deleteByPath = (source: Record<string, unknown>, key: string): void => {
  const parts = key.split('.');
  const target = parts
    .slice(0, -1)
    .reduce<unknown>((value, part) => (isObject(value) ? value[part] : undefined), source);

  if (isObject(target)) {
    delete target[parts[parts.length - 1]];
  }
};

const defaultSettings = (): Record<string, unknown> => ({
  mainSettings: {
    autoStartApp: false,
    disableExperimentalWarning: false,
    disableDependencyPrompt: {},
    disableBackgroundServiceAutoStartPrompt: {},
    disableAddonDiskSpaceModal: {},
    useCdnCache: true,
    dateLayout: 'yyyy/mm/dd',
    useLongDateFormat: false,
    useDarkTheme: false,
    allowSeasonalEffects: true,
    simulator: {
      msfs2020: {
        enabled: false,
        basePath: null,
        communityPath: null,
        installPath: null,
      },
      msfs2024: {
        enabled: false,
        basePath: null,
        communityPath: null,
        installPath: null,
      },
    },
    separateTempLocation: false,
    tempLocation: getAppPaths().temp,
    configDownloadUrl: packageInfo.configUrls.production,
    configForceUseLocal: false,
    qaConfigUrls: {},
  },
  cache: {
    main: {
      managedSim: '',
      lastShownSection: '',
      lastShownAddonKey: '',
    },
  },
  metaInfo: {
    lastVersion: '',
    lastLaunch: 0,
  },
});

class SettingsStore {
  private values: Record<string, unknown> = {};

  async initialize(): Promise<void> {
    this.values = deepMerge(defaultSettings(), await native.loadSettings());
    this.migrateLegacyKeys();
    this.set('metaInfo.lastLaunch', Date.now());
  }

  get<K = string, T = unknown>(key: K, defaultValue?: T): T {
    const value = getByPath(this.values, String(key));
    return (value === undefined ? defaultValue : value) as T;
  }

  set(key: string, value: unknown): void {
    setByPath(this.values, key, value);
    this.emit(key, value);
    void native.saveSettings(this.values).catch((error) => console.error('Could not save settings', error));
  }

  delete(key: string): void {
    deleteByPath(this.values, key);
    this.emit(key, undefined);
    void native.saveSettings(this.values).catch((error) => console.error('Could not save settings', error));
  }

  reset(key: string): void {
    const defaults = defaultSettings();
    this.set(key, getByPath(defaults, key));
  }

  onDidChange(key: string, listener: Listener): () => void {
    const keyListeners = listeners.get(key) ?? new Set<Listener>();
    keyListeners.add(listener);
    listeners.set(key, keyListeners);

    return () => {
      keyListeners.delete(listener);
    };
  }

  private emit(key: string, value: unknown): void {
    listeners.get(key)?.forEach((listener) => listener(value));
  }

  private migrateLegacyKeys(): void {
    if (this.get('mainSettings.msfsBasePath')) {
      this.set('mainSettings.simulator.msfs2020.basePath', this.get('mainSettings.msfsBasePath'));
      this.delete('mainSettings.msfsBasePath');
    }
    if (this.get('mainSettings.msfsCommunityPath')) {
      this.set('mainSettings.simulator.msfs2020.communityPath', this.get('mainSettings.msfsCommunityPath'));
      this.delete('mainSettings.msfsCommunityPath');
    }
    if (this.get('mainSettings.installPath')) {
      this.set('mainSettings.simulator.msfs2020.installPath', this.get('mainSettings.installPath'));
      this.delete('mainSettings.installPath');
    }
  }
}

const store = new SettingsStore();

export const initializeSettings = () => store.initialize();

export const useSetting = <T>(key: string, defaultValue?: T): [T, Dispatch<SetStateAction<T>>] => {
  const [storedValue, setStoredValue] = useState(store.get<string, T>(key, defaultValue));

  useEffect(() => {
    setStoredValue(store.get<string, T>(key, defaultValue));

    const cancel = store.onDidChange(key, (val) => {
      setStoredValue(val as T);
    });

    return () => {
      cancel();
    };
  }, [defaultValue, key]);

  const setValue = (newVal: T) => {
    store.set(key, newVal);
  };

  return [storedValue, setValue];
};

export const useIsDarkTheme = (): boolean => true;

export default store;
