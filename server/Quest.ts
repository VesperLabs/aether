class Quest {
  id: string;
  name: string;
  dialogues: string;
  objectives: Array<any>;
  rewards: Record<string, any>;
  constructor(args: Quest) {
    this.id = args?.id;
    this.name = args?.name;
    this.dialogues = args?.dialogues;
    this.rewards = {
      exp: args?.rewards?.exp,
      gold: args?.rewards?.gold,
      items: args?.rewards?.items,
    };
    this.objectives = args?.objectives;
  }
}

export default Quest;
