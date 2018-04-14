import React from 'react'
import { shallow } from 'enzyme'
import { SUCCESS } from 'modules/rxjs/operator/watchTask'
import WatchTask from './WatchTask'

describe('WatchTask', () => {
  it('should return an error when the graphql query is invalid', () => {
    const task = {
      state: SUCCESS,
      output: {
        errors: [
          {
            message: '',
            location: {},
            stack: '',
          },
        ],
      },
    }
    const wrapper = shallow(<WatchTask task={task}>{() => null}</WatchTask>)

    expect(wrapper.contains('The loading failed')).toBe(true)
  })
})
