import React from 'react'
import ViewContainer from 'modules/components/ViewContainer'
import ScrollView from 'modules/components/ScrollView'
import ReviewAppBar from 'modules/components/ReviewAppBar'
import ProductHeader from 'modules/components/ProductHeader'
import ProductFooter from 'modules/components/ProductFooter'

function Documentation() {
  return (
    <ViewContainer>
      <ReviewAppBar />
      <ScrollView>
        <ProductHeader display1="Documentation" headline="This is work in progress…" />
        <ProductFooter />
      </ScrollView>
    </ViewContainer>
  )
}

export default Documentation
