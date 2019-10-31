/* eslint-disable react/no-unescaped-entities */
import React from 'react'
import gql from 'graphql-tag'
import { Link } from 'react-router-dom'
import styled, { Box } from '@xstyled/styled-components'
import { Query } from 'containers/Apollo'
import { GoRepo } from 'react-icons/go'
import { useUser } from 'containers/User'
import { OwnerAvatar } from 'containers/OwnerAvatar'
import {
  Container,
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  CardFooter,
  FadeLink,
} from 'components'
import ProductInfo from './ProductInfo'

const RepositoryList = styled.ul`
  margin: -1 0;
  padding: 0;
`

const RepositoryItem = styled.li`
  margin: 0;
  padding: 1 0;
  list-style-type: none;
`

export function Home() {
  const user = useUser()
  if (!user) {
    return <ProductInfo />
  }

  return (
    <Query
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
      {({ owners }) => {
        return (
          <Container my={3}>
            <Box row m={-2} justifyContent="center">
              {owners.map(owner => (
                <Box col={{ xs: 1, md: 1 / 3 }} p={2} key={owner.login}>
                  <Card>
                    <CardHeader display="flex" alignItems="center">
                      <OwnerAvatar owner={owner} mr={2} />
                      <FadeLink
                        forwardedAs={Link}
                        color="darker"
                        to={`/${owner.login}`}
                      >
                        <CardTitle>{owner.login}</CardTitle>
                      </FadeLink>
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
                        {owner.repositories.map(repository => (
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
                        {owner.repositories.length} repositor
                        {owner.repositories.length > 1 ? 'ies' : 'y'}
                      </Box>
                    </CardFooter>
                  </Card>
                </Box>
              ))}
            </Box>
          </Container>
        )
      }}
    </Query>
  )
}
