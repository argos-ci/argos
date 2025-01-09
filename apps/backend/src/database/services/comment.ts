export const getCommentHeader = () => {
  return "**The latest updates on your projects.** Learn more about [Argos notifications ↗︎](https://argos-ci.com/docs/notifications)";
};

export const getPendingCommentBody = () => {
  return [
    getCommentHeader(),
    "",
    "Awaiting the start of a new Argos build…",
  ].join("\n");
};
