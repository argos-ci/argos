import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { Field, reduxForm, SubmissionError } from 'redux-form'
import { gql, graphql } from 'react-apollo'
import Typography from 'material-ui/Typography'
import Button from 'material-ui/Button'
import Paper from 'material-ui/Paper'
import { withStyles } from 'material-ui/styles'
import recompact from 'modules/recompact'
import { email, required } from 'modules/form/validation'
import ViewContainer from 'modules/components/ViewContainer'
import ScrollView from 'modules/components/ScrollView'
import LayoutBody from 'modules/components/LayoutBody'
import { SCOPES } from 'server/constants'
import ReviewAppBar from 'review/modules/components/ReviewAppBar'
import RFTextField from 'review/modules/components/RFTextField'
import restrictedPage from 'review/modules/components/restrictedPage'

function validate(values) {
  const errors = required(['email'], values)

  if (!errors.email) {
    errors.email = email(values.email)
  }

  return errors
}

const styles = theme => ({
  padding: {
    padding: theme.spacing.unit * 2,
  },
  textField: {
    width: '100%',
    marginTop: theme.spacing.unit,
    marginBottom: theme.spacing.unit * 2,
  },
})

class Admin extends Component {
  handleSubmit = async values => {
    const response = await this.props.createAction({
      variables: {
        input: values,
      },
    })

    if (response.data.usurpUser) {
      window.location = '/'
      return
    }

    throw new SubmissionError({
      _error: 'An unknown error happened',
    })
  }

  render() {
    const { classes, error, handleSubmit, submitting } = this.props

    return (
      <ViewContainer>
        <ReviewAppBar />
        <ScrollView>
          <LayoutBody margin marginBottom>
            <Typography variant="display1" component="h2" gutterBottom>
              Admin
            </Typography>
            <Typography variant="headline" gutterBottom>
              Usurpation
            </Typography>
            <Paper className={classes.padding}>
              <form onSubmit={handleSubmit(this.handleSubmit)} className={classes.form}>
                <Field
                  className={classes.textField}
                  autoFocus
                  disabled={submitting}
                  component={RFTextField}
                  required
                  name="email"
                  autoComplete="email"
                  label={'Email address'}
                  marginForm
                />
                {error && <Typography gutterBottom>{error}</Typography>}
                <Button disabled={submitting} raised color="secondary" type="submit">
                  {'Usurp'}
                </Button>
              </form>
            </Paper>
          </LayoutBody>
        </ScrollView>
      </ViewContainer>
    )
  }
}

Admin.propTypes = {
  classes: PropTypes.object.isRequired,
  createAction: PropTypes.func.isRequired,
  error: PropTypes.bool.isRequired,
  handleSubmit: PropTypes.func.isRequired,
  submitting: PropTypes.bool.isRequired,
}

const usurpUser = gql`
  mutation usurpUser($input: UsurpUserInputType!) {
    usurpUser(input: $input) {
      id
    }
  }
`
export default recompact.compose(
  restrictedPage({
    scopes: [SCOPES.SUPER_ADMIN],
  }),
  withStyles(styles),
  graphql(usurpUser, {
    name: 'createAction',
  }),
  reduxForm({
    form: 'adminUsurpation',
    validate,
  })
)(Admin)
