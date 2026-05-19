import { Directories } from 'renderer/utils/Directories';
import { Addon, AddonIncompatibleAddon } from 'renderer/utils/InstallerConfiguration';
import path from 'path';
import semverSatisfies from 'semver/functions/satisfies';
import { native } from 'renderer/platform/native';

export class IncompatibleAddOnsCheck {
  /**
   * Find incompatible add-ons
   * This iterates through the first level of folders of the  MSFS Community folder looking for the manifest.json
   * file. It compares the manifest.json file content with the configured incompatible add-ons (data.ts) and if it
   * finds one or more matches, it will issue a warning.
   */
  static async checkIncompatibleAddOns(addon: Addon): Promise<AddonIncompatibleAddon[]> {
    console.log('Searching incompatible add-ons');

    const incompatibleAddons: AddonIncompatibleAddon[] = [];
    const manifestFileName = 'manifest.json';
    const comDir = Directories.communityLocation(addon.simulator);

    try {
      const addonFolders = await native.readDir(comDir);

      for (const entry of addonFolders) {
        const filePath = path.join(comDir, entry.name);

        if (entry.isDirectory) {
          const dirEntries = await native.readDir(filePath);

          if (dirEntries.some((dirEntry) => dirEntry.name === manifestFileName)) {
            try {
              const manifest = JSON.parse(await native.readText(path.join(filePath, manifestFileName)));

              for (const item of addon.incompatibleAddons) {
                // This checks the configuration item properties (if set) against the manifest.json file
                // entry property values. If all properties match, the add-on is considered incompatible.
                // packageVersion syntax follows: https://www.npmjs.com/package/semver
                // Future improvement would be to allow for regular expressions in the configuration item.
                const titleMatches = !item.title || manifest.title === item.title;
                const creatorMatches = !item.creator || manifest.creator === item.creator;
                const packageVersionTargeted =
                  !item.packageVersion || semverSatisfies(manifest.package_version, item.packageVersion);

                if (titleMatches && creatorMatches && packageVersionTargeted) {
                  // Also write this to the log as this info might be useful for support.
                  console.log(`Incompatible Add-On found: ${manifest.title}: ${item.description}`);

                  incompatibleAddons.push({
                    title: item.title,
                    creator: item.creator,
                    packageVersion: item.packageVersion,
                    folder: entry.name,
                    description: item.description,
                  });
                }
              }
            } catch (e) {
              console.warn(`Failed to read or parse manifest.json in ${filePath}:`, e.message);
            }
          }
        }
      }
    } catch (e) {
      console.error('Error searching incompatible add-ons in %s: %s', comDir, e);
    }

    if (incompatibleAddons.length > 0) {
      console.log('Incompatible add-ons found');
    } else {
      console.log('No incompatible add-ons found');
    }

    return incompatibleAddons;
  }
}
