import { useEffect, useState } from 'react';
import settings from 'renderer/rendererSettings';
import { Directories } from 'renderer/utils/Directories';
import { Simulators, TypeOfSimulator } from 'renderer/utils/SimManager';
import { native } from 'renderer/platform/native';

export const useErrors = () => {
  const [errors, setErrors] = useState({
    noSimInstalled: false,
    msfs2020BasePathError: false,
    msfs2024BasePathError: false,
    msfs2020InstallError: false,
    msfs2024InstallError: false,
    tempLocationError: false,
  });

  const hasBasePathError = async (sim: TypeOfSimulator) =>
    settings.get(`mainSettings.simulator.${sim}.enabled`) &&
    ((!(await native.exists(Directories.simulatorBasePath(sim))) &&
      Directories.simulatorBasePath(sim) !== 'notInstalled') ||
      Directories.simulatorBasePath(sim) === null);

  const hasInstallError = async (sim: TypeOfSimulator) =>
    settings.get(`mainSettings.simulator.${sim}.enabled`) &&
    (!(await native.exists(Directories.installLocation(sim))) ||
      Directories.installLocation(sim) === null ||
      !(await native.exists(Directories.communityLocation(sim))));

  useEffect(() => {
    let mounted = true;

    const checkErrors = async () => {
      const noSimInstalled =
        !settings.get(`mainSettings.simulator.${Simulators.Msfs2020}.enabled`) &&
        !settings.get(`mainSettings.simulator.${Simulators.Msfs2024}.enabled`);

      const msfs2020BasePathError = await hasBasePathError(Simulators.Msfs2020);
      const msfs2024BasePathError = await hasBasePathError(Simulators.Msfs2024);

      const msfs2020InstallError = await hasInstallError(Simulators.Msfs2020);
      const msfs2024InstallError = await hasInstallError(Simulators.Msfs2024);

      const tempLocationError = !(await native.exists(settings.get('mainSettings.tempLocation')));

      if (mounted) {
        setErrors({
          noSimInstalled,
          msfs2020BasePathError,
          msfs2024BasePathError,
          msfs2020InstallError,
          msfs2024InstallError,
          tempLocationError,
        });
      }
    };

    void checkErrors();

    return () => {
      mounted = false;
    };
  }, []);

  return errors;
};
