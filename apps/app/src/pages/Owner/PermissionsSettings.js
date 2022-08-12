import React from "react";
import { Helmet } from "react-helmet";
import { Box, Button } from "@smooth-ui/core-sc";
import config from "../../config";
import { Card, CardBody, CardText } from "../../components";
import { Text } from "../../components/Text";

export function PermissionsSettings() {
  return (
    <Box>
      <Helmet>
        <title>Repositories Permissions</title>
      </Helmet>

      <Text variant="h1">Repositories Permissions</Text>
      <Card>
        <CardBody>
          <CardText mt={0}>
            For now, Argos uses OAuth GitHub App, you can’t manage permission
            per repository but you can block the entire access to Argos using
            the following link.
          </CardText>
          <Button
            as="a"
            target="_blank"
            rel="noopener noreferrer"
            href={config.get("github.appUrl")}
          >
            Manage permissions
          </Button>
        </CardBody>
      </Card>
    </Box>
  );
}
