import { cloneObject } from "./utils";
import questList from "../shared/data/questList.json";
import Quest from "./Quest";

const QuestBuilder = {
  buildQuest: function (key: string) {
    const quest = questList[key];
    const questData: Quest = {
      id: key,
      ...cloneObject(quest),
      objectives: quest?.objectives?.map((o: Quest, idx) => {
        return cloneObject({ ...o, questId: key, id: idx });
      }),
    };
    return new Quest(questData);
  },
};

export default QuestBuilder;
