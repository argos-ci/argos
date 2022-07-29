import { useState } from "react";
import { x } from "@xstyled/styled-components";
import { Button } from "@components/Button";
import { GithubMergeStatus } from "@components/Github";

export const GithubClickableStatus = (props) => {
  const [githubStatus, setGithubStatus] = useState("error");

  return (
    <x.div {...props}>
      <Button
        mb={4}
        onClick={() => setGithubStatus("success")}
        disabled={githubStatus === "success"}
      >
        Approve screenshot diffs
      </Button>
      <GithubMergeStatus status={githubStatus} />
    </x.div>
  );
};
