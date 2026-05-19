import { native } from 'renderer/platform/native';

export class McduServer {
  static async isRunning(): Promise<boolean> {
    return native.tcpPortOpen(8380);
  }
}
