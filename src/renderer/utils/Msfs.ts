import { native } from 'renderer/platform/native';

export class Msfs {
  static async isRunning(): Promise<boolean> {
    return native.tcpPortOpen(500);
  }
}
