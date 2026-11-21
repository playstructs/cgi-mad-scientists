// The Mad Scientists overlay's runtime, loaded ahead of structs-webapp's entry.
//
// __mad.guild is the guild this page plays through, Mad Scientists (guild.js), and
// __mad.recovery moves a recovered player of another guild into it
// (recovery.js). mad/patches.cjs points webapp's code at both.
import {guild} from './guild.js';
import {recovery} from './recovery.js';

globalThis.__mad = Object.freeze({guild, recovery});
