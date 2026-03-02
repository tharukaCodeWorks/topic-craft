import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import os from 'os';

const execAsync = promisify(exec);

export const cliService = {
  async checkNodeInstallation(): Promise<boolean> {
    try {
      // Execute node --version to see if it's available in PATH
      const { stdout } = await execAsync('node --version');
      return stdout.trim().startsWith('v');
    } catch (error) {
      console.error('Node.js is not installed or not in PATH:', error);
      return false;
    }
  },

  async checkInstallation(): Promise<boolean> {
    try {
      // Execute gemini --version to see if it's available in PATH
      const { stdout } = await execAsync('gemini --version');
      return stdout.trim().length > 0;
    } catch (error) {
      console.error('Gemini CLI is not installed:', error);
      return false;
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
