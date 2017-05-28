/* eslint-disable max-len */
import { Component } from '@angular/core'

class Button {}
Button.annotations = [
  new Component({
    selector: 'my-button',
    template: `
      <button
        type="button"
        style="background: linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%); border-radius: 3px; border: 0; color: white; height: 48px; font-size: 14px; padding: 0 30px; box-shadow: 0 3px 5px 2px rgba(255, 105, 135, .30)"
      >
        Angular
      </button>
    `,
  }),
]

export default Button
