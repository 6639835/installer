import path from 'path';
import { Addon } from 'renderer/utils/InstallerConfiguration';
import settings from 'renderer/rendererSettings';
import { app } from 'renderer/platform/desktopRemote';
import { Simulators, TypeOfSimulator } from './SimManager';
import { native } from 'renderer/platform/native';

const TEMP_DIRECTORY_PREFIX = 'flybywire-current-install';

const TEMP_DIRECTORY_PREFIXES_FOR_CLEANUP = ['flybywire_current_install', TEMP_DIRECTORY_PREFIX];
export class Directories {
  private static sanitize(suffix: string): string {
    return path.normalize(suffix).replace(/^(\.\.(\/|\\|$))+/, '');
  }

  static appData(): string {
    return app.getPath('appData');
  }

  static localAppData(): string {
    return path.join(app.getPath('appData'), '..', 'Local');
  }

  static home(): string {
    return app.getPath('home');
  }

  static osTemp(): string {
    return app.getPath('temp');
  }

  static simulatorBasePath(sim: TypeOfSimulator): string | null {
    return settings.get(`mainSettings.simulator.${sim}.basePath`);
  }

  static communityLocation(sim: TypeOfSimulator): string | null {
    return settings.get(`mainSettings.simulator.${sim}.communityPath`);
  }

  static inCommunityLocation(sim: TypeOfSimulator, targetDir: string): string | null {
    const communityPath = Directories.communityLocation(sim);
    if (!communityPath) return null;
    return path.join(communityPath, this.sanitize(targetDir));
  }

  static inCommunityPackage(addon: Addon, targetDir: string): string | null {
    const baseDir = this.inCommunityLocation(addon.simulator, this.sanitize(addon.targetDirectory));
    return path.join(baseDir, this.sanitize(targetDir));
  }

  static installLocation(sim: TypeOfSimulator): string | null {
    return settings.get(`mainSettings.simulator.${sim}.installPath`);
  }

  static inInstallLocation(sim: TypeOfSimulator, targetDir: string): string | null {
    const installPath = this.installLocation(sim);
    if (!installPath) return null;
    return path.join(installPath, this.sanitize(targetDir));
  }

  static inInstallPackage(addon: Addon, targetDir: string): string | null {
    const baseDir = this.inInstallLocation(addon.simulator, this.sanitize(addon.targetDirectory));
    if (!baseDir) return null;
    return path.join(baseDir, this.sanitize(targetDir));
  }

  static tempLocation(sim: TypeOfSimulator): string {
    return settings.get('mainSettings.separateTempLocation')
      ? settings.get('mainSettings.tempLocation')
      : this.installLocation(sim);
  }

  static inTempLocation(sim: TypeOfSimulator, targetDir: string): string {
    return path.join(Directories.tempLocation(sim), this.sanitize(targetDir));
  }

  static inPackages(sim: TypeOfSimulator, targetDir: string): string {
    return path
      .join(this.simulatorBasePath(sim), 'packages', this.sanitize(targetDir))
      .replace('LocalCache', 'LocalState');
  }

  static inPackageCache(addon: Addon, targetDir: string): string {
    const baseDir = this.inPackages(addon.simulator, this.sanitize(addon.targetDirectory));

    return path.join(baseDir, this.sanitize(targetDir));
  }

  static async temp(sim: TypeOfSimulator): Promise<string> {
    const dir = path.join(
      Directories.tempLocation(sim),
      `${TEMP_DIRECTORY_PREFIX}-${(Math.random() * 1000).toFixed(0)}`,
    );
    if (await native.exists(dir)) {
      return Directories.temp(sim);
    }
    return dir;
  }

  static async removeAllTemp(): Promise<void> {
    console.log('[CLEANUP] Removing all temp directories');

    for (const sim in Simulators) {
      if (!(await native.exists(Directories.tempLocation(sim as TypeOfSimulator)))) {
        console.warn('[CLEANUP] Location of temporary folders does not exist. Aborting');
        return;
      }

      try {
        const dirents = (await native.readDir(Directories.tempLocation(sim as TypeOfSimulator)))
          .filter((dirEnt) => dirEnt.isDirectory)
          .filter((dirEnt) => TEMP_DIRECTORY_PREFIXES_FOR_CLEANUP.some((it) => dirEnt.name.startsWith(it)));

        for (const dir of dirents) {
          const fullPath = Directories.inTempLocation(sim as TypeOfSimulator, dir.name);

          console.log('[CLEANUP] Removing', fullPath);
          try {
            await native.remove(fullPath, true);
            console.log('[CLEANUP] Removed', fullPath);
          } catch (e) {
            console.error('[CLEANUP] Could not remove', fullPath, e);
          }
        }

        console.log('[CLEANUP] Finished removing all temp directories');
      } catch (e) {
        console.error('[CLEANUP] Could not scan folder', Directories.tempLocation(sim as TypeOfSimulator), e);
      }
    }
  }

  static async removeAlternativesForAddon(addon: Addon): Promise<void> {
    for (const altName of addon.alternativeNames ?? []) {
      const altDir = Directories.inInstallLocation(addon.simulator, altName);

      if (await native.exists(altDir)) {
        console.log('Removing alternative', altDir);
        await native.remove(altDir, true);
      }
    }
  }

  static async isFragmenterInstall(target: string | Addon): Promise<boolean> {
    const targetDir =
      typeof target === 'string' ? target : Directories.inInstallLocation(target.simulator, target.targetDirectory);

    return native.exists(path.join(targetDir, 'install.json'));
  }

  static async isGitInstall(target: string | Addon): Promise<boolean> {
    const targetDir =
      typeof target === 'string' ? target : Directories.inInstallLocation(target.simulator, target.targetDirectory);

    try {
      const symlinkPath = await native.readLink(targetDir);
      if (symlinkPath && (await native.exists(path.join(symlinkPath, '/../../../.git')))) {
        console.log('Is git repo', targetDir);
        return true;
      }
    } catch {
      console.log('Is not git repo', targetDir);
      return false;
    }
  }

  static inDocumentsFolder(targetDir: string): string {
    return path.join(app.getPath('documents'), this.sanitize(targetDir));
  }
}
