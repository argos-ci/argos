import React from 'react'
import ViewContainer from 'modules/components/ViewContainer'
import ScrollView from 'modules/components/ScrollView'
import ReviewAppBar from 'review/modules/components/AppBar'
import ProductHeader from 'review/modules/components/ProductHeader'
import ProductFooter from 'review/modules/components/ProductFooter'

function Documentation() {
  return (
    <ViewContainer>
      <ReviewAppBar />
      <ScrollView>
        <ProductHeader
          display1="Documentation"
          headline=""
        />
        <ProductFooter />
      </ScrollView>
    </ViewContainer>
  )
}

export default Documentation
