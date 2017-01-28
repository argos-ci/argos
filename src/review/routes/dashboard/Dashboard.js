import React from 'react'
import { Link as LinkRouter } from 'react-router'
import Text from 'material-ui-build-next/src/Text'
import Link from 'modules/components/Link'
import ViewContainer from 'modules/components/ViewContainer'
import ScrollView from 'modules/components/ScrollView'
import LayoutBody from 'modules/components/LayoutBody'
import ReviewAppBar from 'review/modules/AppBar/AppBar'

function Dashboard() {
  return (
    <ViewContainer>
      <ReviewAppBar />
      <ScrollView>
        <LayoutBody margin>
          <Text type="display1" component="h2" gutterBottom>
            {'Dashboard'}
          </Text>
          <div>
            <Text>
              {'callemall'}
            </Text>
            <ul>
              <li>
                <Text>
                  <Link component={LinkRouter} to="/callemall/material-ui">
                    {'material-ui'}
                  </Link>
                </Text>
              </li>
            </ul>
          </div>
        </LayoutBody>
      </ScrollView>
    </ViewContainer>
  )
}

export default Dashboard
