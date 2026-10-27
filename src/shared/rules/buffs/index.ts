export {
  POISON_INTERVAL,
  HP_BUFF_REGEN_INTERVAL,
  HP_REGEN_INTERVAL,
  MP_REGEN_INTERVAL,
  SP_REGEN_INTERVAL,
  runRegen,
} from "./regen";
export type { RegenFlags, RegenInput, RegenResult, RegenTimers } from "./regen";
export {
  addBuffBonuses,
  applyBuff,
  checkResting,
  createBuff,
  dispelBuffsByProperty,
  expireBuffByName,
  expireBuffs,
  getBuff,
  hasBuff,
} from "./rules";
export type { ActiveBuff, CreateBuffInput, ExpireBuffsResult, RestingResult } from "./rules";
