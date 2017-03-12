function shallowRecursively(wrapper, selector, { context }) {
  if (wrapper.isEmptyRender() || typeof wrapper.node.type === 'string') {
    return wrapper
  }

  const instance = wrapper.root.instance()
  if (instance.getChildContext) {
    context = {
      ...context,
      ...instance.getChildContext(),
    }
  }

  const nextWrapper = wrapper.shallow({ context })

  if (selector && wrapper.is(selector)) {
    return nextWrapper
  }

  return shallowRecursively(nextWrapper, selector, { context })
}

export default function until(selector, { context } = this.options) {
  return this.single('until', () => shallowRecursively(this, selector, { context }))
}
