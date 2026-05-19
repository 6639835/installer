export enum FragmenterOperation {
  InstallFinish = 'InstallFinish',
}

export enum FragmenterErrorCode {
  PermissionsError = 'PermissionsError',
  NoSpaceOnDevice = 'NoSpaceOnDevice',
  NetworkError = 'NetworkError',
  ResourcesBusy = 'ResourcesBusy',
  MaxModuleRetries = 'MaxModuleRetries',
  FileNotFound = 'FileNotFound',
  DirectoryNotEmpty = 'DirectoryNotEmpty',
  NotADirectory = 'NotADirectory',
  ModuleJsonInvalid = 'ModuleJsonInvalid',
  ModuleCrcMismatch = 'ModuleCrcMismatch',
  UserAborted = 'UserAborted',
  CorruptedZipFile = 'CorruptedZipFile',
  Null = 'Null',
  Unknown = 'Unknown',
}

export class FragmenterError extends Error {
  code: FragmenterErrorCode;

  constructor(message: string, code = FragmenterErrorCode.Unknown) {
    super(message);
    this.name = 'FragmenterError';
    this.code = code;
  }

  static isFragmenterError(error: unknown): error is FragmenterError {
    return error instanceof FragmenterError || String((error as Error)?.message ?? '').startsWith('FragmenterError');
  }

  static createFromError(error: unknown): FragmenterError {
    return new FragmenterError(error instanceof Error ? error.message : String(error));
  }

  static parseFromMessage(message: string): FragmenterError {
    const matchingCode = Object.values(FragmenterErrorCode).find((code) => message.includes(code));
    return new FragmenterError(message, matchingCode ?? FragmenterErrorCode.Unknown);
  }
}

export interface UpdateInfo {
  requiredDiskSpace: number;
  downloadSize: number;
  isFreshInstall: boolean;
  updatedModules: unknown[];
  addedModules: unknown[];
  baseChanged: boolean;
  needsUpdate: boolean;
  distributionManifest: {
    version: string;
  };
}

export interface InstallManifest {
  source: string;
}

export interface FragmenterModule {
  name: string;
}

export interface FragmenterPhase {
  op?: FragmenterOperation;
  moduleIndex?: number;
}

export interface DownloadProgress {
  percent: number;
  partPercent: number;
  partIndex: number;
  numParts: number;
}

export interface UnzipProgress {
  entryIndex: number;
  entryCount: number;
  entryName: string;
}

export interface FragmenterInstallerEvents {
  error: (error: Error) => void;
  downloadStarted: (module: FragmenterModule) => void;
  downloadProgress: (module: FragmenterModule, progress: DownloadProgress) => void;
  downloadInterrupted: () => void;
  downloadFinished: () => void;
  unzipStarted: (module: FragmenterModule) => void;
  unzipProgress: (module: FragmenterModule, progress: UnzipProgress) => void;
  unzipFinished: () => void;
  copyStarted: (module: FragmenterModule) => void;
  copyProgress: () => void;
  copyFinished: () => void;
  retryScheduled: (module: FragmenterModule, retryCount: number, waitSeconds: number) => void;
  retryStarted: (module: FragmenterModule, retryCount: number) => void;
  fullDownload: () => void;
  cancelled: () => void;
  logInfo: (...args: unknown[]) => void;
  logWarn: (...args: unknown[]) => void;
  logError: (...args: unknown[]) => void;
}

export interface FragmenterContextEvents {
  phaseChange: (phase: FragmenterPhase) => void;
}

export class FragmenterUpdateChecker {
  async needsUpdate(url: string, _installDir: string, _options?: Record<string, unknown>): Promise<UpdateInfo> {
    return {
      requiredDiskSpace: Number.NaN,
      downloadSize: 0,
      isFreshInstall: false,
      updatedModules: [],
      addedModules: [],
      baseChanged: false,
      needsUpdate: false,
      distributionManifest: {
        version: url,
      },
    };
  }
}
