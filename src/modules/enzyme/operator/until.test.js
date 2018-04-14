/* eslint-disable react/no-multi-comp */

import React from 'react'
import PropTypes from 'prop-types'
import { shallow } from 'enzyme'
import { assert } from 'chai'
import until from './until'

describe('modules/enzyme/until', () => {
  const Div = () => <div />
  const hoc = Component => () => <Component />

  it('shallow renders the current wrapper one level deep', () => {
    const EnhancedDiv = hoc(Div)
    const wrapper = until.call(shallow(<EnhancedDiv />), 'Div')
    expect(wrapper.contains(<div />)).toBe(true)
  })

  it('shallow renders the current wrapper several levels deep', () => {
    const EnhancedDiv = hoc(hoc(hoc(Div)))
    const wrapper = until.call(shallow(<EnhancedDiv />), 'Div')
    expect(wrapper.contains(<div />)).toBe(true)
  })

  it('stops shallow rendering when the wrapper is empty', () => {
    const nullHoc = () => () => null
    const EnhancedDiv = nullHoc(Div)
    const wrapper = until.call(shallow(<EnhancedDiv />), 'Div')
    expect(wrapper.html()).toBe(null)
  })

  it('shallow renders as much as possible when no selector is provided', () => {
    const EnhancedDiv = hoc(hoc(Div))
    const wrapper = until.call(shallow(<EnhancedDiv />))
    expect(wrapper.contains(<div />)).toBe(true)
  })

  it('shallow renders the current wrapper even if the selector never matches', () => {
    const EnhancedDiv = hoc(Div)
    const wrapper = until.call(shallow(<EnhancedDiv />), 'NotDiv')
    expect(wrapper.contains(<div />)).toBe(true)
  })

  it('stops shallow rendering when it encounters a DOM element', () => {
    const wrapper = until.call(
      shallow(
        <div>
          <Div />
        </div>
      ),
      'Div'
    )
    expect(
      wrapper.contains(
        <div>
          <Div />
        </div>
      )
    ).toBe(true)
  })

  it('throws when it is called on an empty wrapper', () => {
    assert.throws(
      () => {
        until.call(shallow(<Div />).find('Foo'), 'div')
      },
      Error,
      'Method “until” is only meant to be run on a single node. 0 found instead.'
    )
  })

  it('shallow renders non-root wrappers', () => {
    const Container = () => (
      <div>
        <Div />
      </div>
    )
    const wrapper = until.call(shallow(<Container />).find(Div))
    expect(wrapper.contains(<div />)).toBe(true)
  })

  describe('context propagation', () => {
    const Foo = () => <Div />
    Foo.contextTypes = { quux: PropTypes.bool.isRequired }

    class Bar extends React.Component {
      static childContextTypes = { quux: PropTypes.bool }
      getChildContext = () => ({ quux: true })
      render = () => <Foo />
    }

    it('passes down context from the root component', () => {
      const EnhancedFoo = hoc(Foo)
      const wrapper = until.call(shallow(<EnhancedFoo />, { context: { quux: true } }), 'Foo')
      expect(wrapper.context('quux')).toBe(true)
      expect(wrapper.contains(<Div />)).toBe(true)
    })

    it('passes down context from an intermediary component', () => {
      const EnhancedBar = hoc(Bar)
      const wrapper = until.call(shallow(<EnhancedBar />), 'Foo')
      expect(wrapper.context('quux')).toBe(true)
      expect(wrapper.contains(<Div />)).toBe(true)
    })
  })
})
