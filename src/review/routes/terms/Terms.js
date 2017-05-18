import React from 'react'
import ViewContainer from 'modules/components/ViewContainer'
import ScrollView from 'modules/components/ScrollView'
import MarkdownElement from 'modules/components/MarkdownElement'
import LayoutBody from 'modules/components/LayoutBody'
import ReviewAppBar from 'modules/components/ReviewAppBar'
import ProductHeader from 'modules/components/ProductHeader'
import ProductFooter from 'modules/components/ProductFooter'
import terms from './terms.md'

function Terms() {
  return (
    <ViewContainer>
      <ReviewAppBar />
      <ScrollView>
        <ProductHeader
          display1="Terms and Conditions"
          headline="License Agreement"
        />
        <LayoutBody margin>
          <MarkdownElement text={terms} />
        </LayoutBody>
        <ProductFooter />
      </ScrollView>
    </ViewContainer>
  )
}

export default Terms
