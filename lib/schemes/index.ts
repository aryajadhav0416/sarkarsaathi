import { udyamScheme } from './udyam';

export const ACTIVE_SCHEME = 'udyam';

export const schemes: Record<string, any> = {
  udyam: udyamScheme
};

export const activeSchemeConfig = schemes[ACTIVE_SCHEME];
