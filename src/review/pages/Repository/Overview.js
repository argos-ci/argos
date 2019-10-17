/* eslint-disable react/no-unescaped-entities */
import React from 'react'
import { Link } from 'react-router-dom'
import {
  Container,
  Card,
  CardBody,
  CardTitle,
  CardText,
  FadeLink,
} from 'components'
import { hasWritePermission } from 'modules/permissions'
import { useRepository } from './RepositoryContext'
import { RepositoryEmpty } from './Empty'
import { Build } from './BuildDetail'

export function RepositoryOverview() {
  const repository = useRepository()
  const write = hasWritePermission(repository)
  if (!repository.active) {
    return <RepositoryEmpty />
  }
  if (!repository.overviewBuild) {
    return (
      <Container textAlign="center" my={4}>
        <Card>
          <CardBody>
            <CardTitle>Overview not ready yet</CardTitle>
            <CardText>
              <p>
                The overview will be shown after your first build ran on "
                {repository.baselineBranch}" branch.
              </p>
              {write && (
                <p>
                  If "{repository.baselineBranch}" is not your default branch,
                  you can change it in{' '}
                  <FadeLink
                    forwardedAs={Link}
                    color="white"
                    to={`/gh/${repository.owner.login}/${repository.name}/settings`}
                  >
                    repository settings
                  </FadeLink>
                  .
                </p>
              )}
            </CardText>
          </CardBody>
        </Card>
      </Container>
    )
  }
  return <Build build={repository.overviewBuild} />
}
