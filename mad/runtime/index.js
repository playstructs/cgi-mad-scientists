// The Mad Scientists overlay's runtime, loaded ahead of structs-webapp's entry.
//
// __mad.guild is the guild this page plays through, Mad Scientists (guild.js),
// __mad.recovery moves a recovered player of another guild into it
// (recovery.js), __mad.pfp shows players' own pictures (pfp.js) and
// __mad.scientists lets a player pick their Mad Scientist at sign-up
// (scientists.js). mad/patches.cjs points webapp's code at them.
// __mad.account creates the account at sign-up without showing its recovery
// key, and offers Download Player in place of Log Out (account.js).
import {guild} from './guild.js';
import {recovery} from './recovery.js';
import * as pfp from './pfp.js';
import {scientists} from './scientists.js';
import {account} from './account.js';

globalThis.__mad = Object.freeze({guild, recovery, pfp: Object.freeze({...pfp}), scientists, account});
