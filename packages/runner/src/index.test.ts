import { describe, expect, it } from 'vitest';
import * as runner from './index';

describe('lldlab-runner entry', () => {
  it('exports the public API', () => {
    for (const name of ['executeJs', 'executePython', 'executeGo', 'runTests', 'warmUp', 'setWorkerFactory', 'lockdown', 'cumulativeStarter', 'testsThrough', 'unlockStage', 'runInputFor', 'isReadonly', 'workspacePathError', 'GO_HELPER', 'LANGUAGES']) {
      expect(runner, name).toHaveProperty(name);
    }
  });
});
