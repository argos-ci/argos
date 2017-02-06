import React from 'react'
import Text from 'material-ui/Text'
import ViewContainer from 'modules/components/ViewContainer'
import ScrollView from 'modules/components/ScrollView'
import LayoutBody from 'modules/components/LayoutBody'
import ReviewAppBar from 'review/modules/AppBar/AppBar'

function NotFound() {
  return (
    <ViewContainer>
      <ReviewAppBar />
      <ScrollView>
        <LayoutBody margin>
          <Text type="display1" component="h2" gutterBottom>
            {'404: Something\'s Missing'}
          </Text>
          <Text type="subheading">
            {'We\'re sorry! It seems like this page cannot be found.'}
          </Text>
        </LayoutBody>
      </ScrollView>
    </ViewContainer>
  )
}

export default NotFound
