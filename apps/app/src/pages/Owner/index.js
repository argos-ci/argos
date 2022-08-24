import React from "react";
import { Helmet } from "react-helmet";
import { OwnerRepositories } from "./Repositories";
import { useParams } from "react-router-dom";
import { OwnerTabs } from "./OwnerTabs";

export function Owner() {
  const { ownerLogin } = useParams();

  return (
    <>
      <Helmet titleTemplate={`%s • ${ownerLogin}`} defaultTitle={ownerLogin} />
      <OwnerTabs />
      <OwnerRepositories />
    </>
  );
}
