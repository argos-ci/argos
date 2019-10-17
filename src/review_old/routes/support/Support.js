import React from 'react'
import ViewContainer from 'modules/components/ViewContainer'
import ScrollView from 'modules/components/ScrollView'
import MarkdownElement from 'modules/components/MarkdownElement'
import LayoutBody from 'modules/components/LayoutBody'
import ReviewAppBar from 'review/modules/components/ReviewAppBar'
import ProductHeader from 'review/modules/components/ProductHeader'
import ProductFooter from 'review/modules/components/ProductFooter'
import support from './support.md'

function Support() {
  return (
    <ViewContainer>
      <ReviewAppBar />
      <ScrollView>
        <ProductHeader
          display1="Help and Support"
          headline="From community help to premium support, we’re here to help."
        />
        <LayoutBody margin marginBottom>
          <MarkdownElement text={support} />
        </LayoutBody>
        <ProductFooter />
      </ScrollView>
    </ViewContainer>
  )
}

export default Support
