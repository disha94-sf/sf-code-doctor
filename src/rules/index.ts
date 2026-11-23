import { Rule } from '../types';
import { hardcodedIdRule } from './hardcoded-id';

/** Every rule the scanner knows about. Add new rules here. */
export const allRules: Rule[] = [hardcodedIdRule];
