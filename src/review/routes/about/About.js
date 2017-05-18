import React from 'react'
import ViewContainer from 'modules/components/ViewContainer'
import ScrollView from 'modules/components/ScrollView'
import MarkdownElement from 'modules/components/MarkdownElement'
import LayoutBody from 'modules/components/LayoutBody'
import ReviewAppBar from 'modules/components/ReviewAppBar'
import ProductHeader from 'modules/components/ProductHeader'
import ProductFooter from 'modules/components/ProductFooter'
import about from './about.md'

function About() {
  return (
    <ViewContainer>
      <ReviewAppBar />
      <ScrollView>
        <ProductHeader
          display1="All about Argos CI"
          headline="💅"
        />
        <LayoutBody margin>
          <MarkdownElement text={about} />
        </LayoutBody>
        <ProductFooter />
      </ScrollView>
    </ViewContainer>
  )
}

export default About
