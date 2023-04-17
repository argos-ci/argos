/* eslint-disable react/no-unescaped-entities */
import { Helmet } from "react-helmet";
import { Link as RouterLink } from "react-router-dom";

import { Alert, AlertActions, AlertText, AlertTitle } from "@/ui/Alert";
import { Button } from "@/ui/Button";
import { Container } from "@/ui/Container";

type Link = {
  to: string;
  label: string;
};

export const Forbidden = ({ link }: { link?: Link }) => {
  return (
    <Container>
      <Helmet>
        <title>Access forbidden</title>
      </Helmet>
      <Alert>
        <AlertTitle>Access forbidden</AlertTitle>
        <AlertText>You don't have permission to view this page.</AlertText>
        <AlertActions>
          <Button>
            {(buttonProps) =>
              link ? (
                <RouterLink to={link.to} {...buttonProps}>
                  {link.label}
                </RouterLink>
              ) : (
                <RouterLink to="/" {...buttonProps}>
                  Back to home
                </RouterLink>
              )
            }
          </Button>
        </AlertActions>
      </Alert>
    </Container>
  );
};
