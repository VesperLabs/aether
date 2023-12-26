import { QUEST_EXP_MULTIPLIER, QUEST_GOLD_MULTIPLIER, cloneObject } from "./utils";
import questList from "../shared/data/questList.json";
import Quest from "./Quest";
import ItemBuilder from "../shared/ItemBuilder";

const QuestBuilder = {
  buildQuest: function (key: string) {
    const quest = questList[key];
    const questData: Quest = {
      id: key,
      ...cloneObject(quest),
      objectives: quest?.objectives?.map((o: Quest, idx) => {
        return cloneObject({ ...o, questId: key, id: idx });
      }),
      rewards: {
        exp: quest?.level * QUEST_EXP_MULTIPLIER,
        gold: quest?.level * QUEST_GOLD_MULTIPLIER,
        items: quest?.rewards?.items?.map((item: BuildItem) => ItemBuilder.buildItem(...item)),
      },
    };
    return new Quest(questData);
  },
  buildAllQuests: function () {
    const quests = {};
    for (const key in questList) {
      quests[key] = this.buildQuest(key);
    }
    return quests;
  },
};

export default QuestBuilder;
