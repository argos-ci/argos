import React, { Component, PropTypes } from 'react';
import { connect } from 'react-redux';
import Text from 'material-ui-build-next/src/Text';
import Toolbar from 'material-ui-build-next/src/Toolbar';
import actionTypes from 'review/redux/actionTypes';
import ViewContainer from 'modules/components/ViewContainer';
import LayoutAppBar from 'modules/components/LayoutAppBar';
import ScrollView from 'modules/components/ScrollView';
import LayoutBody from 'modules/components/LayoutBody';
import BuildSummary from 'review/routes/build/Summary';
import BuildScreenshots from 'review/routes/build/Screenshots';

class Build extends Component {
  static propTypes = {
    dispatch: PropTypes.func.isRequired,
    params: PropTypes.shape({
      buildId: PropTypes.string.isRequired,
      profileId: PropTypes.string.isRequired,
      repositoryId: PropTypes.string.isRequired,
    }).isRequired,
  }

  componentDidMount() {
    this.props.dispatch({
      type: actionTypes.BUILD_FETCH,
      payload: {
        buildId: this.props.params.buildId,
      },
    });
  }

  render() {
    const {
      profileId,
      repositoryId,
    } = this.props.params;

    return (
      <ViewContainer>
        <LayoutAppBar>
          <Toolbar>
            <Text type="title" colorInherit>
              {'Argos'}
            </Text>
          </Toolbar>
        </LayoutAppBar>
        <ScrollView>
          <LayoutBody margin>
            <Text type="display1" gutterBottom>
              {`${profileId}/${repositoryId}`}
            </Text>
            <BuildSummary />
            <BuildScreenshots />
          </LayoutBody>
        </ScrollView>
      </ViewContainer>
    );
  }
}

export default connect()(Build);
