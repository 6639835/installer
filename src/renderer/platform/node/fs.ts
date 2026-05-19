import { native } from '../native';

export const exists = native.exists;
export const readText = native.readText;
export const writeText = native.writeText;
export const createDirAll = native.createDirAll;
export const remove = native.remove;
export const readDir = native.readDir;
export const readLink = native.readLink;

export default {
  exists,
  readText,
  writeText,
  createDirAll,
  remove,
  readDir,
  readLink,
};
