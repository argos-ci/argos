import { featureGuardHoc } from "@/containers/FeatureFlag";

/** @route */
export const Component = featureGuardHoc("test-details")(function Component() {
  return <div>Test page</div>;
});
