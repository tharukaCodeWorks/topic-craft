import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import os from 'os';

const execAsync = promisify(exec);

/**
 * Robustly resolve the system PATH for GUI applications on macOS/Linux.
 * Also includes common global npm paths on Windows.
 */
export async function getResolvedEnv(): Promise<NodeJS.ProcessEnv> {
  const env = { ...process.env };
  const paths = new Set<string>(env.PATH ? env.PATH.split(path.delimiter) : []);

  if (os.platform() === 'darwin' || os.platform() === 'linux') {
    // Standard Unix locations often missing in GUI PATH
    ['/usr/local/bin', '/usr/bin', '/bin', '/usr/sbin', '/sbin'].forEach((p) =>
      paths.add(p),
    );

    // macOS specific (Homebrew, MacPorts, etc.)
    if (os.platform() === 'darwin') {
      ['/opt/homebrew/bin', '/usr/local/sbin', '/opt/local/bin'].forEach((p) =>
        paths.add(p),
      );
    }

    // Try to get PATH from shell if possible
    try {
      const shell = process.env.SHELL || '/bin/bash';
      const { stdout } = await execAsync(`${shell} -ilc 'echo $PATH'`, {
        timeout: 1000,
      });
      if (stdout.trim()) {
        stdout
          .trim()
          .split(':')
          .forEach((p) => paths.add(p));
      }
    } catch (e) {
      // Ignore shell errors
    }
  } else if (os.platform() === 'win32') {
    // Windows common npm/node paths
    const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
    paths.add(path.join(appData, 'npm'));
    paths.add(path.join(process.env.ProgramFiles || 'C:\\Program Files', 'nodejs'));
  }

  env.PATH = Array.from(paths).join(path.delimiter);
  return env;
}

export const cliService = {
  async checkNodeInstallation(): Promise<boolean> {
    try {
      const env = await getResolvedEnv();
      const { stdout } = await execAsync('node --version', { env });
      return stdout.trim().startsWith('v');
    } catch (error) {
      console.error('Node.js is not installed or not in PATH:', error);
      return false;
    }
  },

  async checkInstallation(): Promise<boolean> {
    try {
      console.log('Attempting to execute "gemini --version" to check installation...');
      const env = await getResolvedEnv();
      // Execute gemini --version to see if it's available in PATH
      const { stdout, stderr } = await execAsync('gemini --version', { env });
      console.log('Successfully executed "gemini --version". Stdout:', stdout, 'Stderr:', stderr);
      return stdout.trim().length > 0;
    } catch (error: any) {
      console.error('Gemini CLI execution failed (not installed or error in execution):', {
        message: error.message,
        code: error.code,
        stdout: error.stdout,
        stderr: error.stderr,
      });

      // Fallback: Check if we can find 'gemini' in the path manually
      try {
        const env = await getResolvedEnv();
        const checkCmd = os.platform() === 'win32' ? 'where gemini' : 'which gemini';
        const { stdout } = await execAsync(checkCmd, { env });
        return stdout.trim().length > 0;
      } catch (fallbackError) {
        return false;
      }
    }
  },

  async checkAuth(): Promise<boolean> {
    try {
      // The Gemini CLI stores credentials in ~/.gemini
      const geminiDir = path.join(os.homedir(), '.gemini');

      const hasOauthCreds = fs.existsSync(
        path.join(geminiDir, 'oauth_creds.json'),
      );
      const hasGoogleAccounts = fs.existsSync(
        path.join(geminiDir, 'google_accounts.json'),
      );

      // We consider it signed in if credential files exist
      return hasOauthCreds || hasGoogleAccounts;
    } catch (error) {
      console.error('Failed to check Gemini CLI auth status:', error);
      return false;
    }
  },
};

