import React, { FC, useEffect, useState } from 'react';
import {
  Addon,
  DirectoryDefinition,
  ExternalLink,
  NamedDirectoryDefinition,
} from 'renderer/utils/InstallerConfiguration';
import { BoxArrowRight, Folder } from 'react-bootstrap-icons';
import { ipcRenderer, shell } from 'renderer/platform/desktop';
import { Directories } from 'renderer/utils/Directories';
import { useAppSelector } from 'renderer/redux/store';
import { InstallStatusCategories } from 'renderer/components/AddonSection/Enums';
import channels from 'common/channels';
import { native } from 'renderer/platform/native';

export interface MyInstallProps {
  addon: Addon;
}

export const MyInstall: FC<MyInstallProps> = ({ addon }) => {
  const installStates = useAppSelector((state) => state.installStatus);
  const [existingDirectories, setExistingDirectories] = useState<Record<string, boolean>>({});

  const links: ExternalLink[] = [...(addon.myInstallPage?.links ?? [])];

  const directories: NamedDirectoryDefinition[] = [
    {
      location: {
        in: 'community',
        path: addon.targetDirectory,
      },
      title: 'Package Files',
    },
    ...(addon.myInstallPage?.directories ?? []),
  ];

  const handleClickLink = (link: ExternalLink) => {
    const parsed = new URL(link.url);

    if (parsed.protocol.match(/https?/)) {
      shell.openExternal(link.url).then();
    }
  };

  const fulldirectory = (def: DirectoryDefinition) => {
    switch (def.location.in) {
      case 'community':
        return Directories.inInstallLocation(addon.simulator, def.location.path);
      case 'package':
        return Directories.inInstallPackage(addon, def.location.path);
      case 'packageCache':
        return Directories.inPackageCache(addon, def.location.path);
      case 'documents':
        return Directories.inDocumentsFolder(def.location.path);
    }
  };

  const handleClickDirectory = (def: DirectoryDefinition) => {
    ipcRenderer.send(channels.openPath, fulldirectory(def));
  };

  const directoriesDisabled = !InstallStatusCategories.installed.includes(installStates[addon.key]?.status);

  useEffect(() => {
    let mounted = true;

    Promise.all(
      directories.map(async (directory) => {
        const fullPath = fulldirectory(directory);
        return [fullPath, await native.exists(fullPath)] as const;
      }),
    ).then((results) => {
      if (mounted) {
        setExistingDirectories(Object.fromEntries(results));
      }
    });

    return () => {
      mounted = false;
    };
  }, [addon.key, installStates[addon.key]?.status]);

  return (
    <div className="mt-5 flex size-full flex-row gap-x-8 text-quasi-white">
      {links.length > 0 && (
        <div>
          <h3 className="font-bold text-white">Links</h3>

          <div className="flex items-center gap-x-3">
            {links.map((it) => (
              <button
                key={it.title}
                className="flex items-center gap-x-5 rounded-md border-2 border-navy-light bg-navy-light px-7 py-4 text-3xl transition-colors duration-100 hover:border-cyan hover:bg-transparent"
                onClick={() => handleClickLink(it)}
              >
                <BoxArrowRight size={24} />

                {it.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {directories.length > 0 && (
        <div>
          <h3 className="font-bold text-white">Directories</h3>

          <div className="flex items-center gap-x-3">
            {directories.map((it) => (
              <button
                key={it.title}
                className={`flex items-center gap-x-5 rounded-md border-2 border-navy-light bg-navy-light px-7 py-4 text-3xl transition-colors duration-100 hover:border-cyan hover:bg-transparent ${directoriesDisabled || !existingDirectories[fulldirectory(it)] ? 'pointer-events-none opacity-60' : ''}`}
                onClick={() => handleClickDirectory(it)}
              >
                <Folder size={24} />

                {it.title}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
