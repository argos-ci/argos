import React from 'react'
import PropTypes from 'prop-types'
import Typography from 'material-ui/Typography'
import Button from 'material-ui/Button'
import Paper from 'material-ui/Paper'
import { withStyles, createStyleSheet } from 'material-ui/styles'
import TextField from 'material-ui/TextField'
import recompact from 'modules/recompact'
import ViewContainer from 'modules/components/ViewContainer'
import ScrollView from 'modules/components/ScrollView'
import LayoutBody from 'modules/components/LayoutBody'
import ReviewAppBar from 'modules/components/ReviewAppBar'

const styleSheet = createStyleSheet('Admin', theme => ({
  padding: {
    padding: theme.spacing.unit * 2,
  },
  textField: {
    width: '100%',
    marginTop: theme.spacing.unit,
    marginBottom: theme.spacing.unit * 2,
  },
}))

function Admin(props) {
  const { classes } = props

  return (
    <ViewContainer>
      <ReviewAppBar />
      <ScrollView>
        <LayoutBody margin marginBottom>
          <Typography type="display1" component="h2" gutterBottom>
            Admin
          </Typography>
          <Typography type="headline" gutterBottom>
            Usurpation
          </Typography>
          <Paper className={classes.padding}>
            <form>
              <TextField className={classes.textField} id="usurpation_email" label="User email" />
              <Button raised color="accent">
                {'Usurp'}
              </Button>
            </form>
          </Paper>
        </LayoutBody>
      </ScrollView>
    </ViewContainer>
  )
}

Admin.propTypes = {
  classes: PropTypes.object.isRequired,
}

export default recompact.compose(withStyles(styleSheet))(Admin)
