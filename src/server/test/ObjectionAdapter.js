// Wait for https://github.com/aexmachina/factory-girl/pull/105

/* eslint-disable class-methods-use-this */
export default class ObjectionAdapter {
  build(Model, props) {
    return Object.assign(new Model(), props)
  }

  async save(model, Model) {
    return Model.query().insert(model)
  }

  async destroy(model, Model) {
    return Model.query().deleteById(model.id)
  }

  get(model, attr) {
    return model[attr]
  }

  set(props, model) {
    return Object.assign(model, props)
  }
}
