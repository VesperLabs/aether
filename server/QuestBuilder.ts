import questList from "../shared/data/questList.json";
import Quest from "./Quest";

const QuestBuilder = {
  buildQuest: function (key: string) {
    const questData: Quest = { id: key, ...questList[key] };
    return new Quest(questData);
  },
};

export default QuestBuilder;
