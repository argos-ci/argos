import { forwardRef } from "react";
import { x } from "@xstyled/styled-components";
import {
  IoCheckmark,
  IoGitBranch,
  IoGitCommit,
  IoPulseOutline,
  IoTimeOutline,
} from "react-icons/io5";
import { FaTimes } from "react-icons/fa";
import { TextIcon } from "./TextIcon";

export const ArgosCard = forwardRef((props, ref) => (
  <x.div
    ref={ref}
    borderLeft="solid 2px"
    color="white"
    borderRadius="4px"
    backgroundColor="blue-gray-700-a70"
    transition="opacity 1200ms 700ms"
    position="relative"
    {...props}
  />
));

export const ArgosCardHeader = forwardRef((props, ref) => (
  <x.div
    ref={ref}
    display="flex"
    justifyContent="space-between"
    alignItems="center"
    borderBottom={1}
    borderColor="secondary"
    p={2}
    {...props}
  />
));

export const ArgosCardTitle = (props) => (
  <x.div fontSize="15px" color="secondary" fontWeight="semibold" {...props} />
);

export const ArgosCardBody = forwardRef((props, ref) => (
  <x.div
    position="relative"
    display="flex"
    py={2}
    px={2}
    ref={ref}
    justifyContent="flex-between"
    gap={{ _: 2, sm: 4 }}
    {...props}
  />
));

export const ArgosApproveButton = forwardRef(
  ({ variant = "success", ...props }, ref) => (
    <x.div
      bg={variant === "success" ? "success" : "warning"}
      ref={ref}
      fontSize="14px"
      px="12px"
      py="4px"
      display="flex"
      gap="4px"
      alignItems="center"
      borderRadius="4px"
      color="white"
      {...props}
    >
      {variant === "success" ? (
        <>
          <x.div as={IoCheckmark} />
          Approved
        </>
      ) : (
        "Mark as approved"
      )}
    </x.div>
  )
);

export const ArgosSummaryCard = (props) => (
  <ArgosCard borderColor="success" {...props}>
    <ArgosCardHeader>
      <ArgosCardTitle>Summary</ArgosCardTitle>
      <ArgosApproveButton variant="success" />
    </ArgosCardHeader>

    <ArgosCardBody alignItems="flex-start" py={1} px={2}>
      <x.div flex={1}>
        <TextIcon
          icon={FaTimes}
          color="success"
          iconStyle={{ w: 3, h: 3, minW: 3, minH: 3, mt: "5px" }}
          w={5}
          mt={0}
        >
          rework-button
        </TextIcon>
        <x.div ml={6} fontSize="sm">
          <TextIcon icon={IoGitCommit} color="secondary">
            Commit 517b9dc
          </TextIcon>
          <TextIcon icon={IoGitBranch} color="secondary">
            Branch rework-button
          </TextIcon>
        </x.div>
      </x.div>

      <x.div display={{ _: "none", sm: "block" }} fontSize="sm">
        <TextIcon icon={IoPulseOutline} mt="1px" color="success">
          #5 success
        </TextIcon>
        <TextIcon icon={IoTimeOutline} color="secondary">
          10 sec ago
        </TextIcon>
      </x.div>
    </ArgosCardBody>
  </ArgosCard>
);
