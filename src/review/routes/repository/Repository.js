import React, { PropTypes } from 'react'
import { Link as LinkRouter } from 'react-router'
import Text from 'material-ui/Text'
import Layout from 'material-ui/Layout'
import ViewContainer from 'modules/components/ViewContainer'
import Link from 'modules/components/Link'
import ScrollView from 'modules/components/ScrollView'
import LayoutBody from 'modules/components/LayoutBody'
import ReviewAppBar from 'review/modules/AppBar/AppBar'

function Repository(props) {
  const {
    params: {
      profileName,
      repositoryName,
    },
    children,
  } = props

  return (
    <ViewContainer>
      <ReviewAppBar />
      <ScrollView>
        <LayoutBody margin>
          <Layout container gutter={24}>
            <Layout item xs={12}>
              <Text type="display1" component="h2">
                <Link component={LinkRouter} to={`/${profileName}`}>
                  {profileName}
                </Link>
                /
                <Link component={LinkRouter} to={`/${profileName}/${repositoryName}`}>
                  {repositoryName}
                </Link>
              </Text>
            </Layout>
            <Layout item xs={12}>
              {children}
            </Layout>
          </Layout>
        </LayoutBody>
      </ScrollView>
    </ViewContainer>
  )
}

Repository.propTypes = {
  children: PropTypes.element.isRequired,
  params: PropTypes.shape({
    profileName: PropTypes.string.isRequired,
    repositoryName: PropTypes.string.isRequired,
  }).isRequired,
}

export default Repository
