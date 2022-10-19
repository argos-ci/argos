import * as React from "react";
import { factory } from "factory-girl";
import { InfiniteList } from "@argos-ci/app/src/components/List";

function getSortedData() {
  return Array.from({ length: 100 })
    .map(() => {
      const name = factory.chance("name")();
      return { value: name, group: name[0] };
    })
    .sort((itemA, itemB) => itemA.value.localeCompare(itemB.value));
}

export function Main() {
  const data = getSortedData();
  return <InfiniteList data={data} groupField="group" height={400} />;
}

export default { title: "Virtualized list" };
