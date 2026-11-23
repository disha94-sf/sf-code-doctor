import { Rule } from '../types';
import { hardcodedIdRule } from './hardcoded-id';
import { missingSharingRule } from './missing-sharing';
import { soqlDmlInLoopRule } from './soql-dml-in-loop';

/** Every rule the scanner knows about. Add new rules here. */
export const allRules: Rule[] = [hardcodedIdRule, soqlDmlInLoopRule, missingSharingRule];
