import React, { PropTypes } from 'react'
import { withStyles, createStyleSheet } from 'material-ui/styles'
import Layout from 'material-ui/Layout'
import ItemStatus from 'review/modules/components/ItemStatus'
import BuildActions from 'review/routes/build/BuildActions'

function formatShortCommit(sha) {
  return sha.substring(0, 7)
}

const styleSheet = createStyleSheet('BuildSummaryBody', (theme) => {
  return {
    itemStatusChild: {
      width: '100%',
    },
    list: {
      margin: 0,
      listStyle: 'none',
      padding: theme.spacing.unit,
    },
  }
})

export function BuildSummaryBody(props) {
  const {
    build,
    classes,
  } = props

  const {
    createdAt,
    status,
    baseScreenshotBucket,
    compareScreenshotBucket: {
      commit: compareCommit,
      branch,
    },
  } = build

  return (
    <ItemStatus status={status}>
      <div className={classes.itemStatusChild}>
        <Layout container>
          <Layout item xs={12} sm>
            <ul className={classes.list}>
              <li>{`Job status: ${status}`}</li>
              <li>{`Commit: ${formatShortCommit(compareCommit)}`}</li>
              <li>{`Branch: ${branch}`}</li>
              {baseScreenshotBucket ? (
                <li>
                  {`Compare: ${formatShortCommit(baseScreenshotBucket.commit)}...${
                  formatShortCommit(compareCommit)}`}
                </li>
              ) : null}
              <li>{`Date: ${new Intl.DateTimeFormat().format(new Date(createdAt))}`}</li>
            </ul>
          </Layout>
          <Layout item>
            <BuildActions build={build} />
          </Layout>
        </Layout>
      </div>
    </ItemStatus>
  )
}

BuildSummaryBody.propTypes = {
  build: PropTypes.shape({
    createdAt: PropTypes.string.isRequired,
    status: PropTypes.string.isRequired,
    baseScreenshotBucket: PropTypes.object,
    compareScreenshotBucket: PropTypes.object.isRequired,
  }).isRequired,
  classes: PropTypes.object.isRequired,
}

export default withStyles(styleSheet)(BuildSummaryBody)
