function dataReducer(state, action) {
  if (state === undefined) {
    state = window.clientData
  }

  switch (action.type) {
    default:
      return state
  }
}

export default dataReducer
