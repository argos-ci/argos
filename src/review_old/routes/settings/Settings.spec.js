import React from 'react'
import { createShallow } from 'material-ui/test-utils'
import Settings from './Settings'

describe('<Settings />', () => {
  let shallow
  let fetch
  let params

  beforeAll(() => {
    shallow = createShallow({
      context: {
        store: {
          subscribe: () => {},
          dispatch: () => {},
          getState: () => ({
            ui: {
              repository: {
                fetch,
              },
            },
          }),
        },
      },
    })
    params = {
      profileName: 'callemall',
      repositoryName: 'material-ui',
    }
  })

  beforeEach(() => {
    fetch = {
      state: 'SUCCESS',
      output: {
        data: {
          repository: {
            authorization: false,
            token: null,
          },
        },
      },
    }
  })

  it('should render an error message', () => {
    const wrapper = shallow(<Settings params={params} />).until('Settings')
    expect(wrapper.debug()).toContain('enough access right')
  })
})
