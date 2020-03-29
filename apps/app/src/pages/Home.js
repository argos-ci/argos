/* eslint-disable react/no-unescaped-entities */
import React from 'react'
import gql from 'graphql-tag'
import { partition } from 'lodash'
import { Link } from 'react-router-dom'
import { Button } from '@smooth-ui/core-sc'
import styled, { Box } from '@xstyled/styled-components'
import { GoRepo } from 'react-icons/go'
import { Query } from '../containers/Apollo'
import { useUser } from '../containers/User'
import { OwnerAvatar } from '../containers/OwnerAvatar'
import { isUserSyncing } from '../modules/user'
import config from '../config'
import {
  Container,
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  CardFooter,
  FadeLink,
  Text,
} from '../components'
import ProductInfo from './ProductInfo'
import { Loader } from '../components/Loader'

const RepositoryList = styled.ul`
  margin: -1 0;
  padding: 0;
`

const RepositoryItem = styled.li`
  margin: 0;
  padding: 1 0;
  list-style-type: none;
`

function OwnerHeader({ owner, active }) {
  return (
    <Box display="flex" alignItems="center">
      <OwnerAvatar
        owner={owner}
        mr={2}
        width={active ? 30 : 20}
        height={active ? 30 : 20}
      />
      <CardTitle color={active ? 'darker' : 'light500'}>
        <FadeLink forwardedAs={Link} to={`/${owner.login}`}>
          {owner.login}
        </FadeLink>
      </CardTitle>
    </Box>
  )
}

function Owners({ data: { owners } }) {
  const [activeOwners, inactiveOwners] = partition(
    owners,
    (owner) => owner.repositories.length,
  )

  return (
    <Container my={3}>
      {activeOwners.length > 0 && (
        <Box row mx={-2} mb={5} justifyContent="center">
          {activeOwners.map((owner) => (
            <Box key={owner.login} col={{ xs: 1, md: 1 / 3 }} p={2}>
              <Card>
                <CardHeader>
                  <OwnerHeader owner={owner} active />
                </CardHeader>
                <CardBody>
                  <RepositoryList>
                    {owner.repositories.length === 0 && (
                      <Box textAlign="center">
                        <FadeLink
                          forwardedAs={Link}
                          color="darker"
                          fontSize={13}
                          to={`/${owner.login}`}
                        >
                          Setup a repository
                        </FadeLink>
                      </Box>
                    )}
                    {owner.repositories.map((repository) => (
                      <RepositoryItem key={repository.id}>
                        <FadeLink
                          forwardedAs={Link}
                          to={`/${owner.login}/${repository.name}/builds`}
                          color="darker"
                          fontWeight="medium"
                          fontSize={16}
                        >
                          {repository.name}
                        </FadeLink>
                      </RepositoryItem>
                    ))}
                  </RepositoryList>
                </CardBody>
                <CardFooter>
                  <Box display="flex" alignItems="center" fontSize={12}>
                    <Box forwardedAs={GoRepo} mr={1} />
                    {owner.repositories.length} active repositor
                    {owner.repositories.length > 1 ? 'ies' : 'y'}
                  </Box>
                </CardFooter>
              </Card>
            </Box>
          ))}
        </Box>
      )}

      {inactiveOwners.length > 0 && (
        <>
          <Text variant="h2" textAlign="center">
            Inactive owners
          </Text>
          <Box row m={-2}>
            {inactiveOwners.map((owner) => (
              <Box key={owner.login} col={1} p={2}>
                <Card>
                  <CardBody p={2}>
                    <OwnerHeader owner={owner} active={false} />
                  </CardBody>
                </Card>
              </Box>
            ))}
          </Box>
        </>
      )}
    </Container>
  )
}

export function Home() {
  const user = useUser()
  if (!user) {
    return <ProductInfo />
  }

  if (!user.installations.length && !isUserSyncing(user)) {
    return (
      <Container textAlign="center" my={4}>
        <p>Look like you don't have installed Argos GitHub App.</p>
        <Button as="a" href={config.get('github.appUrl')}>
          Install Argos GitHub App
        </Button>
      </Container>
    )
  }

  return (
    <Query
      fallback={
        <Container my={3} textAlign="center">
          <Loader />
        </Container>
      }
      query={gql`
        query Owners {
          owners {
            name
            login
            type
            repositories(enabled: true) {
              id
              name
            }
          }
        }
      `}
    >
      {(data) => <Owners data={data} />}
    </Query>
  )
}
