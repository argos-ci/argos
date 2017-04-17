import React from 'react'
import PropTypes from 'prop-types'
import { withStyles, createStyleSheet } from 'material-ui/styles'
import Layout from 'material-ui/Layout'
import Link from 'modules/components/Link'
import ItemStatus from 'review/modules/components/ItemStatus'
import BuildActions from 'review/routes/build/BuildActions'

function formatShortCommit(sha) {
  return sha.substring(0, 7)
}

const styleSheet = createStyleSheet('BuildSummaryBody', theme => ({
  itemStatusChild: {
    width: '100%',
  },
  list: {
    margin: 0,
    listStyle: 'none',
    padding: theme.spacing.unit,
  },
}))

export function BuildSummaryBodyView(props) {
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
    repository: {
      name,
      owner: {
        login,
      },
    },
  } = build

  const githubBaseUrl = `https://github.com/${login}/${name}`
  let compare

  if (baseScreenshotBucket) {
    const compareFormated = `${formatShortCommit(baseScreenshotBucket.commit)}...${
      formatShortCommit(compareCommit)}`
    compare = (
      <li>
        <Link href={`${githubBaseUrl}/compare/${compareFormated}`}>
          {`Compare ${compareFormated}`}
        </Link>
      </li>
    )
  }

  return (
    <ItemStatus status={status}>
      <div className={classes.itemStatusChild}>
        <Layout container>
          <Layout item xs={12} sm>
            <ul className={classes.list}>
              <li>{`Job status: ${status}`}</li>
              <li>
                <Link href={`${githubBaseUrl}/commit/${compareCommit}`}>
                  {`Commit ${formatShortCommit(compareCommit)}`}
                </Link>
              </li>
              <li>
                <Link href={`${githubBaseUrl}/tree/${branch}`}>
                  {`Branch ${branch}`}
                </Link>
              </li>
              {compare}
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

BuildSummaryBodyView.propTypes = {
  build: PropTypes.shape({
    createdAt: PropTypes.string.isRequired,
    status: PropTypes.string.isRequired,
    baseScreenshotBucket: PropTypes.object,
    compareScreenshotBucket: PropTypes.object.isRequired,
    repository: PropTypes.shape({
      name: PropTypes.string.isRequired,
      owner: PropTypes.shape({
        login: PropTypes.string.isRequired,
      }).isRequired,
    }).isRequired,
  }).isRequired,
  classes: PropTypes.object.isRequired,
}

export default withStyles(styleSheet)(BuildSummaryBodyView)
