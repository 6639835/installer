import { Directories } from 'renderer/utils/Directories';
import { Addon } from './InstallerConfiguration';
import { native } from 'renderer/platform/native';

export enum FreeDiskSpaceStatus {
  Unknown,
  NotLimited,
  LimitedByDestination,
  LimitedByTemporary,
  LimitedByBoth,
}

export interface FreeDiskSpaceInfo {
  freeSpaceInDest: number;
  freeSpaceInTemp: number;
  status: FreeDiskSpaceStatus;
}

export class FreeDiskSpace {
  static async analyse(addon: Addon, requiredSpace: number): Promise<FreeDiskSpaceInfo> {
    if (!Number.isFinite(requiredSpace)) {
      return {
        freeSpaceInTemp: -1,
        freeSpaceInDest: -1,
        status: FreeDiskSpaceStatus.Unknown,
      };
    }

    let resolvedDestDir = Directories.installLocation(addon.simulator);
    let resolvedTempDir = Directories.tempLocation(addon.simulator);

    try {
      resolvedDestDir = (await native.readLink(resolvedDestDir)) ?? resolvedDestDir;
    } catch (e) {
      // noop - it's probably not a link
    }

    try {
      resolvedTempDir = (await native.readLink(resolvedTempDir)) ?? resolvedTempDir;
    } catch (e) {
      // noop - it's probably not a link
    }

    let freeDestDirSpace = NaN;
    try {
      freeDestDirSpace = await native.freeDiskSpace(resolvedDestDir);
    } catch (e) {
      // noop - user probably does not have `wmic` on their system
    }

    let freeTempDirSpace = NaN;
    try {
      freeTempDirSpace = await native.freeDiskSpace(resolvedTempDir);
    } catch (e) {
      // noop - user probably does not have `wmic` on their system
    }

    if (!Number.isFinite(freeDestDirSpace) || !Number.isFinite(freeTempDirSpace)) {
      return {
        freeSpaceInTemp: -1,
        freeSpaceInDest: -1,
        status: FreeDiskSpaceStatus.Unknown,
      };
    }

    let status = FreeDiskSpaceStatus.NotLimited;
    if (requiredSpace >= freeDestDirSpace && requiredSpace >= freeTempDirSpace) {
      status = FreeDiskSpaceStatus.LimitedByBoth;
    } else if (requiredSpace >= freeDestDirSpace) {
      status = FreeDiskSpaceStatus.LimitedByDestination;
    } else if (requiredSpace >= freeTempDirSpace) {
      status = FreeDiskSpaceStatus.LimitedByTemporary;
    }

    return {
      freeSpaceInDest: freeDestDirSpace,
      freeSpaceInTemp: freeTempDirSpace,
      status,
    };
  }
}
