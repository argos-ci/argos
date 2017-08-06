import React from 'react'
import Grid from 'material-ui/Grid'
import ViewContainer from 'modules/components/ViewContainer'
import ScrollView from 'modules/components/ScrollView'
import MarkdownElement from 'modules/components/MarkdownElement'
import LayoutBody from 'modules/components/LayoutBody'
import ReviewAppBar from 'review/modules/components/ReviewAppBar'
import ProductHeader from 'review/modules/components/ProductHeader'
import ProductFooter from 'review/modules/components/ProductFooter'
import privacy from './privacy.md'

const contact = `
### Contact

If you have any questions or concerns about our Privacy Policy, please contact us at:

Email Address:<br />
**[julia@argos-ci.com](mailto:julia@argos-ci.com)**

Mailing Address:<br />
**10 boulevard de la libération, 78220 VIROFLAY, FRANCE**
`

function Privacy() {
  return (
    <ViewContainer>
      <ReviewAppBar />
      <ScrollView>
        <ProductHeader
          display1="Privacy Policy"
          headline="Argos CI is committed to protecting and respecting your privacy."
        />
        <LayoutBody margin marginBottom>
          <Grid container spacing={24}>
            <Grid item xs={12} sm={3}>
              <MarkdownElement text={contact} />
            </Grid>
            <Grid item xs={12} sm={9}>
              <MarkdownElement text={privacy} />
            </Grid>
          </Grid>
        </LayoutBody>
        <ProductFooter />
      </ScrollView>
    </ViewContainer>
  )
}

export default Privacy
