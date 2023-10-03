export const getCommentHeader = () => {
  return "**The latest updates on your projects.** Learn more about [Argos notifications ↗︎](https://argos-ci.com/docs/notifications)";
};

export const getPendingCommentBody = () => {
  return [getCommentHeader(), "", "Waiting for the first build to start…"].join(
    "\n",
  );
};
